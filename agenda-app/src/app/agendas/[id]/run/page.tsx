import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { startRunAction } from '@/actions/run-actions'
import { MeetingDisplay } from '@/components/meeting-display'
import { formatElapsed } from '@/lib/timer-color'
import { buttonVariants, Button } from '@/components/ui/button'
import { ChevronLeft, Play, Smartphone } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function RunPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const agenda = await prisma.agenda.findUnique({
    where: { id },
    include: {
      items: { orderBy: { position: 'asc' } },
    },
  })
  if (!agenda) notFound()

  const openRun = await prisma.meetingRun.findFirst({
    where: { agendaId: id, endedAt: null },
    include: { segments: { orderBy: { position: 'desc' }, take: 1 } },
  })
  const openSegment = openRun?.segments[0]

  if (openRun && openSegment) {
    return (
      <MeetingDisplay
        agendaId={agenda.id}
        agendaTitle={agenda.title}
        runId={openRun.id}
        items={agenda.items}
        initialState={{
          endedAt: null,
          segment: {
            itemId: openSegment.itemId,
            kind: openSegment.kind,
            subIndex: openSegment.subIndex,
            label: openSegment.label,
            minMinutes: openSegment.minMinutes,
            expectedMinutes: openSegment.expectedMinutes,
            maxMinutes: openSegment.maxMinutes,
            startedAt: openSegment.startedAt.toISOString(),
          },
        }}
      />
    )
  }

  const pastRuns = await prisma.meetingRun.findMany({
    where: { agendaId: id, endedAt: { not: null } },
    orderBy: { startedAt: 'desc' },
  })

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <div className="flex w-full items-center justify-between">
        <Link
          href={`/agendas/${agenda.id}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {agenda.title}
        </Link>
        <Link
          href={`/agendas/${agenda.id}/control`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <Smartphone className="h-4 w-4" />
          Control page
        </Link>
      </div>

      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">{agenda.title}</h1>
        <p className="mt-1 text-muted-foreground">
          {agenda.items.length} {agenda.items.length === 1 ? 'item' : 'items'}
        </p>
      </div>

      {agenda.items.length === 0 ? (
        <p className="text-muted-foreground">
          Add agenda items before running the meeting.
        </p>
      ) : (
        <form action={startRunAction.bind(null, agenda.id)}>
          <Button size="lg" type="submit">
            <Play className="h-5 w-5" />
            Start
          </Button>
        </form>
      )}

      {pastRuns.length > 0 && (
        <div className="w-full max-w-md">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">
            Past runs
          </h2>
          <ul className="space-y-2">
            {pastRuns.map(run => (
              <li key={run.id}>
                <Link
                  href={`/agendas/${agenda.id}/runs/${run.id}`}
                  className={buttonVariants({
                    variant: 'outline',
                    className: 'w-full justify-between',
                  })}
                >
                  <span>
                    {new Intl.DateTimeFormat('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                      timeZone: agenda.timezone ?? 'UTC',
                    }).format(run.startedAt)}
                  </span>
                  <span className="text-muted-foreground">
                    {run.endedAt &&
                      formatElapsed(
                        (run.endedAt.getTime() - run.startedAt.getTime()) / 1000,
                      )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

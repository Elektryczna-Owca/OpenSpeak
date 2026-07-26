import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { startRunAction } from '@/actions/run-actions'
import { MeetingControl } from '@/components/meeting-control'
import { RunStartWatcher } from '@/components/run-start-watcher'
import { Button } from '@/components/ui/button'
import { ChevronLeft, MonitorPlay, Play } from 'lucide-react'

export const dynamic = 'force-dynamic'

// Phone-sized control page: start the meeting and drive Next / End from here
// while the /run display follows along.
export default async function ControlPage({
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
      <MeetingControl
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
            pausedAt: openSegment.pausedAt?.toISOString() ?? null,
            pausedSeconds: openSegment.pausedSeconds,
          },
        }}
      />
    )
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-6 py-6">
      <RunStartWatcher agendaId={agenda.id} />
      <div className="flex w-full items-center justify-between">
        <Link
          href={`/agendas/${agenda.id}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {agenda.title}
        </Link>
        <Link
          href={`/agendas/${agenda.id}/run`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <MonitorPlay className="h-4 w-4" />
          Display
        </Link>
      </div>

      <div className="text-center">
        <h1 className="text-xl font-semibold tracking-tight">{agenda.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {agenda.items.length} {agenda.items.length === 1 ? 'item' : 'items'}
        </p>
      </div>

      {agenda.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add agenda items before running the meeting.
        </p>
      ) : (
        <form action={startRunAction.bind(null, agenda.id)} className="w-full">
          <Button size="lg" type="submit" className="h-14 w-full text-lg">
            <Play className="h-5 w-5" />
            Start meeting
          </Button>
        </form>
      )}
    </div>
  )
}

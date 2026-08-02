import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { DeleteRunButton } from '@/components/delete-run-button'
import { MeetingDisplay } from '@/components/meeting-display'
import { RunStartWatcher } from '@/components/run-start-watcher'
import { formatElapsed } from '@/lib/timer-color'
import { buttonVariants } from '@/components/ui/button'
import { ChevronLeft, CornerDownRight, Smartphone } from 'lucide-react'

export const dynamic = 'force-dynamic'

// Minutes from meeting start to each item's planned start (running sum of
// expected durations).
function cumulativeStartMinutes(items: { durationMinutes: number }[]): number[] {
  let acc = 0
  return items.map(item => {
    const start = acc
    acc += item.durationMinutes
    return start
  })
}

// Offset from meeting start when the agenda has no scheduled start time.
function offsetLabel(minutes: number): string {
  const total = Math.round(minutes)
  const h = Math.floor(total / 60)
  const m = total % 60
  return `+${h}:${String(m).padStart(2, '0')}`
}

export default async function RunPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const agenda = await prisma.agenda.findUnique({
    where: { id },
    include: {
      items: { orderBy: { position: 'asc' }, include: { person: true } },
    },
  })
  if (!agenda) notFound()

  const openRun = await prisma.meetingRun.findFirst({
    where: { agendaId: id, endedAt: null },
    include: {
      segments: {
        orderBy: { position: 'desc' },
        take: 1,
        include: { person: { select: { name: true } } },
      },
    },
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
            personId: openSegment.personId,
            personName: openSegment.person?.name ?? null,
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

  const pastRuns = await prisma.meetingRun.findMany({
    where: { agendaId: id, endedAt: { not: null } },
    orderBy: { startedAt: 'desc' },
  })

  // Planned start time per item: the agenda's scheduled start (or +0:00)
  // plus the expected durations of everything before it. Sub-item loops are
  // open-ended (the controller decides how many participants speak), so only
  // each item's own expected time counts here.
  const timeZone = agenda.timezone ?? 'UTC'
  const timeFmt = agenda.startAt
    ? new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null
  const startLabelAt = (minutes: number) =>
    timeFmt && agenda.startAt
      ? timeFmt.format(
          new Date(agenda.startAt.getTime() + Math.round(minutes) * 60_000),
        )
      : offsetLabel(minutes)

  const startMinutes = cumulativeStartMinutes(agenda.items)
  const rows = agenda.items.map((item, i) => ({
    item,
    startLabel: startLabelAt(startMinutes[i]),
  }))
  const totalMin = agenda.items.reduce((sum, i) => sum + i.durationMinutes, 0)

  return (
    <div className="flex flex-col items-center gap-8 py-8">
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
          href={`/agendas/${agenda.id}/control`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <Smartphone className="h-4 w-4" />
          Control page
        </Link>
      </div>

      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">{agenda.title}</h1>
        {agenda.description && (
          <p className="mx-auto mt-2 max-w-prose whitespace-pre-line text-muted-foreground">
            {agenda.description}
          </p>
        )}
        <p className="mt-1 text-muted-foreground">
          {agenda.items.length} {agenda.items.length === 1 ? 'item' : 'items'} ·{' '}
          {totalMin} min
        </p>
      </div>

      {agenda.items.length === 0 ? (
        <p className="text-muted-foreground">
          Add agenda items before running the meeting.
        </p>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-2 font-medium">Start</th>
                <th className="px-4 py-2 font-medium">Item</th>
                <th className="px-4 py-2 text-right font-medium">Expected</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ item, startLabel }) => (
                <tr key={item.id} className="even:bg-card/70">
                  <td className="px-4 py-2 font-mono whitespace-nowrap tabular-nums">
                    {startLabel}
                  </td>
                  <td className="w-full px-4 py-2">
                    {item.title}
                    {item.person && (
                      <span className="text-muted-foreground">
                        {' '}
                        — {item.person.name}
                      </span>
                    )}
                    {item.subExpectedMinutes != null && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground/80">
                        <CornerDownRight className="h-3 w-3 shrink-0" />
                        {item.subLabel || 'Sub-item'}: {item.subExpectedMinutes}{' '}
                        min each
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap text-muted-foreground">
                    {item.durationMinutes} min
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t text-muted-foreground">
                <td className="px-4 py-2 font-mono whitespace-nowrap tabular-nums">
                  {startLabelAt(totalMin)}
                </td>
                <td className="px-4 py-2" colSpan={2}>
                  Estimated end
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {pastRuns.length > 0 && (
        <div className="w-full max-w-md">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">
            Past runs
          </h2>
          <ul className="space-y-2">
            {pastRuns.map(run => {
              const startedLabel = new Intl.DateTimeFormat('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone,
              }).format(run.startedAt)
              return (
                <li key={run.id} className="flex items-center gap-1">
                  <Link
                    href={`/agendas/${agenda.id}/runs/${run.id}`}
                    className={buttonVariants({
                      variant: 'outline',
                      className: 'min-w-0 flex-1 justify-between',
                    })}
                  >
                    <span>{startedLabel}</span>
                    <span className="text-muted-foreground">
                      {run.endedAt &&
                        formatElapsed(
                          (run.endedAt.getTime() - run.startedAt.getTime()) /
                            1000,
                        )}
                    </span>
                  </Link>
                  <DeleteRunButton id={run.id} label={startedLabel} />
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

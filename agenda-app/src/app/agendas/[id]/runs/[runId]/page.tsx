import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { formatElapsed, segmentRowClass } from '@/lib/timer-color'
import { buttonVariants } from '@/components/ui/button'
import {
  ChevronLeft,
  Clock,
  CornerDownRight,
  Play,
  Smartphone,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function RunReviewPage({
  params,
}: {
  params: Promise<{ id: string; runId: string }>
}) {
  const { id, runId } = await params
  const run = await prisma.meetingRun.findUnique({
    where: { id: runId },
    include: {
      agenda: { select: { id: true, title: true, timezone: true } },
      segments: {
        orderBy: { position: 'asc' },
        include: { person: { select: { name: true } } },
      },
    },
  })
  if (!run || run.agendaId !== id) notFound()

  const startedLabel = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: run.agenda.timezone ?? 'UTC',
  }).format(run.startedAt)

  // For a still-running meeting this page is a "report so far": totals and
  // the open segment are measured up to now (frozen at pausedAt while paused).
  const now = new Date()
  const totalSeconds =
    ((run.endedAt ?? now).getTime() - run.startedAt.getTime()) / 1000

  // Total idle time between segments: from each segment's end until the next
  // one starts (or until the meeting ends / now for the last one). Since
  // every item and sub-item is started explicitly, these gaps are real
  // meeting time.
  const betweenSeconds = run.segments.reduce((sum, segment, i) => {
    if (!segment.endedAt) return sum
    const gapEnd = run.segments[i + 1]?.startedAt ?? run.endedAt ?? now
    return sum + Math.max(0, (gapEnd.getTime() - segment.endedAt.getTime()) / 1000)
  }, 0)

  // Group consecutive segments that belong to the same agenda item (its
  // 'item' segment followed by 'sub' rounds) so items with sub-item loops
  // can show one total spanning start-of-item to end-of-last-sub.
  type Segment = (typeof run.segments)[number]
  const itemGroups: Segment[][] = []
  for (const segment of run.segments) {
    const currentGroup = itemGroups[itemGroups.length - 1]
    if (segment.kind === 'item' || !currentGroup || currentGroup[0].itemId !== segment.itemId) {
      itemGroups.push([segment])
    } else {
      currentGroup.push(segment)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/agendas/${run.agenda.id}`}
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
        >
          <ChevronLeft className="h-4 w-4" />
          {run.agenda.title}
        </Link>
        {run.endedAt ? (
          <Link
            href={`/agendas/${run.agenda.id}/run`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <Play className="h-4 w-4" />
            Run again
          </Link>
        ) : (
          <Link
            href={`/agendas/${run.agenda.id}/control`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <Smartphone className="h-4 w-4" />
            Back to control
          </Link>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meeting review</h1>
        <p className="text-muted-foreground">{startedLabel}</p>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          {formatElapsed(totalSeconds)}
          {run.endedAt ? ' total' : ' so far — still in progress'}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="p-3 font-medium">Item</th>
              <th className="p-3 font-medium">Actual</th>
            </tr>
          </thead>
          <tbody>
            {itemGroups.map(group => {
              const last = group[group.length - 1]
              // Items with sub-item loops show the item's own row as the
              // combined span from its start to the end of its last
              // sub-item, including any pauses taken along the way.
              const groupSeconds =
                group.length > 1
                  ? ((last.endedAt ?? last.pausedAt ?? now).getTime() -
                      group[0].startedAt.getTime()) /
                    1000
                  : null
              const rows = group.map((segment, index) => {
                // Paused time doesn't count toward a single segment's actual
                // duration. An open segment is measured up to now so the
                // in-progress report shows its elapsed time so far.
                const actualSeconds =
                  index === 0 && groupSeconds != null
                    ? groupSeconds
                    : ((segment.endedAt ?? segment.pausedAt ?? now).getTime() -
                        segment.startedAt.getTime()) /
                        1000 -
                      segment.pausedSeconds
                const rowClass =
                  !segment.skipped && segment.endedAt
                    ? segmentRowClass(actualSeconds, segment.minMinutes, segment.maxMinutes)
                    : ''
                return (
                  <tr
                    key={segment.id}
                    className={`border-b last:border-b-0 ${rowClass}`}
                  >
                    <td className="p-3">
                      <span className="flex items-center gap-1">
                        {segment.kind === 'sub' && (
                          <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                        {segment.label}
                        {segment.person && (
                          <span className="text-muted-foreground">
                            — {segment.person.name}
                          </span>
                        )}
                        {segment.skipped && (
                          <span className="text-muted-foreground italic">
                            (skipped)
                          </span>
                        )}
                      </span>
                      {segment.comment && (
                        <p
                          className={`mt-1 max-w-prose text-xs whitespace-pre-wrap text-muted-foreground ${
                            segment.kind === 'sub' ? 'pl-[18px]' : ''
                          }`}
                        >
                          {segment.comment}
                        </p>
                      )}
                    </td>
                    <td className="p-3 font-mono tabular-nums">
                      {segment.endedAt ? (
                        formatElapsed(actualSeconds)
                      ) : (
                        <span className="text-muted-foreground">running</span>
                      )}
                    </td>
                  </tr>
                )
              })

              return rows
            })}
            {betweenSeconds >= 1 && (
              <tr className="border-b text-muted-foreground">
                <td className="p-3 italic">Sum of in between times</td>
                <td className="p-3 font-mono tabular-nums">
                  {formatElapsed(betweenSeconds)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

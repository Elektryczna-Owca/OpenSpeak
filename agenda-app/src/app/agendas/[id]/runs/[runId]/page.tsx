import { Fragment } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { formatElapsed, segmentStatus } from '@/lib/timer-color'
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

  // Idle time after each segment: from its end until the next segment starts
  // (or until the meeting ends / now for the last one). Since every item and
  // sub-item is started explicitly, these gaps are real meeting time.
  const gapsAfter = run.segments.map((segment, i) => {
    if (!segment.endedAt) return 0
    const gapEnd = run.segments[i + 1]?.startedAt ?? run.endedAt ?? now
    return Math.max(0, (gapEnd.getTime() - segment.endedAt.getTime()) / 1000)
  })
  const betweenSeconds = gapsAfter.reduce((sum, gap) => sum + gap, 0)

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
          {betweenSeconds >= 1 && (
            <> · {formatElapsed(betweenSeconds)} in between</>
          )}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="p-3 font-medium">Item</th>
              <th className="p-3 font-medium">Actual</th>
              <th className="p-3 font-medium">Expected</th>
              <th className="p-3 font-medium">Min–Max</th>
              <th className="p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {run.segments.map((segment, i) => {
              // Paused time doesn't count toward the item's actual duration.
              // An open segment is measured up to now so the in-progress
              // report shows its elapsed time so far.
              const actualSeconds =
                ((segment.endedAt ?? segment.pausedAt ?? now).getTime() -
                  segment.startedAt.getTime()) /
                  1000 -
                segment.pausedSeconds
              const status = segment.skipped
                ? { label: 'skipped', className: 'text-muted-foreground italic' }
                : segment.endedAt
                  ? segmentStatus(
                      actualSeconds,
                      segment.minMinutes,
                      segment.expectedMinutes,
                      segment.maxMinutes,
                    )
                  : null
              return (
                <Fragment key={segment.id}>
                <tr className="border-b last:border-b-0">
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
                    </span>
                  </td>
                  <td className="p-3 font-mono tabular-nums">
                    {formatElapsed(actualSeconds)}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {segment.expectedMinutes != null
                      ? `${segment.expectedMinutes} min`
                      : '—'}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {segment.minMinutes != null || segment.maxMinutes != null
                      ? `${segment.minMinutes ?? '—'}–${segment.maxMinutes ?? '—'}`
                      : '—'}
                  </td>
                  <td className="p-3">
                    {status ? (
                      <span className={status.className}>{status.label}</span>
                    ) : (
                      <span className="text-muted-foreground">running</span>
                    )}
                  </td>
                </tr>
                {gapsAfter[i] >= 1 && (
                  <tr className="border-b text-muted-foreground last:border-b-0">
                    <td className="p-3 pl-6 text-sm italic">In between</td>
                    <td className="p-3 font-mono text-sm tabular-nums">
                      {formatElapsed(gapsAfter[i])}
                    </td>
                    <td className="p-3">—</td>
                    <td className="p-3">—</td>
                    <td className="p-3"></td>
                  </tr>
                )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

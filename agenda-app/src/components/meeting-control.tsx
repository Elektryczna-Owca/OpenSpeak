'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { advanceRunAction, type NextSegment } from '@/actions/run-actions'
import { formatElapsed, timerColorClass } from '@/lib/timer-color'
import { type RunState, computeRunTargets } from '@/lib/run-state'
import { useElapsedSeconds, useRunState } from '@/components/use-run-state'
import { Thresholds } from '@/components/meeting-display'
import { Button } from '@/components/ui/button'
import { ChevronLeft, MonitorPlay } from 'lucide-react'
import type { AgendaItem } from '@/generated/prisma/client'

// Phone-sized remote control for a running meeting: big touch targets, the
// same color-coded timer, and the Next / End buttons. The display page (and
// any other open control) follows along via polling.
export function MeetingControl({
  agendaId,
  agendaTitle,
  runId,
  items,
  initialState,
}: {
  agendaId: string
  agendaTitle: string
  runId: string
  items: AgendaItem[]
  initialState: RunState
}) {
  const [pending, startTransition] = useTransition()
  const { state, refetch } = useRunState(runId, initialState)
  const segment = state.segment
  const elapsed = useElapsedSeconds(segment?.startedAt ?? null)

  if (!segment || state.endedAt) return null

  const { currentItem, nextItem, inSubLoop, subLabel, nextTarget, nextLabel, endTarget } =
    computeRunTargets(items, segment)

  function advance(target: NextSegment | null) {
    startTransition(async () => {
      await advanceRunAction(runId, target)
      await refetch()
    })
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-6 py-6">
      <div className="flex w-full items-center justify-between">
        <Link
          href={`/agendas/${agendaId}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {agendaTitle}
        </Link>
        <Link
          href={`/agendas/${agendaId}/run`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <MonitorPlay className="h-4 w-4" />
          Display
        </Link>
      </div>

      <div className="text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          {currentItem?.title ?? segment.label}
        </h1>
        {inSubLoop && (
          <p className="mt-1 text-lg text-muted-foreground">
            {subLabel} {segment.subIndex}
          </p>
        )}
      </div>

      <div className="text-center">
        <div
          className={`font-mono text-6xl font-semibold tabular-nums transition-colors ${timerColorClass(
            elapsed,
            segment.minMinutes,
            segment.expectedMinutes,
            segment.maxMinutes,
          )}`}
        >
          {formatElapsed(elapsed)}
        </div>
        <Thresholds segment={segment} />
      </div>

      <div className="flex w-full flex-col gap-3">
        <Button
          size="lg"
          className="h-14 w-full text-lg"
          onClick={() => advance(nextTarget)}
          disabled={pending}
        >
          {nextLabel}
        </Button>
        {inSubLoop && (
          <Button
            size="lg"
            variant="outline"
            className="h-12 w-full"
            onClick={() => advance(endTarget)}
            disabled={pending}
          >
            {endTarget ? 'End' : 'End & finish'}
          </Button>
        )}
      </div>

      {nextItem && (
        <p className="text-sm text-muted-foreground">
          Up next: <span className="text-foreground">{nextItem.title}</span>
        </p>
      )}
    </div>
  )
}

'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatElapsed, timerColorClass } from '@/lib/timer-color'
import { type RunState, computeRunTargets } from '@/lib/run-state'
import { useElapsedSeconds, useRunState } from '@/components/use-run-state'
import { ChevronLeft, CornerDownRight, Smartphone } from 'lucide-react'
import type { AgendaItem } from '@/generated/prisma/client'

// Read-only live view of the running meeting (e.g. on a projector). Advances
// are made from the control page — this view polls and follows along.
export function MeetingDisplay({
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
  const router = useRouter()
  const { state } = useRunState(runId, initialState)
  const segment = state.segment
  const elapsed = useElapsedSeconds(segment)
  const paused = segment?.pausedAt != null

  // When the controller finishes the meeting, follow to the review page.
  useEffect(() => {
    if (state.endedAt) {
      router.push(`/agendas/${agendaId}/runs/${runId}`)
    }
  }, [state.endedAt, router, agendaId, runId])

  if (!segment) return null

  const { currentIndex, currentItem, inSubLoop, subLabel } = computeRunTargets(
    items,
    segment,
  )

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <div className="flex w-full items-center justify-between">
        <Link
          href={`/agendas/${agendaId}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {agendaTitle}
        </Link>
        <Link
          href={`/agendas/${agendaId}/control`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <Smartphone className="h-4 w-4" />
          Control page
        </Link>
      </div>

      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          {currentItem?.title ?? segment.label}
        </h1>
        {inSubLoop && (
          <p className="mt-1 text-xl text-muted-foreground">
            {subLabel} {segment.subIndex}
          </p>
        )}
      </div>

      <div className="text-center">
        <div
          className={`font-mono text-8xl font-semibold tabular-nums transition-colors ${
            paused
              ? 'text-muted-foreground'
              : timerColorClass(
                  elapsed,
                  segment.minMinutes,
                  segment.expectedMinutes,
                  segment.maxMinutes,
                )
          }`}
        >
          {formatElapsed(elapsed)}
        </div>
        {paused && (
          <p className="mt-1 text-lg font-medium tracking-wide text-muted-foreground uppercase">
            Paused
          </p>
        )}
        <Thresholds segment={segment} />
      </div>

      {currentIndex >= 0 && (
        <ol className="w-full max-w-md space-y-2">
          {items.slice(currentIndex).map((item, i) => (
            <li
              key={item.id}
              className={
                i === 0
                  ? 'rounded-lg border-2 border-primary bg-card px-4 py-2 font-medium'
                  : 'rounded-lg border px-4 py-2 text-muted-foreground'
              }
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate">{item.title}</span>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {item.durationMinutes} min
                </span>
              </span>
              {item.subExpectedMinutes != null && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground/80">
                  <CornerDownRight className="h-3 w-3 shrink-0" />
                  {item.subLabel || 'Sub-item'}: {item.subExpectedMinutes} min each
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export function Thresholds({
  segment,
}: {
  segment: {
    minMinutes: number | null
    expectedMinutes: number | null
    maxMinutes: number | null
  }
}) {
  const parts = [
    segment.minMinutes != null ? `min ${segment.minMinutes}` : null,
    segment.expectedMinutes != null ? `expected ${segment.expectedMinutes}` : null,
    segment.maxMinutes != null ? `max ${segment.maxMinutes}` : null,
  ].filter(Boolean)
  if (parts.length === 0) return null
  return (
    <p className="mt-2 text-sm text-muted-foreground">{parts.join(' · ')} min</p>
  )
}

'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { advanceRunAction, type NextSegment } from '@/actions/run-actions'
import { formatElapsed, timerColorClass } from '@/lib/timer-color'
import { Button } from '@/components/ui/button'
import { ChevronLeft, CornerDownRight } from 'lucide-react'
import type { AgendaItem } from '@/generated/prisma/client'

type OpenSegment = {
  itemId: string | null
  kind: string
  subIndex: number | null
  label: string
  minMinutes: number | null
  expectedMinutes: number | null
  maxMinutes: number | null
  startedAt: Date
}

export function MeetingRunner({
  agendaId,
  agendaTitle,
  runId,
  items,
  segment,
}: {
  agendaId: string
  agendaTitle: string
  runId: string
  items: AgendaItem[]
  segment: OpenSegment
}) {
  const [pending, startTransition] = useTransition()
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const startMs = segment.startedAt.getTime()
    const tick = () => setElapsed((Date.now() - startMs) / 1000)
    tick()
    const interval = setInterval(tick, 500)
    return () => clearInterval(interval)
  }, [segment.startedAt])

  const currentIndex = items.findIndex(i => i.id === segment.itemId)
  const currentItem = currentIndex >= 0 ? items[currentIndex] : null
  const nextItem = currentIndex >= 0 ? (items[currentIndex + 1] ?? null) : null
  const inSubLoop = segment.kind === 'sub'
  const subLabel = currentItem?.subLabel ?? 'Sub-item'

  // What the primary button does from here. Never advances automatically.
  let nextTarget: NextSegment | null
  let nextLabel: string
  if (inSubLoop && currentItem) {
    nextTarget = {
      itemId: currentItem.id,
      kind: 'sub',
      subIndex: (segment.subIndex ?? 1) + 1,
    }
    nextLabel = `Next ${subLabel.toLowerCase()}`
  } else if (currentItem && currentItem.subExpectedMinutes != null) {
    nextTarget = { itemId: currentItem.id, kind: 'sub', subIndex: 1 }
    nextLabel = `Start ${subLabel.toLowerCase()} 1`
  } else if (nextItem) {
    nextTarget = { itemId: nextItem.id, kind: 'item' }
    nextLabel = 'Next item'
  } else {
    nextTarget = null
    nextLabel = 'Finish meeting'
  }

  // "End" exits the sub-item loop: on to the next item, or finish.
  const endTarget: NextSegment | null = nextItem
    ? { itemId: nextItem.id, kind: 'item' }
    : null

  function advance(target: NextSegment | null) {
    startTransition(() => {
      advanceRunAction(runId, target)
    })
  }

  const thresholds = [
    segment.minMinutes != null ? `min ${segment.minMinutes}` : null,
    segment.expectedMinutes != null ? `expected ${segment.expectedMinutes}` : null,
    segment.maxMinutes != null ? `max ${segment.maxMinutes}` : null,
  ].filter(Boolean)

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <Link
        href={`/agendas/${agendaId}`}
        className="flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {agendaTitle}
      </Link>

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
          className={`font-mono text-8xl font-semibold tabular-nums transition-colors ${timerColorClass(
            elapsed,
            segment.minMinutes,
            segment.expectedMinutes,
            segment.maxMinutes,
          )}`}
        >
          {formatElapsed(elapsed)}
        </div>
        {thresholds.length > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            {thresholds.join(' · ')} min
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button size="lg" onClick={() => advance(nextTarget)} disabled={pending}>
          {nextLabel}
        </Button>
        {inSubLoop && (
          <Button
            size="lg"
            variant="outline"
            onClick={() => advance(endTarget)}
            disabled={pending}
          >
            {endTarget ? 'End' : 'End & finish'}
          </Button>
        )}
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

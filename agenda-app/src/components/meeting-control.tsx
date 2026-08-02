'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  advanceRunAction,
  assignSegmentPersonAction,
  finishItemAction,
  finishSegmentAction,
  togglePauseAction,
  type NextSegment,
} from '@/actions/run-actions'
import { formatElapsed, timerColorClass } from '@/lib/timer-color'
import { type RunState, computeRunTargets } from '@/lib/run-state'
import { useElapsedSeconds, useRunState } from '@/components/use-run-state'
import { Thresholds } from '@/components/meeting-display'
import { Button } from '@/components/ui/button'
import {
  ChevronLeft,
  FileText,
  MonitorPlay,
  Pause,
  Play,
  SkipForward,
  Square,
} from 'lucide-react'
import type { AgendaItem, Person } from '@/generated/prisma/client'

// Lightweight confirm: the first tap arms the button for 3 seconds, the
// second tap runs the action.
function useTapConfirm() {
  const [arming, setArming] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )
  function tap(action: () => void) {
    if (!arming) {
      setArming(true)
      timer.current = setTimeout(() => setArming(false), 3000)
      return
    }
    if (timer.current) clearTimeout(timer.current)
    setArming(false)
    action()
  }
  return { arming, tap }
}

const personSelectClass =
  'h-10 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30'

// Phone-sized remote control for a running meeting: big touch targets, the
// same color-coded timer, and the Next / End buttons. The display page (and
// any other open control) follows along via polling.
export function MeetingControl({
  agendaId,
  agendaTitle,
  runId,
  items,
  people,
  initialState,
}: {
  agendaId: string
  agendaTitle: string
  runId: string
  items: AgendaItem[]
  people: Person[]
  initialState: RunState
}) {
  const [pending, startTransition] = useTransition()
  const { state, refetch } = useRunState(runId, initialState)
  const segment = state.segment
  const elapsed = useElapsedSeconds(segment)
  const paused = segment?.pausedAt != null
  const skipConfirm = useTapConfirm()
  const endConfirm = useTapConfirm()

  if (!segment || state.endedAt) return null

  const { currentItem, nextItem, inSubLoop, subLabel } = computeRunTargets(
    items,
    segment,
  )

  // The segment is closed but the run isn't: the previous segment is finished
  // and whatever comes next waits for an explicit start.
  const between = segment.endedAt != null
  const finishedSeconds = segment.endedAt
    ? (Date.parse(segment.endedAt) - Date.parse(segment.startedAt)) / 1000 -
      segment.pausedSeconds
    : 0
  // Between segments of an item with a sub-item loop, the primary next step
  // stays within the item (sub 1 after the item's own slot, then sub n+1) —
  // until the whole item is declared finished via finishItemAction.
  const nextSubTarget: NextSegment | null =
    between &&
    !segment.itemDone &&
    currentItem &&
    currentItem.subExpectedMinutes != null
      ? {
          itemId: currentItem.id,
          kind: 'sub',
          subIndex: inSubLoop ? (segment.subIndex ?? 1) + 1 : 1,
        }
      : null

  function advance(target: NextSegment | null) {
    startTransition(async () => {
      await advanceRunAction(runId, target)
      await refetch()
    })
  }

  function finish(skipped: boolean) {
    startTransition(async () => {
      await finishSegmentAction(runId, skipped)
      await refetch()
    })
  }

  function finishItem() {
    startTransition(async () => {
      await finishItemAction(runId)
      await refetch()
    })
  }

  function togglePause() {
    startTransition(async () => {
      await togglePauseAction(runId)
      await refetch()
    })
  }

  function assignPerson(personId: string | null) {
    startTransition(async () => {
      await assignSegmentPersonAction(runId, personId)
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
        <div className="flex items-center gap-4">
          <Link
            href={`/agendas/${agendaId}/runs/${runId}`}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <FileText className="h-4 w-4" />
            Report
          </Link>
          <Link
            href={`/agendas/${agendaId}/run`}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <MonitorPlay className="h-4 w-4" />
            Display
          </Link>
        </div>
      </div>

      {between && (
        <>
          <div className="text-center">
            <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
              Up next
            </p>
            {nextSubTarget && currentItem ? (
              <>
                <h1 className="mt-1 text-xl font-semibold tracking-tight">
                  {currentItem.title}
                </h1>
                <p className="mt-1 text-lg text-muted-foreground">
                  {subLabel} {nextSubTarget.subIndex}
                </p>
                <Thresholds
                  segment={{
                    minMinutes: currentItem.subMinMinutes,
                    expectedMinutes: currentItem.subExpectedMinutes,
                    maxMinutes: currentItem.subMaxMinutes,
                  }}
                />
              </>
            ) : (
              <>
                <h1 className="mt-1 text-xl font-semibold tracking-tight">
                  {nextItem?.title ?? 'All items finished'}
                </h1>
                {nextItem && (
                  <Thresholds
                    segment={{
                      minMinutes: nextItem.minMinutes,
                      expectedMinutes: nextItem.durationMinutes,
                      maxMinutes: nextItem.maxMinutes,
                    }}
                  />
                )}
              </>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {segment.skipped ? 'Skipped' : 'Finished'}: {segment.label} —{' '}
            <span className="font-mono tabular-nums">
              {formatElapsed(finishedSeconds)}
            </span>
          </p>
          <div className="flex w-full flex-col gap-3">
            {nextSubTarget ? (
              <>
                <Button
                  size="lg"
                  className="h-14 w-full text-lg"
                  onClick={() => advance(nextSubTarget)}
                  disabled={pending}
                >
                  <Play className="h-5 w-5" />
                  Start {subLabel.toLowerCase()} {nextSubTarget.subIndex}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 w-full"
                  onClick={finishItem}
                  disabled={pending}
                >
                  Finish agenda item
                </Button>
              </>
            ) : (
              <Button
                size="lg"
                className="h-14 w-full text-lg"
                onClick={() =>
                  advance(nextItem ? { itemId: nextItem.id, kind: 'item' } : null)
                }
                disabled={pending}
              >
                <Play className="h-5 w-5" />
                {nextItem ? 'Start agenda item' : 'Finish meeting'}
              </Button>
            )}
          </div>
        </>
      )}

      {!between && (
      <div className="text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          {currentItem?.title ?? segment.label}
        </h1>
        {inSubLoop && (
          <p className="mt-1 text-lg text-muted-foreground">
            {subLabel} {segment.subIndex}
            {segment.personName && (
              <span className="text-foreground"> — {segment.personName}</span>
            )}
          </p>
        )}
      </div>
      )}

      {!between && inSubLoop && people.length > 0 && (
        <select
          aria-label={`Assign participant to ${subLabel.toLowerCase()} ${segment.subIndex}`}
          value={segment.personId ?? ''}
          onChange={e => assignPerson(e.target.value || null)}
          disabled={pending}
          className={personSelectClass}
        >
          <option value="">Unassigned</option>
          {people.map(person => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      )}

      {!between && (
      <div className="text-center">
        <div
          className={`font-mono text-6xl font-semibold tabular-nums transition-colors ${
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
          <p className="mt-1 text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Paused
          </p>
        )}
        <Thresholds segment={segment} />
      </div>
      )}

      {!between && (
      <div className="flex w-full flex-col gap-3">
        <Button
          size="lg"
          className="h-14 w-full text-lg"
          onClick={() => finish(false)}
          disabled={pending}
        >
          {inSubLoop
            ? `Finish ${subLabel.toLowerCase()} ${segment.subIndex}`
            : 'Finish agenda item'}
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-12 w-full"
          onClick={togglePause}
          disabled={pending}
        >
          {paused ? (
            <>
              <Play className="h-5 w-5" />
              Resume
            </>
          ) : (
            <>
              <Pause className="h-5 w-5" />
              Pause
            </>
          )}
        </Button>
      </div>
      )}

      {!between && nextItem && (
        <p className="text-sm text-muted-foreground">
          Up next: <span className="text-foreground">{nextItem.title}</span>
        </p>
      )}

      <div className="mt-2 flex flex-col items-center gap-2">
        {!between && (
        <Button
          variant={skipConfirm.arming ? 'destructive' : 'ghost'}
          className={
            skipConfirm.arming ? '' : 'text-muted-foreground hover:text-foreground'
          }
          onClick={() =>
            // Skip the current item: mark its segment skipped and wait
            // between items — the next one still starts explicitly.
            skipConfirm.tap(() => finish(true))
          }
          disabled={pending}
        >
          <SkipForward className="h-4 w-4" />
          {skipConfirm.arming ? 'Tap again to skip' : 'Skip agenda item'}
        </Button>
        )}
        <Button
          size="sm"
          variant={endConfirm.arming ? 'destructive' : 'ghost'}
          className={
            endConfirm.arming ? '' : 'text-destructive hover:text-destructive'
          }
          onClick={() => endConfirm.tap(() => advance(null))}
          disabled={pending}
        >
          <Square className="h-4 w-4" />
          {endConfirm.arming ? 'Tap again to end' : 'End meeting'}
        </Button>
      </div>
    </div>
  )
}

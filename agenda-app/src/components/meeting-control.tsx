'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  advanceRunAction,
  assignSegmentPersonAction,
  togglePauseAction,
  type NextSegment,
} from '@/actions/run-actions'
import { formatElapsed, timerColorClass } from '@/lib/timer-color'
import { type RunState, computeRunTargets } from '@/lib/run-state'
import { useElapsedSeconds, useRunState } from '@/components/use-run-state'
import { Thresholds } from '@/components/meeting-display'
import { Button } from '@/components/ui/button'
import { ChevronLeft, MonitorPlay, Pause, Play, Square } from 'lucide-react'
import type { AgendaItem, Person } from '@/generated/prisma/client'

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
  const [confirmingEnd, setConfirmingEnd] = useState(false)
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
    },
    [],
  )

  if (!segment || state.endedAt) return null

  const { currentItem, nextItem, inSubLoop, subLabel, nextTarget, nextLabel, endTarget } =
    computeRunTargets(items, segment)

  function advance(target: NextSegment | null) {
    startTransition(async () => {
      await advanceRunAction(runId, target)
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

  // Lightweight confirm: the first tap arms the button for 3 seconds, the
  // second tap actually ends the meeting.
  function handleEndMeeting() {
    if (!confirmingEnd) {
      setConfirmingEnd(true)
      confirmTimer.current = setTimeout(() => setConfirmingEnd(false), 3000)
      return
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current)
    setConfirmingEnd(false)
    advance(null)
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
            {segment.personName && (
              <span className="text-foreground"> — {segment.personName}</span>
            )}
          </p>
        )}
      </div>

      {inSubLoop && people.length > 0 && (
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

      <div className="flex w-full flex-col gap-3">
        <Button
          size="lg"
          className="h-14 w-full text-lg"
          onClick={() => advance(nextTarget)}
          disabled={pending}
        >
          {nextLabel}
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

      <Button
        size="sm"
        variant={confirmingEnd ? 'destructive' : 'ghost'}
        className={confirmingEnd ? 'mt-2' : 'mt-2 text-destructive hover:text-destructive'}
        onClick={handleEndMeeting}
        disabled={pending}
      >
        <Square className="h-4 w-4" />
        {confirmingEnd ? 'Tap again to end' : 'End meeting'}
      </Button>
    </div>
  )
}

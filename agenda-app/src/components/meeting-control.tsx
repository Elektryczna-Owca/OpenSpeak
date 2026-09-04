'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  advanceRunAction,
  assignNewPersonAction,
  assignSegmentPersonAction,
  finishItemAction,
  finishSegmentAction,
  goBackAction,
  setSegmentCommentAction,
  skipNextAction,
  togglePauseAction,
  type NextSegment,
} from '@/actions/run-actions'
import { formatElapsed, timerColorClass } from '@/lib/timer-color'
import { type RunState, computeRunTargets } from '@/lib/run-state'
import { useElapsedSeconds, useRunState } from '@/components/use-run-state'
import { useMaxTimeAlert } from '@/components/use-max-alert'
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
  Timer,
  Undo2,
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

// Free-text note for the current segment. The value is kept locally while
// typing (the run state polls every second, which would otherwise overwrite
// keystrokes) and saved debounced, plus immediately on blur. Rendered with a
// key tied to the segment so a new sub-item starts from its own stored value.
function SegmentCommentField({
  runId,
  placeholder,
  ariaLabel,
  initialComment,
  onSaved,
}: {
  runId: string
  placeholder: string
  ariaLabel: string
  initialComment: string | null
  onSaved: () => void
}) {
  const [value, setValue] = useState(initialComment ?? '')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saved = useRef(initialComment ?? '')
  const latest = useRef(initialComment ?? '')

  const save = useCallback(
    async (text: string) => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = null
      if (text === saved.current) return
      saved.current = text
      await setSegmentCommentAction(runId, text)
      onSaved()
    },
    [runId, onSaved],
  )

  // Flush a still-pending edit when the field goes away (segment finished,
  // page left) so nothing typed is lost.
  const saveRef = useRef(save)
  saveRef.current = save
  useEffect(
    () => () => {
      if (timer.current) void saveRef.current(latest.current)
    },
    [],
  )

  function change(text: string) {
    setValue(text)
    latest.current = text
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void save(text), 800)
  }

  return (
    <textarea
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={value}
      onChange={e => change(e.target.value)}
      onBlur={() => void save(value)}
      rows={2}
      className="min-h-16 w-full min-w-0 resize-y rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
    />
  )
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
  people: initialPeople,
  initialState,
}: {
  agendaId: string
  agendaTitle: string
  runId: string
  items: AgendaItem[]
  people: Person[]
  initialState: RunState
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const { state, refetch } = useRunState(runId, initialState)
  const segment = state.segment
  const elapsed = useElapsedSeconds(segment)
  useMaxTimeAlert(segment, elapsed)
  const paused = segment?.pausedAt != null
  const skipConfirm = useTapConfirm()
  const endConfirm = useTapConfirm()
  const backConfirm = useTapConfirm()

  // People created on the fly (assigned to a sub-item mid-meeting) need to
  // show up in the picker immediately, ahead of the next server refresh.
  const [people, setPeople] = useState<Pick<Person, 'id' | 'name'>[]>(initialPeople)
  useEffect(() => setPeople(initialPeople), [initialPeople])
  const [addingPerson, setAddingPerson] = useState(false)
  const [newPersonName, setNewPersonName] = useState('')

  // Prep time for the upcoming sub-item, timed locally while waiting between
  // segments — the segment it belongs to doesn't exist until "Start" is
  // pressed, at which point these are stamped onto it and reset.
  const [prepStartedAt, setPrepStartedAt] = useState<Date | null>(null)
  const [prepEndedAt, setPrepEndedAt] = useState<Date | null>(null)
  useEffect(() => {
    setPrepStartedAt(null)
    setPrepEndedAt(null)
  }, [segment?.position])
  const prepElapsed = useElapsedSeconds(
    prepStartedAt && !prepEndedAt
      ? { startedAt: prepStartedAt.toISOString(), pausedAt: null, pausedSeconds: 0 }
      : null,
  )

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

  // Starts the next sub-item, folding in whatever prep time was tracked —
  // stopping it first if it was still running.
  function startSub(target: NextSegment) {
    const endedAt = prepStartedAt && !prepEndedAt ? new Date() : prepEndedAt
    advance({
      ...target,
      prepStartedAt: prepStartedAt?.toISOString(),
      prepEndedAt: endedAt?.toISOString(),
    })
  }

  function togglePrep() {
    if (prepStartedAt && !prepEndedAt) {
      setPrepEndedAt(new Date())
    } else {
      setPrepStartedAt(new Date())
      setPrepEndedAt(null)
    }
  }

  function finish(skipped: boolean) {
    startTransition(async () => {
      await finishSegmentAction(runId, skipped)
      await refetch()
    })
  }

  function goBack() {
    startTransition(async () => {
      await goBackAction(runId)
      await refetch()
    })
  }

  function finishItem() {
    startTransition(async () => {
      await finishItemAction(runId)
      await refetch()
    })
  }

  function skipNext() {
    if (!nextItem) return
    startTransition(async () => {
      await skipNextAction(runId, { itemId: nextItem.id, kind: 'item' })
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

  function addAndAssignPerson() {
    const name = newPersonName.trim()
    if (!name) return
    startTransition(async () => {
      const person = await assignNewPersonAction(runId, name)
      if (person) {
        setPeople(prev => [...prev, person])
        setAddingPerson(false)
        setNewPersonName('')
        router.refresh()
      }
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
                  onClick={() => startSub(nextSubTarget)}
                  disabled={pending}
                >
                  <Play className="h-5 w-5" />
                  Start {subLabel.toLowerCase()} {nextSubTarget.subIndex}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 w-full"
                  onClick={togglePrep}
                  disabled={pending}
                >
                  <Timer className="h-4 w-4" />
                  {prepStartedAt && !prepEndedAt
                    ? `Stop prep time — ${formatElapsed(prepElapsed)}`
                    : 'Start prep time'}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 w-full"
                  onClick={finishItem}
                  disabled={pending}
                >
                  Finish {currentItem?.title ?? 'agenda item'}
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
                {nextItem ? `Start ${nextItem.title}` : 'Finish meeting'}
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

      {!between && inSubLoop && (
        <div className="flex w-full flex-col gap-2">
          {addingPerson ? (
            <div className="flex gap-2">
              <input
                autoFocus
                aria-label="New participant name"
                placeholder="Participant name"
                value={newPersonName}
                onChange={e => setNewPersonName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addAndAssignPerson()
                  } else if (e.key === 'Escape') {
                    setAddingPerson(false)
                    setNewPersonName('')
                  }
                }}
                disabled={pending}
                className={personSelectClass}
              />
              <Button
                onClick={addAndAssignPerson}
                disabled={pending || !newPersonName.trim()}
              >
                Add
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setAddingPerson(false)
                  setNewPersonName('')
                }}
                disabled={pending}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <select
              aria-label={`Assign participant to ${subLabel.toLowerCase()} ${segment.subIndex}`}
              value={segment.personId ?? ''}
              onChange={e => {
                if (e.target.value === '__new__') setAddingPerson(true)
                else assignPerson(e.target.value || null)
              }}
              disabled={pending}
              className={personSelectClass}
            >
              <option value="">Unassigned</option>
              {people.map(person => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
              <option value="__new__">+ New participant…</option>
            </select>
          )}
          <SegmentCommentField
            key={segment.startedAt}
            runId={runId}
            ariaLabel={`Comment for ${subLabel.toLowerCase()} ${segment.subIndex}`}
            placeholder="Comment (shown in the report)"
            initialComment={segment.comment}
            onSaved={refetch}
          />
        </div>
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
            : `Finish ${currentItem?.title ?? 'agenda item'}`}
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

      {!between && currentItem?.subExpectedMinutes != null && (
        <p className="text-sm text-muted-foreground">
          Up next:{' '}
          <span className="text-foreground">
            {subLabel} {inSubLoop ? (segment.subIndex ?? 1) + 1 : 1}
          </span>
        </p>
      )}

      {!between && currentItem?.subExpectedMinutes == null && nextItem && (
        <p className="text-sm text-muted-foreground">
          Up next: <span className="text-foreground">{nextItem.title}</span>
        </p>
      )}

      <div className="mt-2 flex flex-col items-center gap-2">
        {segment.position > 0 && (
          <Button
            variant={backConfirm.arming ? 'destructive' : 'ghost'}
            className={
              backConfirm.arming ? '' : 'text-muted-foreground hover:text-foreground'
            }
            onClick={() =>
              // Abandon the current segment entirely and reopen the previous
              // one, paused, so the controller can pick up from there.
              backConfirm.tap(goBack)
            }
            disabled={pending}
          >
            <Undo2 className="h-4 w-4" />
            {backConfirm.arming ? 'Tap again to discard & go back' : 'Back to previous item'}
          </Button>
        )}
        {(!between ? true : !nextSubTarget && nextItem != null) && (
        <Button
          variant={skipConfirm.arming ? 'destructive' : 'ghost'}
          className={
            skipConfirm.arming ? '' : 'text-muted-foreground hover:text-foreground'
          }
          onClick={() =>
            // Not between: mark the running segment skipped and wait between
            // items. Between: skip the upcoming item without starting it.
            skipConfirm.tap(between ? skipNext : () => finish(true))
          }
          disabled={pending}
        >
          <SkipForward className="h-4 w-4" />
          {skipConfirm.arming
            ? 'Tap again to skip'
            : `Skip ${(between ? nextItem?.title : currentItem?.title) ?? 'agenda item'}`}
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

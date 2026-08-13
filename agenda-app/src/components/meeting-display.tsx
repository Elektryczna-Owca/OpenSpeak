'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatElapsed, timerColorClass, timerStage } from '@/lib/timer-color'
import { type RunState, computeRunTargets } from '@/lib/run-state'
import { cumulativeStartMinutes, makeStartLabel } from '@/lib/schedule'
import { useElapsedSeconds, useRunState } from '@/components/use-run-state'
import { MeetingFocus } from '@/components/meeting-focus'
import { QRCodeSVG } from 'qrcode.react'
import { ChevronLeft, CornerDownRight, Maximize2, Smartphone } from 'lucide-react'
import type { AgendaItem } from '@/generated/prisma/client'

// Per-agenda, per-device memory of the chosen presentation (standard view or
// the full-screen focus mode).
const focusModeKey = (agendaId: string) => `openspeak:run-mode:${agendaId}`

// Read-only live view of the running meeting (e.g. on a projector). Advances
// are made from the control page — this view polls and follows along.
export function MeetingDisplay({
  agendaId,
  agendaTitle,
  runId,
  items,
  startAt,
  timezone,
  initialState,
}: {
  agendaId: string
  agendaTitle: string
  runId: string
  items: AgendaItem[]
  startAt: Date | null
  timezone: string | null
  initialState: RunState
}) {
  const router = useRouter()
  const { state } = useRunState(runId, initialState)
  const segment = state.segment
  const elapsed = useElapsedSeconds(segment)
  const paused = segment?.pausedAt != null
  const [qrExpanded, setQrExpanded] = useState(false)
  const [focus, setFocus] = useState(false)

  useEffect(() => {
    if (!qrExpanded) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setQrExpanded(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [qrExpanded])

  // Which presentation this screen last used, so a projector that reloads
  // mid-meeting comes back the way it was left. Read after mount (never during
  // render) so the server and client agree on the first paint.
  useEffect(() => {
    setFocus(localStorage.getItem(focusModeKey(agendaId)) === 'focus')
  }, [agendaId])

  const enterFocus = () => {
    setFocus(true)
    localStorage.setItem(focusModeKey(agendaId), 'focus')
    // A click is a user gesture, so real fullscreen is allowed here. If the
    // browser refuses, the overlay still covers the viewport.
    document.documentElement.requestFullscreen?.().catch(() => {})
  }

  const exitFocus = () => {
    setFocus(false)
    localStorage.setItem(focusModeKey(agendaId), 'standard')
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  }

  // Leaving fullscreen by the browser's own means (Escape, F11) also leaves
  // focus mode — otherwise the overlay would linger with the browser chrome
  // back. Escape is handled separately for when fullscreen was never granted.
  useEffect(() => {
    if (!focus) return
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) exitFocus()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exitFocus()
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, agendaId])

  // When the controller finishes the meeting, follow to the review page.
  useEffect(() => {
    if (state.endedAt) {
      router.push(`/agendas/${agendaId}/runs/${runId}`)
    }
  }, [state.endedAt, router, agendaId, runId])

  if (!segment) return null

  const { currentIndex, currentItem, nextItem, inSubLoop, subLabel } =
    computeRunTargets(items, segment)

  // Segment closed but run still open: the controller finished a segment and
  // hasn't started the next one yet — feature what's up next, timer idle.
  const between = segment.endedAt != null
  // Between segments of an item with a sub-item loop, the item stays current
  // and the next sub is what's up next — until the item is declared finished.
  const upNextSubIndex =
    between &&
    !segment.itemDone &&
    currentItem &&
    currentItem.subExpectedMinutes != null
      ? inSubLoop
        ? (segment.subIndex ?? 1) + 1
        : 1
      : null
  const shownItem = between && upNextSubIndex == null ? nextItem : currentItem

  // Planned start of the next item, from the printed agenda's schedule
  // (scheduled start + expected durations before it) — actual timing may drift.
  const nextIndex = currentIndex + 1
  const startLabelAt = makeStartLabel(startAt, timezone)
  const startMinutes = cumulativeStartMinutes(items)
  const nextStartLabel =
    nextItem && currentIndex >= 0 ? startLabelAt(startMinutes[nextIndex]) : null

  // Focus mode shows one thing large and names what follows it at the bottom.
  // Between items the headline is already the next item, so what follows is the
  // one after that.
  const headlineIsNextItem = between && upNextSubIndex == null
  const focusNextIndex = headlineIsNextItem ? nextIndex + 1 : nextIndex
  const focusNextItem =
    currentIndex >= 0 ? (items[focusNextIndex] ?? null) : null
  const focusSubline =
    between && upNextSubIndex != null
      ? `${subLabel} ${upNextSubIndex}`
      : !between && inSubLoop
        ? `${subLabel} ${segment.subIndex}${segment.personName ? ` — ${segment.personName}` : ''}`
        : null

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
        <div className="flex items-center gap-4">
          <Link
            href={`/agendas/${agendaId}/control`}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <Smartphone className="h-4 w-4" />
            Control page
          </Link>
          <button
            type="button"
            onClick={enterFocus}
            className="flex cursor-pointer items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <Maximize2 className="h-4 w-4" />
            Change mode
          </button>
        </div>
      </div>

      <div className="text-center">
        {between && (
          <p className="text-lg font-medium tracking-wide text-muted-foreground uppercase">
            Up next
          </p>
        )}
        <h1 className="text-3xl font-semibold tracking-tight">
          {between
            ? (shownItem?.title ?? 'All items finished')
            : (currentItem?.title ?? segment.label)}
        </h1>
        {between && upNextSubIndex != null && (
          <p className="mt-1 text-xl text-muted-foreground">
            {subLabel} {upNextSubIndex}
          </p>
        )}
        {!between && inSubLoop && (
          <p className="mt-1 text-xl text-muted-foreground">
            {subLabel} {segment.subIndex}
            {segment.personName && (
              <span className="text-foreground"> — {segment.personName}</span>
            )}
          </p>
        )}
      </div>

      <div className="flex items-center gap-8">
        <div className="text-center">
          <div
            className={`font-mono text-8xl font-semibold tabular-nums transition-colors ${
              between || paused
                ? 'text-muted-foreground'
                : timerColorClass(
                    elapsed,
                    segment.minMinutes,
                    segment.expectedMinutes,
                    segment.maxMinutes,
                  )
            }`}
          >
            {formatElapsed(between ? 0 : elapsed)}
          </div>
          {!between && paused && (
            <p className="mt-1 text-lg font-medium tracking-wide text-muted-foreground uppercase">
              Paused
            </p>
          )}
          {between && upNextSubIndex != null && currentItem ? (
            <Thresholds
              segment={{
                minMinutes: currentItem.subMinMinutes,
                expectedMinutes: currentItem.subExpectedMinutes,
                maxMinutes: currentItem.subMaxMinutes,
              }}
            />
          ) : between && nextItem ? (
            <Thresholds
              segment={{
                minMinutes: nextItem.minMinutes,
                expectedMinutes: nextItem.durationMinutes,
                maxMinutes: nextItem.maxMinutes,
              }}
            />
          ) : (
            <Thresholds segment={segment} />
          )}
        </div>
        {shownItem?.url && (
          // Fixed white backdrop with a quiet zone so the code scans on
          // every color theme. Hover reveals the target URL; a click blows
          // the code up to a full-page overlay for the audience to scan.
          <button
            type="button"
            onClick={() => setQrExpanded(true)}
            title={shownItem.url}
            aria-label={`Show QR code for ${shownItem.title} full screen`}
            className="shrink-0 cursor-zoom-in rounded-lg bg-white p-2"
          >
            <QRCodeSVG value={shownItem.url} size={112} marginSize={0} />
          </button>
        )}
      </div>

      {currentIndex >= 0 && (
        <ol className="w-full max-w-md space-y-2">
          {items
            .slice(
              between && upNextSubIndex == null ? currentIndex + 1 : currentIndex,
            )
            .map((item, i) => (
            <li
              key={item.id}
              className={
                i === 0
                  ? 'rounded-lg border-2 border-primary bg-card px-4 py-2 font-medium'
                  : 'rounded-lg border px-4 py-2 text-muted-foreground'
              }
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate">
                  {item.id === nextItem?.id && nextStartLabel && (
                    <span className="mr-2 font-mono text-sm text-muted-foreground tabular-nums">
                      {nextStartLabel}
                    </span>
                  )}
                  {item.title}
                </span>
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

      {focus && (
        <MeetingFocus
          eyebrow={between ? 'Up next' : null}
          headline={
            between
              ? (shownItem?.title ?? 'All items finished')
              : (currentItem?.title ?? segment.label)
          }
          subline={focusSubline}
          elapsedLabel={formatElapsed(between ? 0 : elapsed)}
          stage={
            between
              ? 'idle'
              : timerStage(
                  elapsed,
                  segment.minMinutes,
                  segment.expectedMinutes,
                  segment.maxMinutes,
                )
          }
          paused={!between && paused}
          nextLabel={focusNextItem?.title ?? null}
          nextStartLabel={
            focusNextItem ? startLabelAt(startMinutes[focusNextIndex]) : null
          }
          onExit={exitFocus}
        />
      )}

      {qrExpanded && shownItem?.url && (
        <button
          type="button"
          onClick={() => setQrExpanded(false)}
          aria-label="Close full-screen QR code"
          className="fixed inset-0 z-50 flex cursor-zoom-out flex-col items-center justify-center gap-8 bg-white"
        >
          <QRCodeSVG
            value={shownItem.url}
            size={512}
            marginSize={0}
            className="h-[min(80vw,72vh)] w-[min(80vw,72vh)]"
          />
          <span className="max-w-[90vw] truncate font-mono text-xl text-neutral-700">
            {shownItem.url}
          </span>
        </button>
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

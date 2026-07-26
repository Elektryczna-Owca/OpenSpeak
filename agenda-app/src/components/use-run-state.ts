'use client'

import { useCallback, useEffect, useState } from 'react'
import type { RunState } from '@/lib/run-state'

// Polls /api/runs/[runId] so every device viewing the run (display screen,
// phone control) converges on the same state within a second of a change.
export function useRunState(runId: string, initial: RunState) {
  const [state, setState] = useState<RunState>(initial)

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(`/api/runs/${runId}`, { cache: 'no-store' })
      if (res.ok) setState(await res.json())
    } catch {
      // transient network error — keep the last known state, next poll retries
    }
  }, [runId])

  useEffect(() => {
    const interval = setInterval(refetch, 1000)
    return () => clearInterval(interval)
  }, [refetch])

  return { state, refetch }
}

// Ticking elapsed-seconds counter for the current segment. Paused time does
// not count: while paused the counter freezes at the moment of the pause, and
// previously accumulated pauses (pausedSeconds) are always subtracted.
export function useElapsedSeconds(
  segment: {
    startedAt: string
    pausedAt: string | null
    pausedSeconds: number
  } | null,
) {
  const startedAt = segment?.startedAt ?? null
  const pausedAt = segment?.pausedAt ?? null
  const pausedSeconds = segment?.pausedSeconds ?? 0
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (startedAt == null) return
    const startMs = Date.parse(startedAt)
    const pausedMs = pausedAt != null ? Date.parse(pausedAt) : null
    const tick = () =>
      setElapsed(((pausedMs ?? Date.now()) - startMs) / 1000 - pausedSeconds)
    tick()
    if (pausedMs != null) return // frozen while paused
    const interval = setInterval(tick, 500)
    return () => clearInterval(interval)
  }, [startedAt, pausedAt, pausedSeconds])
  return elapsed
}

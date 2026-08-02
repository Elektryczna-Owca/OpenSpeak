'use client'

import { useEffect, useRef } from 'react'

let audioCtx: AudioContext | null = null

// Short double beep via Web Audio — no asset to load, and the context is
// created lazily so it inherits the user-gesture unlock from the control
// page's taps.
function beep() {
  try {
    audioCtx ??= new AudioContext()
    const ctx = audioCtx
    if (ctx.state === 'suspended') void ctx.resume()
    const t0 = ctx.currentTime
    for (const offset of [0, 0.25]) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 880
      osc.connect(gain)
      gain.connect(ctx.destination)
      gain.gain.setValueAtTime(0.0001, t0 + offset)
      gain.gain.exponentialRampToValueAtTime(0.5, t0 + offset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + 0.18)
      osc.start(t0 + offset)
      osc.stop(t0 + offset + 0.2)
    }
  } catch {
    // audio unavailable or blocked — the red timer is still the signal
  }
}

// Plays a beep once per started segment the moment its elapsed time crosses
// the max threshold.
export function useMaxTimeAlert(
  segment: {
    startedAt: string
    endedAt: string | null
    maxMinutes: number | null
  } | null,
  elapsedSeconds: number,
) {
  const firedFor = useRef<string | null>(null)
  useEffect(() => {
    if (!segment || segment.endedAt || segment.maxMinutes == null) return
    const maxSeconds = segment.maxMinutes * 60
    // Only a live crossing counts — opening the page long past max stays
    // silent (the 2s window comfortably covers the 500ms timer ticks).
    if (
      elapsedSeconds >= maxSeconds &&
      elapsedSeconds < maxSeconds + 2 &&
      firedFor.current !== segment.startedAt
    ) {
      firedFor.current = segment.startedAt
      beep()
    }
  }, [segment, elapsedSeconds])
}

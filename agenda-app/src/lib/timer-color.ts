// Color logic for the meeting-run timer. Thresholds are the item's (or
// sub-item's) min / expected / max times in minutes; elapsed is in seconds.
//
// Progression: white → green (min reached) → yellow (expected reached) →
// red (30 seconds before max). Missing thresholds skip their stage. The
// colors are fixed regardless of the color theme, like timing cards.

export const RED_WARNING_SECONDS = 30

export type TimerStage = 'idle' | 'min' | 'expected' | 'max'

export function timerStage(
  elapsedSeconds: number,
  minMinutes: number | null,
  expectedMinutes: number | null,
  maxMinutes: number | null,
): TimerStage {
  if (maxMinutes != null && elapsedSeconds >= maxMinutes * 60 - RED_WARNING_SECONDS) {
    return 'max'
  }
  if (expectedMinutes != null && elapsedSeconds >= expectedMinutes * 60) {
    return 'expected'
  }
  if (minMinutes != null && elapsedSeconds >= minMinutes * 60) {
    return 'min'
  }
  return 'idle'
}

export function timerColorClass(
  elapsedSeconds: number,
  minMinutes: number | null,
  expectedMinutes: number | null,
  maxMinutes: number | null,
): string {
  switch (timerStage(elapsedSeconds, minMinutes, expectedMinutes, maxMinutes)) {
    case 'max':
      return 'text-red-500'
    case 'expected':
      return 'text-yellow-400'
    case 'min':
      return 'text-green-500'
    default:
      return 'text-white'
  }
}

// The same stages painted across a whole surface, for the full-screen focus
// mode: the stage color becomes the background, so it also has to name a
// foreground that stays legible on it. Before the min time there is no stage
// color yet and the view sits on the active palette's own background.
export function timerStageSurfaceClass(stage: TimerStage): string {
  switch (stage) {
    case 'max':
      return 'bg-red-600 text-white'
    case 'expected':
      return 'bg-yellow-400 text-black'
    case 'min':
      return 'bg-green-600 text-white'
    default:
      return 'bg-background text-foreground'
  }
}

// Row background for the post-meeting review: only min/max thresholds
// change the color, so "over expected" renders the same green as "on time".
export function segmentRowClass(
  actualSeconds: number,
  minMinutes: number | null,
  maxMinutes: number | null,
): string {
  if (maxMinutes != null && actualSeconds > maxMinutes * 60) {
    return 'bg-(--timer-max)/30'
  }
  if (minMinutes != null && actualSeconds < minMinutes * 60) {
    return 'bg-muted'
  }
  return 'bg-(--timer-min)/30'
}

export function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  const seconds = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`
}

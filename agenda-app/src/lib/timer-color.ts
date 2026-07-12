// Color logic for the meeting-run timer. Thresholds are the item's (or
// sub-item's) min / expected / max times in minutes; elapsed is in seconds.
//
// Progression: neutral → green (min reached) → yellow (expected reached) →
// red (30 seconds before max). Missing thresholds skip their stage.

export const RED_WARNING_SECONDS = 30

export function timerColorClass(
  elapsedSeconds: number,
  minMinutes: number | null,
  expectedMinutes: number | null,
  maxMinutes: number | null,
): string {
  if (maxMinutes != null && elapsedSeconds >= maxMinutes * 60 - RED_WARNING_SECONDS) {
    return 'text-red-600 dark:text-red-500'
  }
  if (expectedMinutes != null && elapsedSeconds >= expectedMinutes * 60) {
    return 'text-amber-500'
  }
  if (minMinutes != null && elapsedSeconds >= minMinutes * 60) {
    return 'text-green-600 dark:text-green-500'
  }
  return 'text-foreground'
}

// Same thresholds, expressed as a status word for the post-meeting review.
export function segmentStatus(
  actualSeconds: number,
  minMinutes: number | null,
  expectedMinutes: number | null,
  maxMinutes: number | null,
): { label: string; className: string } {
  if (maxMinutes != null && actualSeconds > maxMinutes * 60) {
    return { label: 'over max', className: 'text-red-600 dark:text-red-500' }
  }
  if (expectedMinutes != null && actualSeconds > expectedMinutes * 60) {
    return { label: 'over expected', className: 'text-amber-500' }
  }
  if (minMinutes != null && actualSeconds < minMinutes * 60) {
    return { label: 'under min', className: 'text-muted-foreground' }
  }
  return { label: 'on time', className: 'text-green-600 dark:text-green-500' }
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

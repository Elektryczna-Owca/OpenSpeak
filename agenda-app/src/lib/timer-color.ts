// Color logic for the meeting-run timer. Thresholds are the item's (or
// sub-item's) green / yellow / red times in minutes; elapsed is in seconds.
//
// Progression: white → green → yellow → red, each stage starting when its
// threshold is reached. Missing thresholds skip their stage. The colors are
// fixed regardless of the color theme, like timing cards. (Min and max don't
// color the timer: max sounds the alert and both feed the "within" verdict.)

export type TimerStage = 'idle' | 'green' | 'yellow' | 'red'

export type StageTimes = {
  greenMinutes: number | null
  yellowMinutes: number | null
  redMinutes: number | null
}

export function timerStage(elapsedSeconds: number, times: StageTimes): TimerStage {
  if (times.redMinutes != null && elapsedSeconds >= times.redMinutes * 60) return 'red'
  if (times.yellowMinutes != null && elapsedSeconds >= times.yellowMinutes * 60) {
    return 'yellow'
  }
  if (times.greenMinutes != null && elapsedSeconds >= times.greenMinutes * 60) {
    return 'green'
  }
  return 'idle'
}

export function timerColorClass(elapsedSeconds: number, times: StageTimes): string {
  switch (timerStage(elapsedSeconds, times)) {
    case 'red':
      return 'text-red-500'
    case 'yellow':
      return 'text-yellow-400'
    case 'green':
      return 'text-green-500'
    default:
      return 'text-white'
  }
}

// The same stages painted across a whole surface, for the full-screen focus
// mode: the stage color becomes the background, so it also has to name a
// foreground that stays legible on it. Before the green time there is no stage
// color yet and the view sits on the active palette's own background.
export function timerStageSurfaceClass(stage: TimerStage): string {
  switch (stage) {
    case 'red':
      return 'bg-red-600 text-white'
    case 'yellow':
      return 'bg-yellow-400 text-black'
    case 'green':
      return 'bg-green-600 text-white'
    default:
      return 'bg-background text-foreground'
  }
}

// Row background for the post-meeting review: only min/max thresholds
// change the color, so "over yellow" renders the same green as "on time".
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

// Planned timing of agenda items: each item's start is the agenda's scheduled
// start (or a +H:MM offset when none is set) plus the planned durations of
// everything before it. Sub-item loops are open-ended, so only each item's
// own planned time counts.

import { type TimeFields, itemTimes, plannedMinutes } from '@/lib/item-times'

// Minutes from meeting start to each item's planned start (running sum of
// planned durations).
export function cumulativeStartMinutes(items: TimeFields[]): number[] {
  let acc = 0
  return items.map(item => {
    const start = acc
    acc += plannedMinutes(itemTimes(item))
    return start
  })
}

// Offset from meeting start when the agenda has no scheduled start time.
export function offsetLabel(minutes: number): string {
  const total = Math.round(minutes)
  const h = Math.floor(total / 60)
  const m = total % 60
  return `+${h}:${String(m).padStart(2, '0')}`
}

// Formatter for a planned start: wall-clock time in the agenda's timezone,
// or a +H:MM offset when the agenda has no scheduled start.
export function makeStartLabel(
  startAt: Date | null,
  timezone: string | null,
): (minutes: number) => string {
  if (!startAt) return offsetLabel
  const startMs = startAt.getTime()
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone ?? 'UTC',
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
  })
  return minutes => fmt.format(new Date(startMs + Math.round(minutes) * 60_000))
}

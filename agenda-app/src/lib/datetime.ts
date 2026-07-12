// Timezone-aware datetime helpers built on the standard `Intl` API — no extra deps.
//
// A meeting's `startAt` is stored as a true UTC instant, paired with an IANA
// `timezone` string. Forms edit a wall-clock time (`datetime-local`) in that zone,
// so we convert between the two here.

// Formats the parts of `date` as they appear in `timeZone` and returns them as numbers.
function getZonedParts(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const map: Record<string, number> = {}
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== 'literal') map[part.type] = Number(part.value)
  }
  return map
}

// Converts a `datetime-local` wall-clock string ("2026-07-20T14:00"), interpreted
// in `timeZone`, into the corresponding UTC instant.
export function zonedWallTimeToUtc(wall: string, timeZone: string): Date {
  const [datePart, timePart = '00:00'] = wall.split('T')
  const [y, mo, d] = datePart.split('-').map(Number)
  const [h, mi] = timePart.split(':').map(Number)

  // Start by assuming the wall time is UTC, then measure how far that guess lands
  // from the target zone and correct. One correction is exact except within the
  // ~1h DST-overlap window, which is acceptable for scheduling.
  const guess = Date.UTC(y, mo - 1, d, h, mi)
  const p = getZonedParts(new Date(guess), timeZone)
  const zoned = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  const offset = zoned - guess
  return new Date(guess - offset)
}

// Inverse of `zonedWallTimeToUtc`: renders a UTC instant as a "yyyy-MM-ddTHH:mm"
// wall-clock string in `timeZone`, suitable for a `datetime-local` input value.
export function utcToZonedWallInput(date: Date, timeZone: string): string {
  const p = getZonedParts(date, timeZone)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`
}

// Human-readable meeting start, formatted in its own timezone.
export function formatMeetingStart(date: Date, timeZone: string): string {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone,
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(date)
  return `${formatted} (${timeZone})`
}

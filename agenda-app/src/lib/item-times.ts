import { z } from 'zod'

// Shared rules for agenda-item times, used by both the item form actions and
// the CSV importers. An item (or sub-item) carries five optional thresholds in
// minutes — min, green, yellow, red, max — that must be non-decreasing in that
// order when set. Min and max bound the "within time" verdict; green, yellow
// and red are the timing-card colors the timer turns. Minutes are allowed at
// half-minute (30-second) accuracy: whole minutes or minute-and-a-half,
// nothing finer.

export const HALF_MINUTE = 'Use whole or half minutes (e.g. 10 or 10.5)'

export const requiredMinutes = z.coerce
  .number()
  .min(0.5)
  .max(600)
  .multipleOf(0.5, HALF_MINUTE)

// Optional minutes field: empty/absent form value → null, otherwise 0.5–600.
export const optionalMinutes = z.preprocess(
  v => (v === '' || v === null || v === undefined ? null : v),
  requiredMinutes.nullable(),
)

// Optional short text field: empty/absent → null.
export const optionalLabel = z.preprocess(
  v => (v === '' || v === null || v === undefined ? null : v),
  z.string().max(100).nullable(),
)

export const TIME_KEYS = ['min', 'green', 'yellow', 'red', 'max'] as const
export type TimeKey = (typeof TIME_KEYS)[number]
export type Times = Record<TimeKey, number | null>

export const TIME_LABELS: Record<TimeKey, string> = {
  min: 'Min',
  green: 'Green',
  yellow: 'Yellow',
  red: 'Red',
  max: 'Max',
}

// Field names of an item's five times; sub-items prefix them with "sub".
export const ITEM_TIME_FIELDS = {
  min: 'minMinutes',
  green: 'greenMinutes',
  yellow: 'yellowMinutes',
  red: 'redMinutes',
  max: 'maxMinutes',
} as const
export const SUB_TIME_FIELDS = {
  min: 'subMinMinutes',
  green: 'subGreenMinutes',
  yellow: 'subYellowMinutes',
  red: 'subRedMinutes',
  max: 'subMaxMinutes',
} as const

export type TimeFields = Record<(typeof ITEM_TIME_FIELDS)[TimeKey], number | null>
export type SubTimeFields = Record<(typeof SUB_TIME_FIELDS)[TimeKey], number | null>

export function itemTimes(item: TimeFields): Times {
  return {
    min: item.minMinutes,
    green: item.greenMinutes,
    yellow: item.yellowMinutes,
    red: item.redMinutes,
    max: item.maxMinutes,
  }
}

export function subTimes(item: SubTimeFields): Times {
  return {
    min: item.subMinMinutes,
    green: item.subGreenMinutes,
    yellow: item.subYellowMinutes,
    red: item.subRedMinutes,
    max: item.subMaxMinutes,
  }
}

export function hasAnyTime(times: Times): boolean {
  return TIME_KEYS.some(k => times[k] != null)
}

// The time an item is planned to take, which drives the schedule and totals:
// the red card if set, otherwise the next best threshold. 0 when no time is set at all.
export function plannedMinutes(times: Times): number {
  return times.red ?? times.yellow ?? times.max ?? times.green ?? times.min ?? 0
}

// Old-style (min, expected, max) → five thresholds, preserving the previous
// behaviour: green at min, yellow at expected, red 30 seconds before max.
export function legacyTimes(
  min: number | null,
  expected: number | null,
  max: number | null,
): Times {
  return {
    min,
    green: min,
    yellow: expected,
    red: max != null ? Math.max(max - 0.5, expected ?? 0) || null : null,
    max,
  }
}

// Enforces min ≤ green ≤ yellow ≤ red ≤ max over whichever are set, attaching
// the error to the later of the two offending fields.
export function checkOrdering(
  ctx: z.RefinementCtx,
  times: Times,
  paths: Record<TimeKey, string>,
) {
  let prev: TimeKey | null = null
  for (const key of TIME_KEYS) {
    const value = times[key]
    if (value == null) continue
    if (prev != null && times[prev]! > value) {
      ctx.addIssue({
        code: 'custom',
        path: [paths[key]],
        message: `${TIME_LABELS[key]} cannot be less than ${TIME_LABELS[prev].toLowerCase()}`,
      })
    }
    prev = key
  }
}

// An item needs at least one time; its sub-item (when it has a label but no
// time) is incomplete. Shared by item forms and CSV rows.
export function checkItemTimes(ctx: z.RefinementCtx, data: TimeFields) {
  const times = itemTimes(data)
  if (!hasAnyTime(times)) {
    ctx.addIssue({
      code: 'custom',
      path: [ITEM_TIME_FIELDS.yellow],
      message: 'Set at least one time',
    })
    return
  }
  checkOrdering(ctx, times, ITEM_TIME_FIELDS)
}

// The sub-item is enabled by setting any of its times; a label without times
// is incomplete.
export function checkSubItem(
  ctx: z.RefinementCtx,
  data: SubTimeFields & { subLabel: string | null },
) {
  const times = subTimes(data)
  if (!hasAnyTime(times)) {
    if (data.subLabel != null) {
      ctx.addIssue({
        code: 'custom',
        path: [SUB_TIME_FIELDS.yellow],
        message: 'Set a time for the sub-item',
      })
    }
  } else {
    checkOrdering(ctx, times, SUB_TIME_FIELDS)
  }
}

// Whether an item runs a sub-item loop (a timed slot per participant).
export function hasSubItem(item: SubTimeFields): boolean {
  return hasAnyTime(subTimes(item))
}

export function itemPlanned(item: TimeFields): number {
  return plannedMinutes(itemTimes(item))
}

export function subPlanned(item: SubTimeFields): number {
  return plannedMinutes(subTimes(item))
}

export function totalPlanned(items: TimeFields[]): number {
  return items.reduce((sum, item) => sum + itemPlanned(item), 0)
}

// "6 / 7 / 8" style summary of the set thresholds, for one-line displays.
export function formatTimes(times: Times): string {
  return TIME_KEYS.filter(k => times[k] != null)
    .map(k => `${TIME_LABELS[k].toLowerCase()} ${times[k]}`)
    .join(' · ')
}

// A sub-item's times under the item field names, for code that treats an
// item's and a segment's thresholds alike.
export function subAsItemFields(item: SubTimeFields): TimeFields {
  return {
    minMinutes: item.subMinMinutes,
    greenMinutes: item.subGreenMinutes,
    yellowMinutes: item.subYellowMinutes,
    redMinutes: item.subRedMinutes,
    maxMinutes: item.subMaxMinutes,
  }
}

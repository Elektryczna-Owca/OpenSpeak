import { z } from 'zod'

// Shared validation rules for agenda-item times, used by both the item form
// actions and the CSV importer. Minutes are allowed at half-minute (30-second)
// accuracy: whole minutes or minute-and-a-half, nothing finer.

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

// Enforces min ≤ expected ≤ max on a related trio, attaching errors to the
// min/max paths.
export function checkOrdering(
  ctx: z.RefinementCtx,
  min: number | null,
  expected: number,
  max: number | null,
  minPath: string,
  maxPath: string,
) {
  if (min != null && min > expected) {
    ctx.addIssue({ code: 'custom', path: [minPath], message: 'Min cannot exceed expected time' })
  }
  if (max != null && max < expected) {
    ctx.addIssue({ code: 'custom', path: [maxPath], message: 'Max cannot be less than expected time' })
  }
  if (min != null && max != null && min > max) {
    ctx.addIssue({ code: 'custom', path: [maxPath], message: 'Max cannot be less than min' })
  }
}

// The sub-item is enabled by setting its expected time; a label or min/max
// without an expected time is incomplete. Shared by item forms and CSV rows.
export function checkSubItem(
  ctx: z.RefinementCtx,
  data: {
    subLabel: string | null
    subMinMinutes: number | null
    subExpectedMinutes: number | null
    subMaxMinutes: number | null
  },
) {
  if (data.subExpectedMinutes == null) {
    if (data.subMinMinutes != null || data.subMaxMinutes != null || data.subLabel != null) {
      ctx.addIssue({
        code: 'custom',
        path: ['subExpectedMinutes'],
        message: 'Set an expected time for the sub-item',
      })
    }
  } else {
    checkOrdering(
      ctx,
      data.subMinMinutes,
      data.subExpectedMinutes,
      data.subMaxMinutes,
      'subMinMinutes',
      'subMaxMinutes',
    )
  }
}

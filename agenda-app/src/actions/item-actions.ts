'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// Minutes are allowed at half-minute (30-second) accuracy: whole minutes or
// minute-and-a-half, nothing finer.
const HALF_MINUTE = 'Use whole or half minutes (e.g. 10 or 10.5)'

// Optional minutes field: empty/absent form value → null, otherwise 0.5–600.
const optionalMinutes = z.preprocess(
  v => (v === '' || v === null || v === undefined ? null : v),
  z.coerce.number().min(0.5).max(600).multipleOf(0.5, HALF_MINUTE).nullable(),
)

// Optional short text field: empty/absent → null.
const optionalLabel = z.preprocess(
  v => (v === '' || v === null || v === undefined ? null : v),
  z.string().max(100).nullable(),
)

// Enforces min ≤ expected ≤ max on a related trio, attaching errors to the
// min/max paths. `expected` may be null (feature disabled) — callers guard that.
function checkOrdering(
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

const ItemSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200),
    durationMinutes: z.coerce
      .number()
      .min(0.5)
      .max(600)
      .multipleOf(0.5, HALF_MINUTE),
    minMinutes: optionalMinutes,
    maxMinutes: optionalMinutes,
    personId: z
      .string()
      .transform(v => (v === '' ? null : v))
      .nullable()
      .optional(),
    subLabel: optionalLabel,
    subMinMinutes: optionalMinutes,
    subExpectedMinutes: optionalMinutes,
    subMaxMinutes: optionalMinutes,
  })
  .superRefine((data, ctx) => {
    checkOrdering(
      ctx,
      data.minMinutes,
      data.durationMinutes,
      data.maxMinutes,
      'minMinutes',
      'maxMinutes',
    )

    // Sub-item is enabled by setting its expected time; a label or min/max
    // without an expected time is incomplete.
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
  })

export type ItemFormState = {
  errors?: {
    title?: string[]
    durationMinutes?: string[]
    minMinutes?: string[]
    maxMinutes?: string[]
    subLabel?: string[]
    subMinMinutes?: string[]
    subExpectedMinutes?: string[]
    subMaxMinutes?: string[]
    _form?: string[]
  }
  ok?: boolean
}

// If the sub-item has no expected time it is considered absent — clear its
// other fields so a disabled sub-item never leaves stray label/min/max values.
function normalizeSub<T extends {
  subLabel: string | null
  subMinMinutes: number | null
  subExpectedMinutes: number | null
  subMaxMinutes: number | null
}>(data: T): T {
  if (data.subExpectedMinutes == null) {
    return { ...data, subLabel: null, subMinMinutes: null, subMaxMinutes: null }
  }
  return data
}

// Returns the personId only if it belongs to the given agenda, otherwise null.
// Guards against a stale/tampered select value assigning a person from another agenda.
async function resolvePersonId(
  agendaId: string,
  personId: string | null | undefined,
): Promise<string | null> {
  if (!personId) return null
  const person = await prisma.person.findFirst({
    where: { id: personId, agendaId },
    select: { id: true },
  })
  return person ? person.id : null
}

export async function addItemAction(
  agendaId: string,
  _prev: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  const parsed = ItemSchema.safeParse({
    title: formData.get('title'),
    durationMinutes: formData.get('durationMinutes'),
    minMinutes: formData.get('minMinutes'),
    maxMinutes: formData.get('maxMinutes'),
    personId: formData.get('personId'),
    subLabel: formData.get('subLabel'),
    subMinMinutes: formData.get('subMinMinutes'),
    subExpectedMinutes: formData.get('subExpectedMinutes'),
    subMaxMinutes: formData.get('subMaxMinutes'),
  })
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors }
  }
  const { personId, ...data } = parsed.data
  const count = await prisma.agendaItem.count({ where: { agendaId } })
  await prisma.agendaItem.create({
    data: {
      ...normalizeSub(data),
      agendaId,
      position: count,
      personId: await resolvePersonId(agendaId, personId),
    },
  })
  revalidatePath(`/agendas/${agendaId}`)
  return { ok: true }
}

export async function updateItemAction(
  id: string,
  _prev: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  const parsed = ItemSchema.safeParse({
    title: formData.get('title'),
    durationMinutes: formData.get('durationMinutes'),
    minMinutes: formData.get('minMinutes'),
    maxMinutes: formData.get('maxMinutes'),
    personId: formData.get('personId'),
    subLabel: formData.get('subLabel'),
    subMinMinutes: formData.get('subMinMinutes'),
    subExpectedMinutes: formData.get('subExpectedMinutes'),
    subMaxMinutes: formData.get('subMaxMinutes'),
  })
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors }
  }
  const existing = await prisma.agendaItem.findUnique({
    where: { id },
    select: { agendaId: true },
  })
  if (!existing) {
    return { errors: { _form: ['Item not found'] } }
  }
  const { personId, ...data } = parsed.data
  const item = await prisma.agendaItem.update({
    where: { id },
    data: {
      ...normalizeSub(data),
      personId: await resolvePersonId(existing.agendaId, personId),
    },
  })
  revalidatePath(`/agendas/${item.agendaId}`)
  return { ok: true }
}

export async function deleteItemAction(id: string) {
  const item = await prisma.agendaItem.delete({ where: { id } })
  await prisma.$executeRaw`
    UPDATE "AgendaItem" SET position = position - 1
    WHERE "agendaId" = ${item.agendaId} AND position > ${item.position}
  `
  revalidatePath(`/agendas/${item.agendaId}`)
}

export async function reorderItemsAction(agendaId: string, orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, idx) =>
      prisma.agendaItem.update({ where: { id }, data: { position: idx } }),
    ),
  )
  revalidatePath(`/agendas/${agendaId}`)
}

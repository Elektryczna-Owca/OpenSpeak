'use server'

import { prisma } from '@/lib/prisma'
import {
  checkOrdering,
  checkSubItem,
  optionalLabel,
  optionalMinutes,
  requiredMinutes,
} from '@/lib/item-times'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const ItemSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200),
    url: z
      .string()
      .trim()
      .max(2000, 'URL is too long')
      .transform(v => (v === '' ? null : v))
      .nullable()
      .optional()
      .refine(
        v => v == null || URL.canParse(v),
        'Enter a valid URL (including https://)',
      ),
    description: z
      .string()
      .trim()
      .max(2000, 'Description is too long (max 2000 characters)')
      .transform(v => (v === '' ? null : v))
      .nullable()
      .optional(),
    durationMinutes: requiredMinutes,
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
    specialItemId: z
      .string()
      .transform(v => (v === '' ? null : v))
      .nullable()
      .optional(),
    specialValue: z.preprocess(
      v => (v === '' || v === null || v === undefined ? null : v),
      z.string().max(200).nullable(),
    ),
  })
  .superRefine((data, ctx) => {
    if (data.specialItemId && data.specialValue == null) {
      ctx.addIssue({ code: 'custom', path: ['specialValue'], message: 'Pick a value' })
    }
    checkOrdering(
      ctx,
      data.minMinutes,
      data.durationMinutes,
      data.maxMinutes,
      'minMinutes',
      'maxMinutes',
    )
    checkSubItem(ctx, data)
  })

export type ItemFormState = {
  errors?: {
    title?: string[]
    url?: string[]
    description?: string[]
    durationMinutes?: string[]
    minMinutes?: string[]
    maxMinutes?: string[]
    subLabel?: string[]
    subMinMinutes?: string[]
    subExpectedMinutes?: string[]
    subMaxMinutes?: string[]
    specialValue?: string[]
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

// Returns the special item link only if the special item exists; a regular
// item (or a deleted special item) stores neither the id nor the value.
async function resolveSpecial(
  specialItemId: string | null | undefined,
  specialValue: string | null,
): Promise<{ specialItemId: string | null; specialValue: string | null }> {
  if (!specialItemId) return { specialItemId: null, specialValue: null }
  const special = await prisma.specialItem.findUnique({
    where: { id: specialItemId },
    select: { id: true },
  })
  return special
    ? { specialItemId: special.id, specialValue }
    : { specialItemId: null, specialValue: null }
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
    url: formData.get('url'),
    description: formData.get('description') ?? undefined,
    durationMinutes: formData.get('durationMinutes'),
    minMinutes: formData.get('minMinutes'),
    maxMinutes: formData.get('maxMinutes'),
    personId: formData.get('personId'),
    subLabel: formData.get('subLabel'),
    subMinMinutes: formData.get('subMinMinutes'),
    subExpectedMinutes: formData.get('subExpectedMinutes'),
    subMaxMinutes: formData.get('subMaxMinutes'),
    specialItemId: formData.get('specialItemId'),
    specialValue: formData.get('specialValue'),
  })
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors }
  }
  const { personId, specialItemId, specialValue, ...data } = parsed.data
  const count = await prisma.agendaItem.count({ where: { agendaId } })
  await prisma.agendaItem.create({
    data: {
      ...normalizeSub(data),
      ...(await resolveSpecial(specialItemId, specialValue)),
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
    url: formData.get('url'),
    description: formData.get('description') ?? undefined,
    durationMinutes: formData.get('durationMinutes'),
    minMinutes: formData.get('minMinutes'),
    maxMinutes: formData.get('maxMinutes'),
    personId: formData.get('personId'),
    subLabel: formData.get('subLabel'),
    subMinMinutes: formData.get('subMinMinutes'),
    subExpectedMinutes: formData.get('subExpectedMinutes'),
    subMaxMinutes: formData.get('subMaxMinutes'),
    specialItemId: formData.get('specialItemId'),
    specialValue: formData.get('specialValue'),
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
  const { personId, specialItemId, specialValue, ...data } = parsed.data
  const item = await prisma.agendaItem.update({
    where: { id },
    data: {
      ...normalizeSub(data),
      ...(await resolveSpecial(specialItemId, specialValue)),
      personId: await resolvePersonId(existing.agendaId, personId),
    },
  })
  revalidatePath(`/agendas/${item.agendaId}`)
  return { ok: true }
}

export async function assignItemPersonAction(itemId: string, personId: string) {
  const existing = await prisma.agendaItem.findUnique({
    where: { id: itemId },
    select: { agendaId: true },
  })
  if (!existing) return
  const resolved = await resolvePersonId(existing.agendaId, personId)
  if (!resolved) return
  await prisma.agendaItem.update({
    where: { id: itemId },
    data: { personId: resolved },
  })
  revalidatePath(`/agendas/${existing.agendaId}`)
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

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
    checkSubItem(ctx, data)
  })

export type ItemFormState = {
  errors?: {
    title?: string[]
    url?: string[]
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
    url: formData.get('url'),
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
    url: formData.get('url'),
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

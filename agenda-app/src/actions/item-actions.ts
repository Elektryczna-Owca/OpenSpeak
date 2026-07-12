'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const ItemSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  durationMinutes: z.coerce.number().int().min(1).max(600),
  personId: z
    .string()
    .transform(v => (v === '' ? null : v))
    .nullable()
    .optional(),
})

export type ItemFormState = {
  errors?: { title?: string[]; durationMinutes?: string[]; _form?: string[] }
  ok?: boolean
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
    personId: formData.get('personId'),
  })
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors }
  }
  const { personId, ...data } = parsed.data
  const count = await prisma.agendaItem.count({ where: { agendaId } })
  await prisma.agendaItem.create({
    data: {
      ...data,
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
    personId: formData.get('personId'),
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
    data: { ...data, personId: await resolvePersonId(existing.agendaId, personId) },
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

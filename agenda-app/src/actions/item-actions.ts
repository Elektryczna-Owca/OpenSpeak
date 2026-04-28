'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const ItemSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  durationMinutes: z.coerce.number().int().min(1).max(600),
})

export type ItemFormState = {
  errors?: { title?: string[]; durationMinutes?: string[]; _form?: string[] }
  ok?: boolean
}

export async function addItemAction(
  agendaId: string,
  _prev: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  const parsed = ItemSchema.safeParse({
    title: formData.get('title'),
    durationMinutes: formData.get('durationMinutes'),
  })
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors }
  }
  const count = await prisma.agendaItem.count({ where: { agendaId } })
  await prisma.agendaItem.create({
    data: { ...parsed.data, agendaId, position: count },
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
  })
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors }
  }
  const item = await prisma.agendaItem.update({ where: { id }, data: parsed.data })
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

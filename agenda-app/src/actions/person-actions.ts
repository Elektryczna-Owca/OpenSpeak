'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const PersonSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
})

export type PersonFormState = {
  errors?: { name?: string[]; _form?: string[] }
  ok?: boolean
}

function revalidateAgenda(agendaId: string) {
  revalidatePath(`/agendas/${agendaId}/people`)
  revalidatePath(`/agendas/${agendaId}`)
}

export async function createPersonAction(
  agendaId: string,
  _prev: PersonFormState,
  formData: FormData,
): Promise<PersonFormState> {
  const parsed = PersonSchema.safeParse({ name: formData.get('name') })
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors }
  }
  await prisma.person.create({ data: { ...parsed.data, agendaId } })
  revalidateAgenda(agendaId)
  return { ok: true }
}

export async function updatePersonAction(
  id: string,
  _prev: PersonFormState,
  formData: FormData,
): Promise<PersonFormState> {
  const parsed = PersonSchema.safeParse({ name: formData.get('name') })
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors }
  }
  const person = await prisma.person.update({ where: { id }, data: parsed.data })
  revalidateAgenda(person.agendaId)
  return { ok: true }
}

export async function deletePersonAction(id: string) {
  const person = await prisma.person.delete({ where: { id } })
  revalidateAgenda(person.agendaId)
}

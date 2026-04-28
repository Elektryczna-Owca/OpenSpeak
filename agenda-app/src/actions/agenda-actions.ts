'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const AgendaSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
})

export type AgendaFormState = {
  errors?: { title?: string[]; description?: string[]; _form?: string[] }
}

export async function createAgendaAction(
  _prev: AgendaFormState,
  formData: FormData,
): Promise<AgendaFormState> {
  const parsed = AgendaSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') || undefined,
  })
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors }
  }
  const agenda = await prisma.agenda.create({ data: parsed.data })
  redirect(`/agendas/${agenda.id}`)
}

export async function updateAgendaAction(
  id: string,
  _prev: AgendaFormState,
  formData: FormData,
): Promise<AgendaFormState> {
  const parsed = AgendaSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') || undefined,
  })
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors }
  }
  await prisma.agenda.update({ where: { id }, data: parsed.data })
  revalidatePath(`/agendas/${id}`)
  return {}
}

export async function deleteAgendaAction(id: string) {
  await prisma.agenda.delete({ where: { id } })
  revalidatePath('/agendas')
  redirect('/agendas')
}

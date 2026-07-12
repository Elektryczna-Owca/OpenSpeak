'use server'

import { prisma } from '@/lib/prisma'
import { zonedWallTimeToUtc } from '@/lib/datetime'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const AgendaSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().max(1000).optional(),
    startAt: z.string().optional(),
    timezone: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startAt && !data.timezone) {
      ctx.addIssue({
        code: 'custom',
        path: ['timezone'],
        message: 'Pick a timezone for the start time',
      })
    }
  })

export type AgendaFormState = {
  errors?: {
    title?: string[]
    description?: string[]
    startAt?: string[]
    timezone?: string[]
    _form?: string[]
  }
}

// Resolves the schedule fields into DB values: a UTC instant + timezone, or nulls.
function resolveSchedule(startAt?: string, timezone?: string) {
  if (!startAt || !timezone) return { startAt: null, timezone: null }
  return { startAt: zonedWallTimeToUtc(startAt, timezone), timezone }
}

export async function createAgendaAction(
  _prev: AgendaFormState,
  formData: FormData,
): Promise<AgendaFormState> {
  const parsed = AgendaSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') || undefined,
    startAt: formData.get('startAt') || undefined,
    timezone: formData.get('timezone') || undefined,
  })
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors }
  }
  const { title, description, startAt, timezone } = parsed.data
  const agenda = await prisma.agenda.create({
    data: { title, description, ...resolveSchedule(startAt, timezone) },
  })
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
    startAt: formData.get('startAt') || undefined,
    timezone: formData.get('timezone') || undefined,
  })
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors }
  }
  const { title, description, startAt, timezone } = parsed.data
  await prisma.agenda.update({
    where: { id },
    data: { title, description, ...resolveSchedule(startAt, timezone) },
  })
  revalidatePath(`/agendas/${id}`)
  revalidatePath('/agendas')
  return {}
}

export async function deleteAgendaAction(id: string) {
  await prisma.agenda.delete({ where: { id } })
  revalidatePath('/agendas')
  redirect('/agendas')
}

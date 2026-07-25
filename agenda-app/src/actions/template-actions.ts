'use server'

import { prisma } from '@/lib/prisma'
import { parseAgendaCsv } from '@/lib/agenda-csv'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const NameSchema = z.string().min(1, 'Name is required').max(200)

export type TemplateFormState = {
  errors?: { name?: string[]; csv?: string[]; _form?: string[] }
  ok?: boolean
}

function validate(formData: FormData): {
  data?: { name: string; csv: string }
  errors?: TemplateFormState['errors']
} {
  const name = NameSchema.safeParse(formData.get('name'))
  const csv = String(formData.get('csv') ?? '')
  const parsed = parseAgendaCsv(csv)
  const errors: TemplateFormState['errors'] = {}
  if (!name.success) errors.name = name.error.issues.map(i => i.message)
  if (parsed.errors.length > 0) errors.csv = parsed.errors
  if (errors.name || errors.csv) return { errors }
  return { data: { name: name.data!, csv } }
}

export async function createTemplateAction(
  _prev: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  const { data, errors } = validate(formData)
  if (!data) return { errors }
  await prisma.template.create({ data })
  revalidatePath('/templates')
  redirect('/templates')
}

export async function updateTemplateAction(
  id: string,
  _prev: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  const { data, errors } = validate(formData)
  if (!data) return { errors }
  await prisma.template.update({ where: { id }, data })
  revalidatePath('/templates')
  revalidatePath(`/templates/${id}`)
  return { ok: true }
}

export async function deleteTemplateAction(id: string) {
  await prisma.template.delete({ where: { id } })
  revalidatePath('/templates')
}

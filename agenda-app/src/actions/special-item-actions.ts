'use server'

import { prisma } from '@/lib/prisma'
import { parseSpecialItemCsv } from '@/lib/special-item-csv'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const NameSchema = z.string().min(1, 'Name is required').max(200)

export type SpecialItemFormState = {
  errors?: { name?: string[]; csv?: string[]; _form?: string[] }
  ok?: boolean
}

function validate(formData: FormData): {
  data?: { name: string; csv: string }
  errors?: SpecialItemFormState['errors']
} {
  const name = NameSchema.safeParse(formData.get('name'))
  const csv = String(formData.get('csv') ?? '')
  const parsed = parseSpecialItemCsv(csv)
  const errors: SpecialItemFormState['errors'] = {}
  if (!name.success) errors.name = name.error.issues.map(i => i.message)
  if (parsed.errors.length > 0) errors.csv = parsed.errors
  if (errors.name || errors.csv) return { errors }
  return { data: { name: name.data!, csv } }
}

export async function createSpecialItemAction(
  _prev: SpecialItemFormState,
  formData: FormData,
): Promise<SpecialItemFormState> {
  const { data, errors } = validate(formData)
  if (!data) return { errors }
  await prisma.specialItem.create({ data })
  revalidatePath('/special-items')
  redirect('/special-items')
}

export async function updateSpecialItemAction(
  id: string,
  _prev: SpecialItemFormState,
  formData: FormData,
): Promise<SpecialItemFormState> {
  const { data, errors } = validate(formData)
  if (!data) return { errors }
  await prisma.specialItem.update({ where: { id }, data })
  revalidatePath('/special-items')
  revalidatePath(`/special-items/${id}`)
  return { ok: true }
}

// Agenda items picked from this list keep their title, times and value label;
// only the link to the list is cleared (onDelete: SetNull).
export async function deleteSpecialItemAction(id: string) {
  await prisma.specialItem.delete({ where: { id } })
  revalidatePath('/special-items')
}

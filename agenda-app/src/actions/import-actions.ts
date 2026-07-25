'use server'

import { prisma } from '@/lib/prisma'
import { parseAgendaCsv } from '@/lib/agenda-csv'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const TitleSchema = z.string().min(1, 'Title is required').max(200)

export type ImportFormState = {
  errors?: { title?: string[]; csv?: string[]; _form?: string[] }
}

export async function importAgendaAction(
  _prev: ImportFormState,
  formData: FormData,
): Promise<ImportFormState> {
  const title = TitleSchema.safeParse(formData.get('title'))
  const parsed = parseAgendaCsv(String(formData.get('csv') ?? ''))

  const errors: ImportFormState['errors'] = {}
  if (!title.success) errors.title = title.error.issues.map(i => i.message)
  if (parsed.errors.length > 0) errors.csv = parsed.errors
  if (errors.title || errors.csv) return { errors }

  // Distinct person names become the new agenda's roster, assigned by name.
  const personNames = [
    ...new Set(parsed.items.map(i => i.personName).filter((n): n is string => !!n)),
  ]

  const agendaId = await prisma.$transaction(async tx => {
    const agenda = await tx.agenda.create({ data: { title: title.data! } })
    const personIdByName = new Map<string, string>()
    for (const name of personNames) {
      const person = await tx.person.create({
        data: { agendaId: agenda.id, name },
      })
      personIdByName.set(name, person.id)
    }
    await tx.agendaItem.createMany({
      data: parsed.items.map(({ personName, ...item }, index) => ({
        ...item,
        agendaId: agenda.id,
        position: index,
        personId: personName ? (personIdByName.get(personName) ?? null) : null,
      })),
    })
    return agenda.id
  })

  redirect(`/agendas/${agendaId}`)
}

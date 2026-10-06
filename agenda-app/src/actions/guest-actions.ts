'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { GUEST_CONTACT_MAX, GUEST_NAME_MAX } from '@/lib/person-label'

// Phone or email: either something@something.tld, or 6+ phone-like characters.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^\+?[\d\s().-]{6,}$/

const GuestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(GUEST_NAME_MAX, `Name can be at most ${GUEST_NAME_MAX} characters`),
  contact: z
    .string()
    .trim()
    .min(1, 'Phone or email is required')
    .max(GUEST_CONTACT_MAX)
    .refine(v => EMAIL.test(v) || PHONE.test(v), 'Enter a valid phone number or email'),
})

export type GuestFormState = {
  errors?: { name?: string[]; contact?: string[]; _form?: string[] }
  ok?: boolean
}

// Public (unauthenticated) registration from the guest QR code. Only works
// while a meeting is running; the guest joins the agenda's participants.
export async function registerGuestAction(
  agendaId: string,
  _prev: GuestFormState,
  formData: FormData,
): Promise<GuestFormState> {
  const parsed = GuestSchema.safeParse({
    name: formData.get('name'),
    contact: formData.get('contact'),
  })
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors }
  }

  const run = await prisma.meetingRun.findFirst({
    where: { agendaId, endedAt: null },
    select: { id: true },
  })
  if (!run) {
    return { errors: { _form: ['There is no meeting running right now.'] } }
  }

  await prisma.person.create({
    data: { agendaId, isGuest: true, ...parsed.data },
  })
  revalidatePath(`/agendas/${agendaId}/people`)
  revalidatePath(`/agendas/${agendaId}`)
  return { ok: true }
}

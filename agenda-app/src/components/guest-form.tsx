'use client'

import { useActionState } from 'react'
import { registerGuestAction, type GuestFormState } from '@/actions/guest-actions'
import { GUEST_CONTACT_MAX, GUEST_NAME_MAX } from '@/lib/person-label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2 } from 'lucide-react'

export function GuestForm({ agendaId }: { agendaId: string }) {
  const [state, formAction, pending] = useActionState<GuestFormState, FormData>(
    registerGuestAction.bind(null, agendaId),
    {},
  )

  if (state.ok) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border bg-card p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-green-600" />
        <p className="text-lg font-medium">You&apos;re registered</p>
        <p className="text-sm text-muted-foreground">
          Welcome! You&apos;ve been added to the meeting as a guest.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4 rounded-lg border bg-card p-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Your name</Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={GUEST_NAME_MAX}
          autoComplete="name"
          aria-invalid={!!state.errors?.name}
        />
        {state.errors?.name && (
          <p className="text-sm text-destructive">{state.errors.name[0]}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contact">Phone or email</Label>
        <Input
          id="contact"
          name="contact"
          required
          maxLength={GUEST_CONTACT_MAX}
          autoComplete="email"
          aria-invalid={!!state.errors?.contact}
        />
        {state.errors?.contact && (
          <p className="text-sm text-destructive">{state.errors.contact[0]}</p>
        )}
      </div>
      {state.errors?._form && (
        <p className="text-sm text-destructive">{state.errors._form[0]}</p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        Register as guest
      </Button>
    </form>
  )
}

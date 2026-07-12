'use client'

import { useActionState, useEffect, useRef } from 'react'
import { createPersonAction, type PersonFormState } from '@/actions/person-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'

export function AddPersonForm({ agendaId }: { agendaId: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const action = createPersonAction.bind(null, agendaId)
  const [state, formAction, pending] = useActionState<PersonFormState, FormData>(
    action,
    {},
  )

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset()
      nameRef.current?.focus()
    }
  }, [state])

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-lg border bg-card p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="name">New participant</Label>
          <Input
            id="name"
            name="name"
            ref={nameRef}
            placeholder="e.g. Jane Doe"
            required
            maxLength={100}
            aria-invalid={!!state.errors?.name}
          />
          {state.errors?.name && (
            <p className="text-sm text-destructive">{state.errors.name[0]}</p>
          )}
        </div>
        <Button type="submit" disabled={pending}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
    </form>
  )
}

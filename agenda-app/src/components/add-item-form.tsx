'use client'

import { useActionState, useEffect, useRef } from 'react'
import { addItemAction, type ItemFormState } from '@/actions/item-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PersonSelect } from '@/components/person-select'
import { Plus } from 'lucide-react'
import type { Person } from '@/generated/prisma/client'

export function AddItemForm({
  agendaId,
  people,
}: {
  agendaId: string
  people: Person[]
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const action = addItemAction.bind(null, agendaId)
  const [state, formAction, pending] = useActionState<ItemFormState, FormData>(
    action,
    {},
  )

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset()
      titleRef.current?.focus()
    }
  }, [state])

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-lg border bg-card p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex-1 space-y-1.5 sm:min-w-48">
          <Label htmlFor="title">New item</Label>
          <Input
            id="title"
            name="title"
            ref={titleRef}
            placeholder="e.g. Project status update"
            required
            maxLength={200}
            aria-invalid={!!state.errors?.title}
          />
          {state.errors?.title && (
            <p className="text-sm text-destructive">{state.errors.title[0]}</p>
          )}
        </div>
        <div className="space-y-1.5 sm:w-20">
          <Label htmlFor="minMinutes">Min</Label>
          <Input
            id="minMinutes"
            name="minMinutes"
            type="number"
            min={0.5}
            max={600}
            step={0.5}
            placeholder="—"
            aria-invalid={!!state.errors?.minMinutes}
          />
        </div>
        <div className="space-y-1.5 sm:w-24">
          <Label htmlFor="durationMinutes">Expected</Label>
          <Input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min={0.5}
            max={600}
            step={0.5}
            defaultValue={10}
            required
            aria-invalid={!!state.errors?.durationMinutes}
          />
        </div>
        <div className="space-y-1.5 sm:w-20">
          <Label htmlFor="maxMinutes">Max</Label>
          <Input
            id="maxMinutes"
            name="maxMinutes"
            type="number"
            min={0.5}
            max={600}
            step={0.5}
            placeholder="—"
            aria-invalid={!!state.errors?.maxMinutes}
          />
        </div>
        {people.length > 0 && (
          <PersonSelect id="personId" people={people} className="sm:w-40" />
        )}
        <Button type="submit" disabled={pending}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
      {(state.errors?.durationMinutes ||
        state.errors?.minMinutes ||
        state.errors?.maxMinutes) && (
        <p className="mt-2 text-sm text-destructive">
          {state.errors.durationMinutes?.[0] ??
            state.errors.minMinutes?.[0] ??
            state.errors.maxMinutes?.[0]}
        </p>
      )}
    </form>
  )
}

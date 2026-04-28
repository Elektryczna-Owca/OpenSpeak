'use client'

import { useActionState, useEffect, useRef } from 'react'
import { addItemAction, type ItemFormState } from '@/actions/item-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'

export function AddItemForm({ agendaId }: { agendaId: string }) {
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
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
        <div className="space-y-1.5 sm:w-32">
          <Label htmlFor="durationMinutes">Duration (min)</Label>
          <Input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min={1}
            max={600}
            defaultValue={10}
            required
            aria-invalid={!!state.errors?.durationMinutes}
          />
          {state.errors?.durationMinutes && (
            <p className="text-sm text-destructive">
              {state.errors.durationMinutes[0]}
            </p>
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

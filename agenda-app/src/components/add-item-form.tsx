'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { addItemAction, type ItemFormState } from '@/actions/item-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PersonSelect } from '@/components/person-select'
import { SpecialItemPicker } from '@/components/special-item-picker'
import type { SpecialItemOption } from '@/lib/special-item-csv'
import { Plus } from 'lucide-react'
import type { Person } from '@/generated/prisma/client'

export function AddItemForm({
  agendaId,
  people,
  specialItems,
}: {
  agendaId: string
  people: Person[]
  specialItems: SpecialItemOption[]
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const action = addItemAction.bind(null, agendaId)
  const [state, formAction, pending] = useActionState<ItemFormState, FormData>(
    action,
    {},
  )
  // The picker remounts after each add (clearing its value) but keeps the
  // chosen type, so several items of one kind can be added in a row.
  const [specialTypeId, setSpecialTypeId] = useState('')
  const [pickerKey, setPickerKey] = useState(0)

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset()
      setPickerKey(k => k + 1)
      titleRef.current?.focus()
    }
  }, [state])

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-lg border bg-card p-4"
    >
      {specialItems.length > 0 && (
        <SpecialItemPicker
          key={pickerKey}
          idPrefix="new"
          specialItems={specialItems}
          defaultSpecialItemId={specialTypeId}
          onTypeChange={setSpecialTypeId}
          error={state.errors?.specialValue?.[0]}
          className="mb-3"
        />
      )}
      {/* Filled in by the special item picker; editable later in the item dialog. */}
      <input type="text" name="description" hidden readOnly />
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

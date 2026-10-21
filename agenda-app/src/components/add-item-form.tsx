'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { addItemAction, type ItemFormState } from '@/actions/item-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TimeInputs } from '@/components/time-inputs'
import { ITEM_TIME_FIELDS } from '@/lib/item-times'
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
        {people.length > 0 && (
          <PersonSelect id="personId" people={people} className="sm:w-40" />
        )}
        <Button type="submit" disabled={pending}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
      <div className="mt-3 sm:max-w-md">
        <TimeInputs
          idPrefix="add"
          fields={ITEM_TIME_FIELDS}
          defaults={{ min: null, green: null, yellow: null, red: 10, max: null }}
          errors={state.errors}
        />
      </div>
    </form>
  )
}

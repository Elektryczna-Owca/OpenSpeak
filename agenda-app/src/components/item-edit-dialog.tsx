'use client'

import { useActionState, useEffect } from 'react'
import { updateItemAction, type ItemFormState } from '@/actions/item-actions'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TimeInputs } from '@/components/time-inputs'
import { ITEM_TIME_FIELDS, SUB_TIME_FIELDS, itemTimes, subTimes } from '@/lib/item-times'
import { PersonSelect } from '@/components/person-select'
import { SpecialItemPicker } from '@/components/special-item-picker'
import type { SpecialItemOption } from '@/lib/special-item-csv'
import type { AgendaItem, Person } from '@/generated/prisma/client'

export function ItemEditDialog({
  item,
  people,
  specialItems,
  open,
  onOpenChange,
}: {
  item: AgendaItem
  people: Person[]
  specialItems: SpecialItemOption[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const action = updateItemAction.bind(null, item.id)
  const [state, formAction, pending] = useActionState<ItemFormState, FormData>(
    action,
    {},
  )

  useEffect(() => {
    if (state.ok) onOpenChange(false)
  }, [state, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit item</DialogTitle>
          <DialogDescription>
            Update the title, times, or assignee for this agenda item.
          </DialogDescription>
        </DialogHeader>
        {/*
          Key the form on the item's updatedAt so it remounts with fresh
          defaults after a save (revalidation feeds new item values back in).
          This sits below useActionState, so the component-level `state` that
          auto-closes the dialog is preserved — avoiding Base UI's
          "uncontrolled default value changed after init" warning.
        */}
        <form
          key={item.updatedAt.toISOString()}
          action={formAction}
          className="space-y-4"
        >
          {specialItems.length > 0 && (
            <SpecialItemPicker
              idPrefix={item.id}
              specialItems={specialItems}
              defaultSpecialItemId={item.specialItemId}
              defaultValue={item.specialValue}
              error={state.errors?.specialValue?.[0]}
            />
          )}
          <div className="space-y-1.5">
            <Label htmlFor={`title-${item.id}`}>Title</Label>
            <Input
              id={`title-${item.id}`}
              name="title"
              defaultValue={item.title}
              required
              maxLength={200}
              aria-invalid={!!state.errors?.title}
            />
            {state.errors?.title && (
              <p className="text-sm text-destructive">{state.errors.title[0]}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`url-${item.id}`}>
              URL{' '}
              <span className="font-normal text-muted-foreground">
                (optional, shown as a QR code during the meeting)
              </span>
            </Label>
            <Input
              id={`url-${item.id}`}
              name="url"
              type="url"
              placeholder="https://…"
              maxLength={2000}
              defaultValue={item.url ?? ''}
              aria-invalid={!!state.errors?.url}
            />
            {state.errors?.url && (
              <p className="text-sm text-destructive">{state.errors.url[0]}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`description-${item.id}`}>
              Description{' '}
              <span className="font-normal text-muted-foreground">
                (optional, shown on the display during the meeting)
              </span>
            </Label>
            <Textarea
              id={`description-${item.id}`}
              name="description"
              rows={3}
              maxLength={2000}
              defaultValue={item.description ?? ''}
              aria-invalid={!!state.errors?.description}
            />
            {state.errors?.description && (
              <p className="text-sm text-destructive">{state.errors.description[0]}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <TimeInputs
              idPrefix={`time-${item.id}`}
              fields={ITEM_TIME_FIELDS}
              defaults={itemTimes(item)}
              errors={state.errors}
            />
          </div>
          {people.length > 0 && (
            <PersonSelect
              id={`personId-${item.id}`}
              people={people}
              defaultValue={item.personId}
            />
          )}
          <fieldset className="space-y-3 rounded-lg border p-3">
            <legend className="px-1 text-sm font-medium">
              Sub-item{' '}
              <span className="font-normal text-muted-foreground">
                (optional, e.g. per participant)
              </span>
            </legend>
            <div className="space-y-1.5">
              <Label htmlFor={`subLabel-${item.id}`}>Label</Label>
              <Input
                id={`subLabel-${item.id}`}
                name="subLabel"
                placeholder="e.g. Participant"
                maxLength={100}
                defaultValue={item.subLabel ?? ''}
                aria-invalid={!!state.errors?.subLabel}
              />
            </div>
            <TimeInputs
              idPrefix={`subtime-${item.id}`}
              fields={SUB_TIME_FIELDS}
              defaults={subTimes(item)}
              errors={state.errors}
            />
            {state.errors?.subLabel && (
              <p className="text-sm text-destructive">{state.errors.subLabel[0]}</p>
            )}
          </fieldset>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

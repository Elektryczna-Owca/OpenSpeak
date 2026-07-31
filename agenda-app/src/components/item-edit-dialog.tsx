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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PersonSelect } from '@/components/person-select'
import type { AgendaItem, Person } from '@/generated/prisma/client'

export function ItemEditDialog({
  item,
  people,
  open,
  onOpenChange,
}: {
  item: AgendaItem
  people: Person[]
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
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`min-${item.id}`}>Min (min)</Label>
                <Input
                  id={`min-${item.id}`}
                  name="minMinutes"
                  type="number"
                  min={0.5}
                  max={600}
                  step={0.5}
                  placeholder="—"
                  defaultValue={item.minMinutes ?? ''}
                  aria-invalid={!!state.errors?.minMinutes}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`duration-${item.id}`}>Expected (min)</Label>
                <Input
                  id={`duration-${item.id}`}
                  name="durationMinutes"
                  type="number"
                  min={0.5}
                  max={600}
                  step={0.5}
                  defaultValue={item.durationMinutes}
                  required
                  aria-invalid={!!state.errors?.durationMinutes}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`max-${item.id}`}>Max (min)</Label>
                <Input
                  id={`max-${item.id}`}
                  name="maxMinutes"
                  type="number"
                  min={0.5}
                  max={600}
                  step={0.5}
                  placeholder="—"
                  defaultValue={item.maxMinutes ?? ''}
                  aria-invalid={!!state.errors?.maxMinutes}
                />
              </div>
            </div>
            {(state.errors?.durationMinutes ||
              state.errors?.minMinutes ||
              state.errors?.maxMinutes) && (
              <p className="text-sm text-destructive">
                {state.errors.durationMinutes?.[0] ??
                  state.errors.minMinutes?.[0] ??
                  state.errors.maxMinutes?.[0]}
              </p>
            )}
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
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`subMin-${item.id}`}>Min (min)</Label>
                <Input
                  id={`subMin-${item.id}`}
                  name="subMinMinutes"
                  type="number"
                  min={0.5}
                  max={600}
                  step={0.5}
                  placeholder="—"
                  defaultValue={item.subMinMinutes ?? ''}
                  aria-invalid={!!state.errors?.subMinMinutes}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`subExpected-${item.id}`}>Expected (min)</Label>
                <Input
                  id={`subExpected-${item.id}`}
                  name="subExpectedMinutes"
                  type="number"
                  min={0.5}
                  max={600}
                  step={0.5}
                  placeholder="—"
                  defaultValue={item.subExpectedMinutes ?? ''}
                  aria-invalid={!!state.errors?.subExpectedMinutes}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`subMax-${item.id}`}>Max (min)</Label>
                <Input
                  id={`subMax-${item.id}`}
                  name="subMaxMinutes"
                  type="number"
                  min={0.5}
                  max={600}
                  step={0.5}
                  placeholder="—"
                  defaultValue={item.subMaxMinutes ?? ''}
                  aria-invalid={!!state.errors?.subMaxMinutes}
                />
              </div>
            </div>
            {(state.errors?.subExpectedMinutes ||
              state.errors?.subMinMinutes ||
              state.errors?.subMaxMinutes ||
              state.errors?.subLabel) && (
              <p className="text-sm text-destructive">
                {state.errors.subExpectedMinutes?.[0] ??
                  state.errors.subMinMinutes?.[0] ??
                  state.errors.subMaxMinutes?.[0] ??
                  state.errors.subLabel?.[0]}
              </p>
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

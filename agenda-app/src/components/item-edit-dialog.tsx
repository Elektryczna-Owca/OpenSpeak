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
import type { AgendaItem } from '@/generated/prisma/client'

export function ItemEditDialog({
  item,
  open,
  onOpenChange,
}: {
  item: AgendaItem
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
            Update the title or duration for this agenda item.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
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
            <Label htmlFor={`duration-${item.id}`}>Duration (minutes)</Label>
            <Input
              id={`duration-${item.id}`}
              name="durationMinutes"
              type="number"
              min={1}
              max={600}
              defaultValue={item.durationMinutes}
              required
              aria-invalid={!!state.errors?.durationMinutes}
            />
            {state.errors?.durationMinutes && (
              <p className="text-sm text-destructive">
                {state.errors.durationMinutes[0]}
              </p>
            )}
          </div>
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

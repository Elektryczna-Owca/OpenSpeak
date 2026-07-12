'use client'

import { useActionState, useEffect } from 'react'
import { updatePersonAction, type PersonFormState } from '@/actions/person-actions'
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
import type { Person } from '@/generated/prisma/client'

export function PersonEditDialog({
  person,
  open,
  onOpenChange,
}: {
  person: Person
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const action = updatePersonAction.bind(null, person.id)
  const [state, formAction, pending] = useActionState<PersonFormState, FormData>(
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
          <DialogTitle>Edit participant</DialogTitle>
          <DialogDescription>Update this participant&apos;s name.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`name-${person.id}`}>Name</Label>
            <Input
              id={`name-${person.id}`}
              name="name"
              defaultValue={person.name}
              required
              maxLength={100}
              aria-invalid={!!state.errors?.name}
            />
            {state.errors?.name && (
              <p className="text-sm text-destructive">{state.errors.name[0]}</p>
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

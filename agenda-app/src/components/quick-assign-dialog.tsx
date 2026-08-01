'use client'

import { useTransition } from 'react'
import { assignItemPersonAction } from '@/actions/item-actions'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { AgendaItem, Person } from '@/generated/prisma/client'

export function QuickAssignDialog({
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
  const [pending, startTransition] = useTransition()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign participant</DialogTitle>
          <DialogDescription>
            Pick who takes &ldquo;{item.title}&rdquo;.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1">
          {people.map(person => (
            <Button
              key={person.id}
              variant="ghost"
              className="justify-start"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await assignItemPersonAction(item.id, person.id)
                  onOpenChange(false)
                })
              }
            >
              {person.name}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

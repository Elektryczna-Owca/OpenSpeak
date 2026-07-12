'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { User, Pencil, Trash2 } from 'lucide-react'
import { deletePersonAction } from '@/actions/person-actions'
import { PersonEditDialog } from './person-edit-dialog'
import type { Person } from '@/generated/prisma/client'

export function PersonCard({ person }: { person: Person }) {
  const [editOpen, setEditOpen] = useState(false)
  const [, startTransition] = useTransition()

  return (
    <>
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <User className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{person.name}</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEditOpen(true)}
            aria-label="Edit participant"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (
                confirm(
                  `Delete "${person.name}"? Their agenda items will become unassigned.`,
                )
              ) {
                startTransition(() => {
                  deletePersonAction(person.id)
                })
              }
            }}
            aria-label="Delete participant"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
      <PersonEditDialog
        person={person}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  )
}

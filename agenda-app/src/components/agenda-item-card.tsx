'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GripVertical, Clock, Pencil, Trash2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { deleteItemAction } from '@/actions/item-actions'
import { ItemEditDialog } from './item-edit-dialog'
import type { AgendaItem } from '@/generated/prisma/client'

export function AgendaItemCard({ item }: { item: AgendaItem }) {
  const [editOpen, setEditOpen] = useState(false)
  const [, startTransition] = useTransition()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <>
      <Card ref={setNodeRef} style={style} className="touch-none">
        <CardContent className="flex items-center gap-3 p-4">
          <button
            type="button"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
            className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
          >
            <GripVertical className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{item.title}</h3>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground whitespace-nowrap">
            <Clock className="h-4 w-4" />
            {item.durationMinutes} min
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEditOpen(true)}
            aria-label="Edit item"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm(`Delete "${item.title}"?`)) {
                startTransition(() => {
                  deleteItemAction(item.id)
                })
              }
            }}
            aria-label="Delete item"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
      <ItemEditDialog item={item} open={editOpen} onOpenChange={setEditOpen} />
    </>
  )
}

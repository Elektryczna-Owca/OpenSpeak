'use client'

import { useState, useTransition } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { reorderItemsAction } from '@/actions/item-actions'
import { AgendaItemCard } from './agenda-item-card'
import type { AgendaItem } from '@/generated/prisma/client'

export function AgendaBoard({
  agendaId,
  initialItems,
}: {
  agendaId: string
  initialItems: AgendaItem[]
}) {
  const [items, setItems] = useState(initialItems)
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex(i => i.id === active.id)
    const newIndex = items.findIndex(i => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const newItems = arrayMove(items, oldIndex, newIndex)
    setItems(newItems)
    startTransition(() => {
      reorderItemsAction(agendaId, newItems.map(i => i.id))
    })
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center">
        <p className="text-muted-foreground">
          No items yet. Add your first agenda item below.
        </p>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map(i => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-3">
          {items.map(item => (
            <AgendaItemCard key={item.id} item={item} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

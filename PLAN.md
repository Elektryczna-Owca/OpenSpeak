# Meeting Agenda App — Detailed Plan

## 1. Stack & Project Setup

```
npx create-next-app@latest agenda-app --typescript --tailwind --app --eslint
cd agenda-app
npx shadcn@latest init
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install prisma @prisma/client
npm install zod react-hook-form @hookform/resolvers
npx shadcn@latest add button input card dialog form label textarea sonner
```

**Why each piece:**
- `@dnd-kit/sortable` gives you the vertical-list reorder primitive
- `zod` + `react-hook-form` for typed form validation (shadcn's form integration uses them)
- `sonner` for toast notifications on save/error

## 2. Project Structure

```
agenda-app/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                 # landing → redirects to /agendas
│   │   ├── agendas/
│   │   │   ├── page.tsx             # list all agendas
│   │   │   ├── new/
│   │   │   │   └── page.tsx         # create new agenda
│   │   │   └── [id]/
│   │   │       └── page.tsx        # view/edit agenda
│   ├── components/
│   │   ├── ui/                      # shadcn components
│   │   ├── agenda-list.tsx
│   │   ├── agenda-board.tsx         # dnd-kit DndContext wrapper
│   │   ├── agenda-item-card.tsx     # individual draggable box
│   │   ├── add-item-form.tsx
│   │   └── item-edit-dialog.tsx
│   ├── lib/
│   │   ├── prisma.ts                # Prisma client singleton
│   │   └── utils.ts
│   ├── actions/
│   │   ├── agenda-actions.ts        # CRUD for Agenda
│   │   └── item-actions.ts          # CRUD + reorder for AgendaItem
│   └── types/
│       └── agenda.ts
├── docker-compose.yml               # local Postgres
├── Dockerfile
├── .env.local
└── package.json
```

## 3. Database Schema (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Agenda {
  id          String       @id @default(cuid())
  title       String
  description String?
  items       AgendaItem[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

model AgendaItem {
  id              String   @id @default(cuid())
  agendaId        String
  agenda          Agenda   @relation(fields: [agendaId], references: [id], onDelete: Cascade)
  title           String
  durationMinutes Int
  position        Int      // 0-based order within the agenda
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([agendaId, position])
}
```

**Ordering choice:** integer `position`. On reorder, update the affected rows in one transaction. Simple and fine for agendas (typically <50 items). If lists ever grow to 1000s, swap to fractional ranks (LexoRank).

## 4. Server Actions (the "backend")

`src/actions/agenda-actions.ts`:
```typescript
'use server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const AgendaSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
})

export async function createAgenda(input: z.infer<typeof AgendaSchema>) {
  const data = AgendaSchema.parse(input)
  const agenda = await prisma.agenda.create({ data })
  redirect(`/agendas/${agenda.id}`)
}

export async function updateAgenda(id: string, input: z.infer<typeof AgendaSchema>) {
  const data = AgendaSchema.parse(input)
  await prisma.agenda.update({ where: { id }, data })
  revalidatePath(`/agendas/${id}`)
}

export async function deleteAgenda(id: string) {
  await prisma.agenda.delete({ where: { id } })
  revalidatePath('/agendas')
  redirect('/agendas')
}
```

`src/actions/item-actions.ts`:
```typescript
'use server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const ItemSchema = z.object({
  title: z.string().min(1).max(200),
  durationMinutes: z.number().int().min(1).max(600),
})

export async function addItem(agendaId: string, input: z.infer<typeof ItemSchema>) {
  const data = ItemSchema.parse(input)
  const count = await prisma.agendaItem.count({ where: { agendaId } })
  await prisma.agendaItem.create({
    data: { ...data, agendaId, position: count },
  })
  revalidatePath(`/agendas/${agendaId}`)
}

export async function updateItem(id: string, input: z.infer<typeof ItemSchema>) {
  const data = ItemSchema.parse(input)
  const item = await prisma.agendaItem.update({ where: { id }, data })
  revalidatePath(`/agendas/${item.agendaId}`)
}

export async function deleteItem(id: string) {
  const item = await prisma.agendaItem.delete({ where: { id } })
  // compact positions
  await prisma.$executeRaw`
    UPDATE "AgendaItem" SET position = position - 1
    WHERE "agendaId" = ${item.agendaId} AND position > ${item.position}
  `
  revalidatePath(`/agendas/${item.agendaId}`)
}

// Called after drag-and-drop completes
export async function reorderItems(agendaId: string, orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, idx) =>
      prisma.agendaItem.update({
        where: { id },
        data: { position: idx },
      })
    )
  )
  revalidatePath(`/agendas/${agendaId}`)
}
```

## 5. Drag & Drop Component (`agenda-board.tsx`)

Core pattern with dnd-kit:

```typescript
'use client'
import { useState, useTransition } from 'react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { reorderItems } from '@/actions/item-actions'
import { AgendaItemCard } from './agenda-item-card'
import type { AgendaItem } from '@prisma/client'

export function AgendaBoard({ agendaId, initialItems }: {
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
    const newItems = arrayMove(items, oldIndex, newIndex)
    setItems(newItems)  // optimistic UI
    startTransition(() => {
      reorderItems(agendaId, newItems.map(i => i.id))
    })
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-3">
          {items.map(item => <AgendaItemCard key={item.id} item={item} />)}
        </div>
      </SortableContext>
    </DndContext>
  )
}
```

`agenda-item-card.tsx` (each draggable box):

```typescript
'use client'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { GripVertical, Clock } from 'lucide-react'

export function AgendaItemCard({ item }: { item: AgendaItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Card ref={setNodeRef} style={style} className="touch-none">
      <CardContent className="flex items-center gap-3 p-4">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="text-muted-foreground" />
        </button>
        <div className="flex-1">
          <h3 className="font-medium">{item.title}</h3>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          {item.durationMinutes} min
        </div>
        {/* edit/delete buttons → open dialog → call updateItem/deleteItem */}
      </CardContent>
    </Card>
  )
}
```

**Key dnd-kit details:**
- Drag handle on `GripVertical` only (not whole card) so click-to-edit still works
- `activationConstraint: { distance: 5 }` prevents drags from triggering on accidental clicks
- `touch-none` Tailwind class enables touch dragging on mobile
- Optimistic UI: update local state first, persist via Server Action in `useTransition`

## 6. Pages

**`/agendas/page.tsx`** (list):
- Server component, fetches `prisma.agenda.findMany({ orderBy: { updatedAt: 'desc' } })`
- Renders cards with title, item count, total duration
- "New Agenda" button → `/agendas/new`

**`/agendas/new/page.tsx`**:
- Client form with title + description inputs
- Submits to `createAgenda` action which redirects to `/agendas/[id]`

**`/agendas/[id]/page.tsx`** (the main editor):
- Server component fetches agenda + items ordered by position
- Renders editable title/description (inline edit)
- Renders `<AgendaBoard>` with items
- Renders `<AddItemForm>` below the list
- Sidebar/header showing total meeting duration (sum of item durations)

## 7. Local Development

`docker-compose.yml`:
```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: agenda
      POSTGRES_PASSWORD: agenda
      POSTGRES_DB: agenda
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
volumes:
  pgdata:
```

`.env.local`:
```
DATABASE_URL="postgresql://agenda:agenda@localhost:5432/agenda"
```

Workflow:
```bash
docker compose up -d
npx prisma migrate dev --name init
npm run dev
```

## 8. Production Deployment (Linux server)

`Dockerfile` — multi-stage build with Next.js standalone output. Add `output: 'standalone'` to `next.config.ts`.

Run on the server with `docker compose`:
- `app` service (Next.js, port 3000)
- `db` service (Postgres with named volume)
- `caddy` service in front for HTTPS — Caddy auto-provisions Let's Encrypt certs from a one-line `Caddyfile`

Alternative: **Coolify** or **Dokploy** on the server — gives you a Vercel-like UI for deploying Docker apps and managing Postgres, all self-hosted.

## 9. Build Order (suggested)

1. Project scaffold + shadcn + Prisma + Postgres running locally
2. Schema + migrations
3. Agenda CRUD (list, create, view, delete) — no items yet
4. Item CRUD inside an agenda (no DnD — just add/edit/delete in fixed order)
5. Wire dnd-kit, add reorder action
6. Polish: total duration, inline title editing, toasts, empty states
7. Dockerize and deploy

## 10. Likely Extensions (not in v1)

- Auth (NextAuth/Auth.js) → add `userId` to `Agenda`
- Sharing / public read-only links
- Item types (discussion / decision / break) with icons
- Presenter field per item
- Export to PDF / calendar invite
- Templates ("standup", "1:1", "retrospective")

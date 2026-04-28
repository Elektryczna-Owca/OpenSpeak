# Meeting Agenda App — Implementation Notes

> Status: implemented in `agenda-app/`. This document describes what was actually built (versions, structure, deviations from the original sketch).

## 1. Stack

| Piece | Version | Notes |
| --- | --- | --- |
| Next.js | 16.2.4 (App Router, Turbopack) | `params` is now `Promise<{...}>`; uses Server Actions and `useActionState` |
| TypeScript | 5.x | strict mode |
| Tailwind | v4 | configured by `create-next-app` |
| shadcn/ui | latest | built on `@base-ui` (not Radix); `Button` does **not** support `asChild` |
| dnd-kit | core + sortable + utilities | vertical-list drag-and-drop |
| Prisma | 7.8.0 | breaking change: `url` removed from schema, lives in `prisma.config.ts`; runtime needs a driver adapter |
| Postgres adapter | `@prisma/adapter-pg` + `pg` | new requirement in Prisma 7 |
| Zod | v4 | `z.flattenError(error)` for form errors |
| lucide-react | latest | icons |
| Postgres | 16 | via docker-compose |

### Setup commands actually run

```bash
npx create-next-app@latest agenda-app --typescript --tailwind --app --eslint \
  --src-dir --import-alias "@/*" --use-npm --no-turbopack
npx shadcn@latest init --defaults
npx shadcn@latest add input card dialog label textarea sonner
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities \
            prisma @prisma/client @prisma/adapter-pg pg \
            zod react-hook-form @hookform/resolvers lucide-react
npm install --save-dev dotenv @types/pg
npx prisma init --datasource-provider postgresql
```

Notes:
- The shadcn `form` registry item didn't install cleanly; we use plain `<form action={...}>` with Server Actions instead. Cleaner anyway.
- `react-hook-form` was installed but isn't used — server-side validation via Zod + `useActionState` covers the UX. Can be dropped if undesired.
- `dotenv` is required because the Prisma 7 init writes `prisma.config.ts` that imports `dotenv/config`.

## 2. Project Structure

```
agenda-app/
├── prisma/
│   ├── schema.prisma             # no url field (moved to config)
│   └── migrations/20260428.../init.sql
├── prisma.config.ts              # DATABASE_URL via dotenv
├── src/
│   ├── app/
│   │   ├── layout.tsx            # header + Toaster
│   │   ├── page.tsx              # redirects to /agendas
│   │   └── agendas/
│   │       ├── page.tsx          # list
│   │       ├── new/page.tsx      # create form
│   │       └── [id]/page.tsx     # editor (params is async)
│   ├── components/
│   │   ├── ui/                   # shadcn primitives
│   │   ├── agenda-board.tsx      # DndContext + SortableContext
│   │   ├── agenda-item-card.tsx  # useSortable card with grip handle
│   │   ├── add-item-form.tsx     # useActionState form
│   │   ├── item-edit-dialog.tsx  # edit dialog
│   │   ├── agenda-form.tsx       # create/edit metadata
│   │   └── delete-agenda-button.tsx
│   ├── lib/
│   │   ├── prisma.ts             # PrismaClient with PrismaPg adapter
│   │   └── utils.ts              # shadcn cn()
│   ├── actions/
│   │   ├── agenda-actions.ts     # create/update/delete agenda
│   │   └── item-actions.ts       # add/edit/delete/reorder items
│   └── generated/prisma/         # generated client (in source tree, Prisma 7 default)
├── docker-compose.yml            # postgres:16
├── Dockerfile                    # multi-stage, standalone output
├── .dockerignore
├── .env / .env.local             # DATABASE_URL
├── next.config.ts                # output: 'standalone', serverExternalPackages
└── package.json
```

## 3. Database Schema

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  // No url — set via prisma.config.ts (Prisma 7 change)
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
  position        Int
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([agendaId, position])
}
```

`prisma.config.ts` (created by `prisma init`):
```ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env["DATABASE_URL"] },
});
```

## 4. Prisma Client (Prisma 7 pattern)

`src/lib/prisma.ts`:
```ts
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

Imports come from `@/generated/prisma/client` (not `@prisma/client`).

`next.config.ts` must mark these external so the bundler doesn't try to inline them:
```ts
const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg', 'pg'],
}
```

## 5. Server Actions

Pattern: each action takes `(boundArgs..., prevState, formData)` and returns a state shape compatible with `useActionState`. Validation with `safeParse` + `z.flattenError`.

`src/actions/agenda-actions.ts`:
- `createAgendaAction(prev, formData)` → on success, `redirect('/agendas/[id]')`
- `updateAgendaAction(id, prev, formData)` → `revalidatePath`
- `deleteAgendaAction(id)` → `revalidatePath` + `redirect('/agendas')`

`src/actions/item-actions.ts`:
- `addItemAction(agendaId, prev, formData)` → bumps position to count
- `updateItemAction(id, prev, formData)`
- `deleteItemAction(id)` → also runs raw SQL to compact `position` of trailing items
- `reorderItemsAction(agendaId, orderedIds)` → wraps N `update` calls in `prisma.$transaction`

## 6. Drag & Drop

Standard `@dnd-kit/sortable` setup:
- `DndContext` with `closestCenter` + `PointerSensor` (5px activation distance) + `KeyboardSensor`
- `SortableContext` with `verticalListSortingStrategy`
- `arrayMove` for local optimistic update; `reorderItemsAction` persists in a `useTransition`
- Drag handle is `GripVertical` only (so click on title/buttons still works)
- `touch-none` on each card for mobile

## 7. shadcn / @base-ui caveat

This shadcn version uses `@base-ui` for the `Button`, which does **not** accept `asChild`. We export `buttonVariants` from `components/ui/button.tsx` and use it directly:

```tsx
<Link href="/agendas/new" className={buttonVariants()}>
  <Plus className="h-4 w-4" />
  New agenda
</Link>
```

Anywhere a Button-styled link is needed, use `buttonVariants({ variant, size })` on the `<Link>`.

## 8. Pages

| Route | File | Notes |
| --- | --- | --- |
| `/` | `app/page.tsx` | server `redirect('/agendas')` |
| `/agendas` | `app/agendas/page.tsx` | list with item count + total duration; `dynamic = 'force-dynamic'` |
| `/agendas/new` | `app/agendas/new/page.tsx` | `<AgendaForm mode="create">` |
| `/agendas/[id]` | `app/agendas/[id]/page.tsx` | editor; `params` is `Promise`, must `await` |

## 9. Local Development

```bash
cd agenda-app
docker compose up -d        # postgres on :5432
npx prisma migrate deploy   # or `migrate dev` while iterating
npm run dev                 # http://localhost:3000
```

`.env.local`:
```
DATABASE_URL="postgresql://agenda:agenda@localhost:5432/agenda"
```

## 10. Production Deployment

`Dockerfile` is multi-stage:
1. `deps` — `npm ci`
2. `builder` — `npx prisma generate` + `npm run build` (uses standalone output)
3. `runner` — copies only `.next/standalone`, `.next/static`, `public`, plus `prisma/` + `prisma.config.ts` + the `prisma` and `@prisma/*` packages so `prisma migrate deploy` can run at startup. Drops to non-root `nextjs` user.

Startup command:
```
npx prisma migrate deploy && node server.js
```

To run with Postgres on a Linux server: extend `docker-compose.yml` with an `app` service pointing at the local Dockerfile, plus a reverse proxy (Caddy or Nginx) for HTTPS.

## 11. Verified

- `npm run build` ✓
- Dev server smoke-tested: list, detail, seeded data, computed totals (`30 min`, `3 items`)
- DnD action wiring: client optimistic update + Server Action persistence

## 12. Not implemented (extensions)

- Auth — add NextAuth/Auth.js + `userId` on `Agenda`
- Sharing / public read-only links
- Item types (discussion / decision / break)
- Templates
- PDF / calendar export
- Toast notifications via `sonner` (Toaster is mounted, no calls wired yet)

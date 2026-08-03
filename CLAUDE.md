# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

- `agenda-app/` — the product: a meeting-agenda/timer app (Next.js 16 App Router + Turbopack, React 19, TypeScript strict, Tailwind v4, Prisma 7 + PostgreSQL). Almost all work happens here.
- `website/` — end-user documentation site for OpenSpeak (Astro Starlight, static output), deployed at https://openspeak.website. See "Website" below.
- `PLAN.md` — implementation notes for the initial build (stack versions, Prisma 7 patterns, shadcn caveats).

## Commands

Run everything from `agenda-app/`:

```bash
docker compose up -d              # dev PostgreSQL (DATABASE_URL in .env)
npm run dev                       # dev server on :3000 (npm run dev -- --port 3001 for another port)
npx tsc --noEmit                  # typecheck — the main verification step
npx prisma migrate dev --name x   # after editing prisma/schema.prisma
npx prisma generate               # regenerate client into src/generated/prisma
npx prisma db seed                # optional sample data
npx prisma db execute --stdin     # ad-hoc SQL against the dev DB
```

There is no test suite. `npm run lint` is currently broken (`eslint-config-next/core-web-vitals` fails to resolve) — rely on `tsc`.

Gotchas:
- **Restart the dev server after any migration/generate.** The running server keeps the old generated client in memory and throws `Unknown argument` on new schema fields.
- Run `npx prisma ...` from `agenda-app/` (where `prisma.config.ts` and the local install live); from the repo root npx may try to download prisma and fail.

## Prisma 7 specifics

- The client is generated into `src/generated/prisma` — import types from `@/generated/prisma/client`, never `@prisma/client`.
- `DATABASE_URL` lives in `prisma.config.ts` (via dotenv), not in `schema.prisma`.
- Runtime uses the `@prisma/adapter-pg` driver adapter (`src/lib/prisma.ts`); `next.config.ts` lists prisma/pg in `serverExternalPackages`.

## Architecture

### Data model (`prisma/schema.prisma`)

`Agenda` → ordered `AgendaItem[]` (by `position`) and `Person[]` (participants). An item may carry an optional **sub-item loop** config (`subLabel`, `subMin/Expected/MaxMinutes`) — e.g. "Speaker" rounds where each participant gets their own timed slot. A meeting execution is a `MeetingRun` → `RunSegment[]`; each segment **snapshots** the label and min/expected/max thresholds at creation so later item edits don't rewrite history.

### Meeting run state machine (the core domain)

Everything is derived from the run's **latest segment** (reload-safe, no client-only state):

- open segment (`endedAt: null`) → that item/sub is running;
- last segment ended but run open → **between state**: the previous thing is finished and the next waits for an explicit start (nothing ever auto-starts);
- `itemDone` on an ended segment → its sub-item round is closed, the next agenda item is up;
- `skipped` marks a segment ended via "Skip agenda item";
- run `endedAt` set → meeting over.

Transitions are recorded by server actions in `src/actions/run-actions.ts` (`finishSegmentAction` closes without starting; `advanceRunAction` starts the next segment or ends the run; `finishItemAction` sets `itemDone`). Pause is `pausedAt`/`pausedSeconds` on the segment; paused time is excluded from elapsed everywhere, and closing a paused segment folds the open pause into `pausedSeconds`.

All viewers poll `GET /api/runs/[runId]` every second (`useRunState` in `src/components/use-run-state.ts`); segments cross the wire as `RunSegmentState` (ISO strings) via `serializeSegment` in `src/lib/run-state.ts`, which is also used by the server pages for initial state.

### The three run surfaces

- `/agendas/[id]/control` — phone-sized remote (`meeting-control.tsx`); the **only** surface that mutates the run. Destructive taps (skip, end meeting) use the two-tap arm pattern (`useTapConfirm`). Plays the max-time beep (`use-max-alert.ts`) — sound lives here because this page reliably has user gestures to unlock audio.
- `/agendas/[id]/run` — read-only projector display (`meeting-display.tsx`) that follows along by polling; with no open run it shows the planned schedule (start times from `src/lib/schedule.ts`) and past runs.
- `/agendas/[id]/runs/[runId]` — the report; also works mid-run as a "report so far". Idle time between explicitly-started segments is summed into an "in between" row.

Timer colors (`src/lib/timer-color.ts`): white → green at min → yellow at expected → red 30s before max; fixed regardless of color theme.

### Conventions

- Server actions follow the `useActionState` shape `(boundArgs..., prevState, formData)`, validate with Zod `safeParse` + `z.flattenError`, and `revalidatePath` after mutating. Forms are plain `<form action={...}>` — no react-hook-form.
- shadcn here is built on **@base-ui, not Radix**: `Button` does not support `asChild`. For button-styled links use `buttonVariants({ variant, size })` on a `<Link>`.
- Page `params` is a `Promise` (Next 16) — `await` it.
- Simple deletes confirm via native `confirm()` (see `delete-agenda-button.tsx`, `delete-run-button.tsx`).

## Website (`website/`)

Astro Starlight docs site (Astro 7, Starlight 0.41), a standalone npm project — run everything from `website/`:

```bash
npm run dev        # dev server on :4321
npm run build      # the verification step: fails on bad sidebar slugs, unknown icons, and broken internal links (starlight-links-validator)
npm run preview    # serve the built dist/
```

- Static output, no adapter — `dist/` deploys to any static host. Site URL and "Edit page" links are configured in `astro.config.mjs`.
- Content lives in `src/content/docs/` (16 pages: splash `index.mdx` + 5 sidebar groups). The sidebar is **manual** in `astro.config.mjs` — a new page must be added there too or the build won't link it.
- Use `.mdx` only when a page needs Starlight components (`<Steps>`, `<Aside>`, `<CardGrid>`); plain `.md` otherwise. HTML comments mark pending screenshots (`<!-- TODO screenshot: ... -->`); `src/assets/screenshots/` is the intended home for them.
- Docs content describes agenda-app behavior — when app behavior changes (timer rules, CSV format, run flow), update the matching docs page.

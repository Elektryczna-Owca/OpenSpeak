'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { AgendaItem } from '@/generated/prisma/client'

// The client runner owns the flow state machine; these actions record the
// transitions. Segments are created when they start and closed when advanced
// past, so an open segment always identifies the current position (reload-safe).

export type NextSegment = {
  itemId: string
  kind: 'item' | 'sub'
  subIndex?: number
  // Prep time the participant used before this sub-item started, timed on
  // the control page while waiting between segments (the segment doesn't
  // exist yet, so these are carried in and stamped onto it at creation).
  prepStartedAt?: string
  prepEndedAt?: string
}

// Threshold + label snapshots survive later edits/deletion of the item.
function segmentSnapshot(item: AgendaItem, next: NextSegment) {
  if (next.kind === 'sub') {
    const index = next.subIndex ?? 1
    return {
      itemId: item.id,
      kind: 'sub',
      subIndex: index,
      label: `${item.subLabel ?? 'Sub-item'} ${index}`,
      minMinutes: item.subMinMinutes,
      expectedMinutes: item.subExpectedMinutes,
      maxMinutes: item.subMaxMinutes,
    }
  }
  return {
    itemId: item.id,
    kind: 'item',
    subIndex: null,
    label: item.title,
    minMinutes: item.minMinutes,
    expectedMinutes: item.durationMinutes,
    maxMinutes: item.maxMinutes,
  }
}

// Stamps the end time, folding an in-flight pause into pausedSeconds so it
// stays the segment's full pause total.
function closeSegmentData(
  segment: { pausedAt: Date | null; pausedSeconds: number },
  now: Date,
  skipped = false,
) {
  return {
    endedAt: now,
    skipped,
    ...(segment.pausedAt
      ? {
          pausedAt: null,
          pausedSeconds:
            segment.pausedSeconds +
            (now.getTime() - segment.pausedAt.getTime()) / 1000,
        }
      : {}),
  }
}

function revalidateRunPages(agendaId: string) {
  revalidatePath(`/agendas/${agendaId}/run`)
  revalidatePath(`/agendas/${agendaId}/control`)
}

export async function startRunAction(agendaId: string) {
  const open = await prisma.meetingRun.findFirst({
    where: { agendaId, endedAt: null },
    select: { id: true },
  })
  if (!open) {
    const firstItem = await prisma.agendaItem.findFirst({
      where: { agendaId },
      orderBy: { position: 'asc' },
    })
    if (!firstItem) return // nothing to run
    await prisma.meetingRun.create({
      data: {
        agendaId,
        segments: {
          create: {
            ...segmentSnapshot(firstItem, { itemId: firstItem.id, kind: 'item' }),
            position: 0,
            startedAt: new Date(),
          },
        },
      },
    })
  }
  revalidateRunPages(agendaId)
}

// Pauses or resumes the timer on the current segment. Paused time accumulates
// in pausedSeconds and is excluded from the elapsed time everywhere.
export async function togglePauseAction(runId: string) {
  const run = await prisma.meetingRun.findUnique({
    where: { id: runId },
    include: { segments: { orderBy: { position: 'desc' }, take: 1 } },
  })
  if (!run || run.endedAt) return
  const segment = run.segments[0]
  if (!segment || segment.endedAt) return

  const now = new Date()
  await prisma.runSegment.update({
    where: { id: segment.id },
    data:
      segment.pausedAt === null
        ? { pausedAt: now }
        : {
            pausedAt: null,
            pausedSeconds:
              segment.pausedSeconds +
              (now.getTime() - segment.pausedAt.getTime()) / 1000,
          },
  })
  revalidateRunPages(run.agendaId)
}

// Assigns a participant to the current open segment (e.g. records who
// speaker 2 actually was), so the review page can show it.
export async function assignSegmentPersonAction(
  runId: string,
  personId: string | null,
) {
  const run = await prisma.meetingRun.findUnique({
    where: { id: runId },
    include: { segments: { orderBy: { position: 'desc' }, take: 1 } },
  })
  if (!run || run.endedAt) return
  const segment = run.segments[0]
  if (!segment || segment.endedAt) return

  if (personId) {
    const person = await prisma.person.findFirst({
      where: { id: personId, agendaId: run.agendaId },
      select: { id: true },
    })
    if (!person) return
  }

  await prisma.runSegment.update({
    where: { id: segment.id },
    data: { personId },
  })
  revalidateRunPages(run.agendaId)
}

// Creates a new meeting participant on the fly and assigns them to the
// current open segment — for a speaker who isn't on the participant list yet.
export async function assignNewPersonAction(runId: string, name: string) {
  const trimmed = name.trim().slice(0, 100)
  if (!trimmed) return null

  const run = await prisma.meetingRun.findUnique({
    where: { id: runId },
    include: { segments: { orderBy: { position: 'desc' }, take: 1 } },
  })
  if (!run || run.endedAt) return null
  const segment = run.segments[0]
  if (!segment || segment.endedAt) return null

  const person = await prisma.person.create({
    data: { agendaId: run.agendaId, name: trimmed },
  })
  await prisma.runSegment.update({
    where: { id: segment.id },
    data: { personId: person.id },
  })
  revalidatePath(`/agendas/${run.agendaId}/people`)
  revalidateRunPages(run.agendaId)
  return { id: person.id, name: person.name }
}

// Stores the free-text note typed on the control page for the current open
// segment (e.g. what a speaker actually talked about); it shows up in the report.
export async function setSegmentCommentAction(runId: string, comment: string) {
  const run = await prisma.meetingRun.findUnique({
    where: { id: runId },
    include: { segments: { orderBy: { position: 'desc' }, take: 1 } },
  })
  if (!run || run.endedAt) return
  const segment = run.segments[0]
  if (!segment || segment.endedAt) return

  const trimmed = comment.trim().slice(0, 2000)
  await prisma.runSegment.update({
    where: { id: segment.id },
    data: { comment: trimmed === '' ? null : trimmed },
  })
  revalidateRunPages(run.agendaId)
}

// Removes a finished run (and its segments, via cascade) from the history.
// Open runs are never deleted — they drive a live meeting.
export async function deleteRunAction(runId: string) {
  const run = await prisma.meetingRun.findUnique({
    where: { id: runId },
    select: { agendaId: true, endedAt: true },
  })
  if (!run || !run.endedAt) return
  await prisma.meetingRun.delete({ where: { id: runId } })
  revalidateRunPages(run.agendaId)
}

// Ends the current segment without starting anything — the run sits between
// items until the controller starts the next one (or finishes the meeting).
// Skipping abandons the whole item, so it also closes out any sub-item loop
// (itemDone) rather than leaving the between-state offering the next round.
export async function finishSegmentAction(runId: string, skipped = false) {
  const run = await prisma.meetingRun.findUnique({
    where: { id: runId },
    include: { segments: { orderBy: { position: 'desc' }, take: 1 } },
  })
  if (!run || run.endedAt) return
  const segment = run.segments[0]
  if (!segment || segment.endedAt) return

  await prisma.runSegment.update({
    where: { id: segment.id },
    data: {
      ...closeSegmentData(segment, new Date(), skipped),
      ...(skipped ? { itemDone: true } : {}),
    },
  })
  revalidateRunPages(run.agendaId)
}

// Declares the whole item finished from the between-segments state (after a
// sub-item round), so the run moves on to waiting for the next agenda item
// without starting anything.
export async function finishItemAction(runId: string) {
  const run = await prisma.meetingRun.findUnique({
    where: { id: runId },
    include: { segments: { orderBy: { position: 'desc' }, take: 1 } },
  })
  if (!run || run.endedAt) return
  const segment = run.segments[0]
  if (!segment || !segment.endedAt) return // only meaningful between segments

  await prisma.runSegment.update({
    where: { id: segment.id },
    data: { itemDone: true },
  })
  revalidateRunPages(run.agendaId)
}

// Abandons the current segment (running or between) with no trace — deleted
// outright, so none of its time counts anywhere — and reopens the segment
// before it, frozen at the moment it had finished as if paused right then.
export async function goBackAction(runId: string) {
  const run = await prisma.meetingRun.findUnique({
    where: { id: runId },
    include: { segments: { orderBy: { position: 'desc' }, take: 2 } },
  })
  if (!run || run.endedAt) return
  const [current, previous] = run.segments
  if (!current || !previous) return // nothing before the first segment

  const now = new Date()
  await prisma.$transaction([
    prisma.runSegment.delete({ where: { id: current.id } }),
    prisma.runSegment.update({
      where: { id: previous.id },
      data: {
        endedAt: null,
        skipped: false,
        itemDone: false,
        pausedAt: now,
        pausedSeconds:
          previous.pausedSeconds +
          (previous.endedAt ? (now.getTime() - previous.endedAt.getTime()) / 1000 : 0),
      },
    }),
  ])
  revalidateRunPages(run.agendaId)
}

// Skips the next agenda item from the between-segments state, without ever
// starting it. Recorded as a zero-length segment marked skipped so it still
// shows up (as skipped) in the report, then the run waits between items again.
export async function skipNextAction(runId: string, next: NextSegment) {
  const run = await prisma.meetingRun.findUnique({
    where: { id: runId },
    include: { segments: { orderBy: { position: 'desc' }, take: 1 } },
  })
  if (!run || run.endedAt) return
  const lastSegment = run.segments[0]
  if (!lastSegment || lastSegment.endedAt === null) return // only meaningful between segments

  const item = await prisma.agendaItem.findFirst({
    where: { id: next.itemId, agendaId: run.agendaId },
  })
  if (!item) return

  const now = new Date()
  await prisma.runSegment.create({
    data: {
      runId,
      ...segmentSnapshot(item, next),
      position: lastSegment.position + 1,
      startedAt: now,
      endedAt: now,
      skipped: true,
      itemDone: true,
    },
  })
  revalidateRunPages(run.agendaId)
}

export async function advanceRunAction(runId: string, next: NextSegment | null) {
  const run = await prisma.meetingRun.findUnique({
    where: { id: runId },
    include: {
      segments: { orderBy: { position: 'desc' }, take: 1 },
    },
  })
  if (!run || run.endedAt) return

  const now = new Date()
  const lastSegment = run.segments[0]
  if (lastSegment && lastSegment.endedAt === null) {
    await prisma.runSegment.update({
      where: { id: lastSegment.id },
      data: closeSegmentData(lastSegment, now),
    })
  }

  if (next === null) {
    await prisma.meetingRun.update({
      where: { id: runId },
      data: { endedAt: now },
    })
    revalidateRunPages(run.agendaId)
    redirect(`/agendas/${run.agendaId}/runs/${runId}`)
  }

  const item = await prisma.agendaItem.findFirst({
    where: { id: next.itemId, agendaId: run.agendaId },
  })
  if (!item) {
    // Item vanished mid-run (deleted in another tab) — end the run gracefully.
    await prisma.meetingRun.update({
      where: { id: runId },
      data: { endedAt: now },
    })
    revalidateRunPages(run.agendaId)
    redirect(`/agendas/${run.agendaId}/runs/${runId}`)
  }

  await prisma.runSegment.create({
    data: {
      runId,
      ...segmentSnapshot(item, next),
      position: (lastSegment?.position ?? -1) + 1,
      startedAt: now,
      prepStartedAt: next.prepStartedAt ? new Date(next.prepStartedAt) : null,
      prepEndedAt: next.prepEndedAt ? new Date(next.prepEndedAt) : null,
    },
  })
  revalidateRunPages(run.agendaId)
}

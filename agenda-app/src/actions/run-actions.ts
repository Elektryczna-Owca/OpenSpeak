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
      // Advancing a paused segment ends the pause too, so pausedSeconds
      // stays the segment's full pause total.
      data: {
        endedAt: now,
        ...(lastSegment.pausedAt
          ? {
              pausedAt: null,
              pausedSeconds:
                lastSegment.pausedSeconds +
                (now.getTime() - lastSegment.pausedAt.getTime()) / 1000,
            }
          : {}),
      },
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
    },
  })
  revalidateRunPages(run.agendaId)
}

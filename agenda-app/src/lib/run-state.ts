import type { NextSegment } from '@/actions/run-actions'
import type { AgendaItem, RunSegment } from '@/generated/prisma/client'

// The latest segment as served by /api/runs/[runId] — dates as ISO strings so
// it round-trips through JSON polling. A segment with endedAt set (on a run
// that hasn't ended) means the meeting is between items: the previous item is
// finished and the next one hasn't been started yet.
export type RunSegmentState = {
  itemId: string | null
  kind: string
  subIndex: number | null
  personId: string | null
  personName: string | null
  label: string
  minMinutes: number | null
  expectedMinutes: number | null
  maxMinutes: number | null
  startedAt: string
  endedAt: string | null
  pausedAt: string | null
  pausedSeconds: number
  skipped: boolean
}

export function serializeSegment(
  segment: RunSegment & { person: { name: string } | null },
): RunSegmentState {
  return {
    itemId: segment.itemId,
    kind: segment.kind,
    subIndex: segment.subIndex,
    personId: segment.personId,
    personName: segment.person?.name ?? null,
    label: segment.label,
    minMinutes: segment.minMinutes,
    expectedMinutes: segment.expectedMinutes,
    maxMinutes: segment.maxMinutes,
    startedAt: segment.startedAt.toISOString(),
    endedAt: segment.endedAt?.toISOString() ?? null,
    pausedAt: segment.pausedAt?.toISOString() ?? null,
    pausedSeconds: segment.pausedSeconds,
    skipped: segment.skipped,
  }
}

export type RunState = {
  endedAt: string | null
  segment: RunSegmentState | null
}

// Where the meeting goes from the current segment. The flow never advances
// automatically — these are the targets for the manual Next / End buttons.
export function computeRunTargets(items: AgendaItem[], segment: RunSegmentState) {
  const currentIndex = items.findIndex(i => i.id === segment.itemId)
  const currentItem = currentIndex >= 0 ? items[currentIndex] : null
  const nextItem = currentIndex >= 0 ? (items[currentIndex + 1] ?? null) : null
  const inSubLoop = segment.kind === 'sub'
  const subLabel = currentItem?.subLabel ?? 'Sub-item'

  let nextTarget: NextSegment | null
  let nextLabel: string
  if (inSubLoop && currentItem) {
    nextTarget = {
      itemId: currentItem.id,
      kind: 'sub',
      subIndex: (segment.subIndex ?? 1) + 1,
    }
    nextLabel = `Next ${subLabel.toLowerCase()}`
  } else if (currentItem && currentItem.subExpectedMinutes != null) {
    nextTarget = { itemId: currentItem.id, kind: 'sub', subIndex: 1 }
    nextLabel = `Start ${subLabel.toLowerCase()} 1`
  } else if (nextItem) {
    nextTarget = { itemId: nextItem.id, kind: 'item' }
    nextLabel = 'Next item'
  } else {
    nextTarget = null
    nextLabel = 'Finish meeting'
  }

  return { currentIndex, currentItem, nextItem, inSubLoop, subLabel, nextTarget, nextLabel }
}

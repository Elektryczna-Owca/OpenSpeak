import type { NextSegment } from '@/actions/run-actions'
import type { AgendaItem } from '@/generated/prisma/client'

// The open segment as served by /api/runs/[runId] — dates as ISO strings so
// it round-trips through JSON polling.
export type RunSegmentState = {
  itemId: string | null
  kind: string
  subIndex: number | null
  label: string
  minMinutes: number | null
  expectedMinutes: number | null
  maxMinutes: number | null
  startedAt: string
  pausedAt: string | null
  pausedSeconds: number
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

  // "End" exits the sub-item loop: on to the next item, or finish.
  const endTarget: NextSegment | null = nextItem
    ? { itemId: nextItem.id, kind: 'item' }
    : null

  return { currentIndex, currentItem, nextItem, inSubLoop, subLabel, nextTarget, nextLabel, endTarget }
}

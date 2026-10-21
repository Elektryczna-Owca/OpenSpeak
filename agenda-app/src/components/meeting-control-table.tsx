'use client'

import { useRouter } from 'next/navigation'
import { Pause, Play, Square } from 'lucide-react'
import { assignItemPersonAction } from '@/actions/item-actions'
import type { NextSegment } from '@/actions/run-actions'
import { Button } from '@/components/ui/button'
import {
  ITEM_TIME_FIELDS,
  TIME_KEYS,
  hasSubItem,
  type TimeFields,
  type TimeKey,
} from '@/lib/item-times'
import { personLabel } from '@/lib/person-label'
import type { RunSegmentState, RunState } from '@/lib/run-state'
import { formatElapsed, timerStage, type TimerStage } from '@/lib/timer-color'
import { cn } from '@/lib/utils'
import type { AgendaItem, Person } from '@/generated/prisma/client'

// Minutes as the M:SS timing cards are written (7 → 7:00, 1.5 → 1:30).
function formatMark(minutes: number | null): string {
  if (minutes == null) return '—'
  const total = Math.round(minutes * 60)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

const HEAD_TINT: Record<TimeKey, string> = {
  min: '',
  green: 'bg-green-600 text-white',
  yellow: 'bg-yellow-400 text-black',
  red: 'bg-red-600 text-white',
  max: '',
}
const CELL_TINT: Record<TimeKey, string> = {
  min: '',
  green: 'bg-green-500/10',
  yellow: 'bg-yellow-400/15',
  red: 'bg-red-500/10',
  max: '',
}
const STAGE_TINT: Record<TimerStage, string> = {
  idle: '',
  green: 'bg-green-600 text-white',
  yellow: 'bg-yellow-400 text-black',
  red: 'bg-red-600 text-white',
}

const selectClass =
  'h-8 w-full min-w-28 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30'

function segmentSeconds(segment: RunSegmentState, liveElapsed: number): number {
  if (!segment.endedAt) return liveElapsed
  return (
    (Date.parse(segment.endedAt) - Date.parse(segment.startedAt)) / 1000 -
    segment.pausedSeconds
  )
}

// Y when the time is inside [min, max], N when under min or over max — the
// same rule as the FreeToastHost timer sheet. Empty until there is a time.
function verdict(seconds: number | null, min: number | null, max: number | null) {
  if (seconds == null || (min == null && max == null)) return null
  return (min != null && seconds < min * 60) || (max != null && seconds > max * 60)
    ? 'N'
    : 'Y'
}

type RowModel = {
  key: string
  label: string
  indent: boolean
  times: TimeFields
  // Recorded time across this row's finished segments plus the running one;
  // null while nothing has been timed.
  seconds: number | null
  running: RunSegmentState | null
  skipped: boolean
  personId: string | null
  personName: string | null
  // What the row's Start button begins.
  target: NextSegment
  itemId: string
}

// The meeting-control as a timer sheet: one row per agenda item (and per
// sub-item round), thresholds on the left, the actual time ticking on the
// right with a Start / Stop button. Starting any row ends whatever is
// running, so the sheet can be driven in any order.
export function MeetingControlTable({
  items,
  people,
  state,
  elapsed,
  pending,
  onStart,
  onStop,
  onTogglePause,
  onAssignSegmentPerson,
}: {
  items: AgendaItem[]
  people: Pick<Person, 'id' | 'name' | 'isGuest'>[]
  state: RunState
  elapsed: number
  pending: boolean
  onStart: (target: NextSegment) => void
  onStop: () => void
  onTogglePause: () => void
  onAssignSegmentPerson: (personId: string | null) => void
}) {
  const router = useRouter()
  const segments = state.segments ?? (state.segment ? [state.segment] : [])
  const last = state.segment
  const running = last && !last.endedAt ? last : null
  const paused = running?.pausedAt != null

  function assignItemPerson(itemId: string, personId: string) {
    if (!personId) return
    void assignItemPersonAction(itemId, personId).then(() => router.refresh())
  }

  const rows: RowModel[] = items.flatMap(item => {
    const own = segments.filter(s => s.itemId === item.id && s.kind === 'item')
    const subs = segments.filter(s => s.itemId === item.id && s.kind === 'sub')
    const timed = own.filter(s => !s.skipped)
    const itemRunning = own.find(s => s.position === running?.position) ?? null
    const model: RowModel[] = [
      {
        key: item.id,
        label: item.title,
        indent: false,
        times: item,
        seconds: timed.length
          ? timed.reduce((sum, s) => sum + segmentSeconds(s, elapsed), 0)
          : null,
        running: itemRunning,
        skipped: own.length > 0 && timed.length === 0,
        personId: item.personId,
        personName: null,
        target: { itemId: item.id, kind: 'item' },
        itemId: item.id,
      },
    ]
    if (hasSubItem(item)) {
      const subLabel = item.subLabel ?? 'Sub-item'
      for (const s of subs) {
        model.push({
          key: `${item.id}-sub-${s.position}`,
          label: s.label,
          indent: true,
          times: s,
          seconds: s.skipped ? null : segmentSeconds(s, elapsed),
          running: s.position === running?.position ? s : null,
          skipped: s.skipped,
          personId: s.personId,
          personName: s.personName,
          target: { itemId: item.id, kind: 'sub', subIndex: s.subIndex ?? 1 },
          itemId: item.id,
        })
      }
      // The next round, ready to start.
      const nextIndex = Math.max(0, ...subs.map(s => s.subIndex ?? 0)) + 1
      model.push({
        key: `${item.id}-sub-next`,
        label: `${subLabel} ${nextIndex}`,
        indent: true,
        times: {
          minMinutes: item.subMinMinutes,
          greenMinutes: item.subGreenMinutes,
          yellowMinutes: item.subYellowMinutes,
          redMinutes: item.subRedMinutes,
          maxMinutes: item.subMaxMinutes,
        },
        seconds: null,
        running: null,
        skipped: false,
        personId: null,
        personName: null,
        target: { itemId: item.id, kind: 'sub', subIndex: nextIndex },
        itemId: item.id,
      })
    }
    return model
  })

  return (
    <div className="w-full overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[44rem] border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-xs">
            <th className="sticky left-0 z-10 bg-muted px-2 py-2 text-left font-medium">
              Role / Item
            </th>
            <th className="px-2 py-2 text-left font-medium">Name</th>
            {TIME_KEYS.map(key => (
              <th
                key={key}
                className={cn('px-2 py-2 text-center font-medium', HEAD_TINT[key])}
              >
                {key[0].toUpperCase() + key.slice(1)}
              </th>
            ))}
            <th className="px-2 py-2 text-center font-medium">Actual time</th>
            <th className="px-2 py-2 text-center font-medium">Within</th>
            <th className="px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const live = row.running != null
            const stage = live && !paused ? timerStage(elapsed, row.running!) : 'idle'
            const result = verdict(row.seconds, row.times.minMinutes, row.times.maxMinutes)
            const recorded = row.seconds != null && row.seconds >= 1
            return (
                <tr key={row.key} className={cn('border-b last:border-b-0', live && 'bg-primary/5')}>
                  <td
                    className={cn(
                      'sticky left-0 z-10 bg-background px-2 py-1.5 font-medium',
                      row.indent && 'pl-6 font-normal text-muted-foreground',
                      live && 'bg-primary/5',
                    )}
                  >
                    {row.label}
                    {row.skipped && (
                      <span className="ml-1 text-xs text-muted-foreground">(skipped)</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {row.indent ? (
                      live && people.length > 0 ? (
                        <select
                          aria-label={`Participant for ${row.label}`}
                          className={selectClass}
                          value={row.personId ?? ''}
                          onChange={e => onAssignSegmentPerson(e.target.value || null)}
                          disabled={pending}
                        >
                          <option value="">Unassigned</option>
                          {people.map(p => (
                            <option key={p.id} value={p.id}>
                              {personLabel(p)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span>{row.personName ?? ''}</span>
                      )
                    ) : people.length > 0 ? (
                      <select
                        aria-label={`Person for ${row.label}`}
                        className={selectClass}
                        value={row.personId ?? ''}
                        onChange={e => assignItemPerson(row.itemId, e.target.value)}
                      >
                        <option value="" disabled>
                          —
                        </option>
                        {people.map(p => (
                          <option key={p.id} value={p.id}>
                            {personLabel(p)}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </td>
                  {TIME_KEYS.map(key => (
                    <td
                      key={key}
                      className={cn(
                        'px-2 py-1.5 text-center font-mono text-xs font-semibold tabular-nums',
                        CELL_TINT[key],
                      )}
                    >
                      {formatMark(row.times[ITEM_TIME_FIELDS[key]])}
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-center">
                    <span
                      className={cn(
                        'inline-block min-w-16 rounded px-2 py-1 font-mono font-semibold tabular-nums',
                        paused && live ? 'bg-muted text-muted-foreground' : STAGE_TINT[stage],
                      )}
                    >
                      {row.seconds != null ? formatElapsed(row.seconds) : ''}
                    </span>
                  </td>
                  <td
                    className={cn(
                      'px-2 py-1.5 text-center font-bold',
                      result === 'Y' && 'text-green-600',
                      result === 'N' && 'text-red-600',
                    )}
                  >
                    {result}
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center justify-end gap-1">
                      {live && (
                        <Button
                          size="icon"
                          variant="outline"
                          aria-label={paused ? 'Resume' : 'Pause'}
                          onClick={onTogglePause}
                          disabled={pending}
                        >
                          {paused ? <Play /> : <Pause />}
                        </Button>
                      )}
                      {live ? (
                        <Button
                          variant="destructive"
                          onClick={onStop}
                          disabled={pending}
                        >
                          <Square />
                          Stop
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (
                              recorded &&
                              !confirm(
                                `${row.label} already has ${formatElapsed(row.seconds!)}. Start it again? The new time is added.`,
                              )
                            ) {
                              return
                            }
                            onStart(row.target)
                          }}
                          disabled={pending}
                        >
                          <Play />
                          Start
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

'use client'

import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const selectClass =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30'

// A small fallback list for runtimes without Intl.supportedValuesOf.
const FALLBACK_ZONES = [
  'UTC',
  'Europe/London',
  'Europe/Dublin',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
]

function supportedZones(): string[] {
  const intl = Intl as typeof Intl & {
    supportedValuesOf?: (key: string) => string[]
  }
  try {
    const zones = intl.supportedValuesOf?.('timeZone')
    if (zones && zones.length > 0) return zones
  } catch {
    // fall through to fallback
  }
  return FALLBACK_ZONES
}

function detectedZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export function TimezoneSelect({
  id,
  defaultValue,
  className,
}: {
  id: string
  defaultValue?: string | null
  className?: string
}) {
  const zones = supportedZones()
  const selected = defaultValue || detectedZone()
  // Make sure the selected zone is always an option (e.g. a stored zone missing
  // from a trimmed runtime list).
  const options = zones.includes(selected) ? zones : [selected, ...zones]

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id}>Timezone</Label>
      <select
        id={id}
        name="timezone"
        defaultValue={selected}
        className={selectClass}
      >
        {options.map(zone => (
          <option key={zone} value={zone}>
            {zone}
          </option>
        ))}
      </select>
    </div>
  )
}

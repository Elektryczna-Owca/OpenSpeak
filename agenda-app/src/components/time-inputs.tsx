import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  TIME_KEYS,
  TIME_LABELS,
  type Times,
  type TimeKey,
} from '@/lib/item-times'

const LABEL_TINT: Record<TimeKey, string> = {
  min: '',
  green: 'text-green-600 dark:text-green-500',
  yellow: 'text-yellow-600 dark:text-yellow-400',
  red: 'text-red-600 dark:text-red-500',
  max: '',
}

// The five threshold inputs (min, green, yellow, red, max) of an item or
// sub-item. `fields` maps each threshold to its form field name; errors come
// straight from the item form state, keyed by those names. The first error
// is shown once, below the row.
export function TimeInputs({
  idPrefix,
  fields,
  defaults,
  errors,
  className,
}: {
  idPrefix: string
  fields: Record<TimeKey, string>
  defaults?: Times
  errors?: Partial<Record<string, string[]>>
  className?: string
}) {
  const firstError = TIME_KEYS.map(k => errors?.[fields[k]]?.[0]).find(Boolean)
  return (
    <div className="space-y-1.5">
      <div className={cn('grid grid-cols-5 gap-2', className)}>
        {TIME_KEYS.map(key => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-${key}`} className={LABEL_TINT[key]}>
              {TIME_LABELS[key]}
            </Label>
            <Input
              id={`${idPrefix}-${key}`}
              name={fields[key]}
              type="number"
              min={0.5}
              max={600}
              step={0.5}
              placeholder="—"
              defaultValue={defaults?.[key] ?? ''}
              aria-invalid={!!errors?.[fields[key]]}
            />
          </div>
        ))}
      </div>
      {firstError && <p className="text-sm text-destructive">{firstError}</p>}
    </div>
  )
}

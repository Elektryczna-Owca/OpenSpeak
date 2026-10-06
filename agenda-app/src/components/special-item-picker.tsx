'use client'

import { Fragment, useRef, useState } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { SpecialItemOption, SpecialItemValue } from '@/lib/special-item-csv'

const selectClass =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30'

// Groups values by their `group` column, keeping first-appearance order.
function groupValues(values: SpecialItemValue[]) {
  const groups = new Map<string, SpecialItemValue[]>()
  for (const v of values) {
    const key = v.group ?? ''
    groups.set(key, [...(groups.get(key) ?? []), v])
  }
  return [...groups.entries()]
}

function setField(form: HTMLFormElement | null, name: string, value: string) {
  const field = form?.elements.namedItem(name)
  if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
    field.value = value
  }
}

// What a picked value contributes to the item's description.
function describeValue(v: SpecialItemValue) {
  return v.group ? `${v.group} — ${v.value}` : v.value
}

// Switches an item form between a regular item and one picked from a special
// item list. Submits `specialItemId` and `specialValue`; picking a value fills
// the form's title (the special item's name) and description (the value, with
// its group) — unless the user typed their own — and min/expected/max inputs,
// which stay editable.
export function SpecialItemPicker({
  idPrefix,
  specialItems,
  defaultSpecialItemId,
  defaultValue,
  onTypeChange,
  error,
  className,
}: {
  idPrefix: string
  specialItems: SpecialItemOption[]
  defaultSpecialItemId?: string | null
  defaultValue?: string | null
  onTypeChange?: (specialItemId: string) => void
  error?: string
  className?: string
}) {
  const [typeId, setTypeId] = useState(
    specialItems.some(s => s.id === defaultSpecialItemId) ? defaultSpecialItemId! : '',
  )
  const [value, setValue] = useState(defaultValue ?? '')
  const special = specialItems.find(s => s.id === typeId)
  // The title and description we last filled in, so a later pick replaces
  // them but never overwrites text the user typed.
  const autoTitle = useRef(special?.name ?? '')
  const autoDescription = useRef(
    special?.values.find(v => v.value === defaultValue)
      ? describeValue(special.values.find(v => v.value === defaultValue)!)
      : (defaultValue ?? ''),
  )
  // A value removed from the list since it was picked still shows as selected.
  const orphan =
    special && value !== '' && !special.values.some(v => v.value === value)
      ? value
      : null

  function pick(form: HTMLFormElement | null, label: string) {
    setValue(label)
    const picked = special?.values.find(v => v.value === label)
    if (!picked) return
    const title = form?.elements.namedItem('title')
    if (
      special &&
      title instanceof HTMLInputElement &&
      (title.value === '' || title.value === autoTitle.current)
    ) {
      title.value = special.name
      autoTitle.current = special.name
    }
    const description = form?.elements.namedItem('description')
    if (
      (description instanceof HTMLInputElement ||
        description instanceof HTMLTextAreaElement) &&
      (description.value === '' || description.value === autoDescription.current)
    ) {
      description.value = describeValue(picked)
      autoDescription.current = description.value
    }
    if (picked.expectedMinutes != null) {
      setField(form, 'minMinutes', String(picked.minMinutes ?? ''))
      setField(form, 'durationMinutes', String(picked.expectedMinutes))
      setField(form, 'maxMinutes', String(picked.maxMinutes ?? ''))
    }
  }

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-end', className)}>
      <div className="space-y-1.5 sm:w-48">
        <Label htmlFor={`${idPrefix}-specialItemId`}>Type</Label>
        <select
          id={`${idPrefix}-specialItemId`}
          name="specialItemId"
          className={selectClass}
          value={typeId}
          onChange={e => {
            // Switching type drops the text this picker filled in (but never
            // text the user typed).
            const form = e.currentTarget.form
            const title = form?.elements.namedItem('title')
            if (title instanceof HTMLInputElement && title.value === autoTitle.current) {
              title.value = ''
            }
            const description = form?.elements.namedItem('description')
            if (
              (description instanceof HTMLInputElement ||
                description instanceof HTMLTextAreaElement) &&
              description.value === autoDescription.current
            ) {
              description.value = ''
            }
            autoTitle.current = ''
            autoDescription.current = ''
            setTypeId(e.target.value)
            setValue('')
            onTypeChange?.(e.target.value)
          }}
        >
          <option value="">Regular item</option>
          {specialItems.map(s => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      {special && (
        <div className="flex-1 min-w-0 space-y-1.5">
          <Label htmlFor={`${idPrefix}-specialValue`}>{special.name}</Label>
          <select
            id={`${idPrefix}-specialValue`}
            name="specialValue"
            required
            className={selectClass}
            value={value}
            onChange={e => pick(e.currentTarget.form, e.target.value)}
            aria-invalid={!!error}
          >
            <option value="">— pick a value —</option>
            {orphan && <option value={orphan}>{orphan} (no longer in list)</option>}
            {groupValues(special.values).map(([group, values]) => {
              const options = values.map(v => (
                <option key={v.value} value={v.value}>
                  {v.value}
                  {v.expectedMinutes != null &&
                    ` (${v.minMinutes != null && v.maxMinutes != null ? `${v.minMinutes}–${v.maxMinutes}` : v.expectedMinutes} min)`}
                </option>
              ))
              return group ? (
                <optgroup key={group} label={group}>
                  {options}
                </optgroup>
              ) : (
                <Fragment key="">{options}</Fragment>
              )
            })}
          </select>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}
    </div>
  )
}

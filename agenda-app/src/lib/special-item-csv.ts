import { z } from 'zod'
import {
  ITEM_TIME_FIELDS,
  TIME_KEYS,
  type TimeFields,
  checkOrdering,
  itemTimes,
  optionalLabel,
  optionalMinutes,
} from '@/lib/item-times'
import {
  csvField,
  detectDelimiter,
  legacyOf,
  normalizeHeader,
  splitLine,
} from '@/lib/agenda-csv'

// Parses the value list of a special item (e.g. Pathways projects). Same CSV
// dialect as agenda CSV (delimiter auto-detect, quoting, case/space-insensitive
// header). Columns: group, value, min, green, yellow, red, max — only value is
// required.
// - group is optional and only clusters values in the picker;
// - times are optional and follow the shared ordering rules;
// - legacy files with an "expected" column (and no green/yellow/red) still
//   load, converted like legacy agenda CSV;
// - value labels must be unique within the list.

export type SpecialItemValue = TimeFields & {
  group: string | null
  value: string
}

// What the item forms need to offer a special item in the picker.
export type SpecialItemOption = {
  id: string
  name: string
  values: SpecialItemValue[]
}

type ColumnKey = 'group' | 'value' | 'expected' | (typeof TIME_KEYS)[number]

const COLUMNS: Record<string, ColumnKey> = {
  group: 'group',
  value: 'value',
  expected: 'expected',
  ...Object.fromEntries(TIME_KEYS.map(k => [k, k])),
}

const FIELD_DISPLAY: Record<string, string> = {
  group: 'group',
  value: 'value',
  ...Object.fromEntries(TIME_KEYS.map(k => [ITEM_TIME_FIELDS[k], k])),
}

const RowSchema = z
  .object({
    group: optionalLabel,
    value: z.string().min(1, 'is required').max(200),
    minMinutes: optionalMinutes,
    greenMinutes: optionalMinutes,
    yellowMinutes: optionalMinutes,
    redMinutes: optionalMinutes,
    maxMinutes: optionalMinutes,
  })
  .superRefine((data, ctx) => {
    checkOrdering(ctx, itemTimes(data), ITEM_TIME_FIELDS)
  })

const CSV_HEADER = 'group,value,min,green,yellow,red,max'

export function serializeSpecialItemCsv(values: SpecialItemValue[]): string {
  const rows = values.map(v =>
    [v.group, v.value, v.minMinutes, v.greenMinutes, v.yellowMinutes, v.redMinutes, v.maxMinutes]
      .map(csvField)
      .join(','),
  )
  return [CSV_HEADER, ...rows].join('\n') + '\n'
}

export function parseSpecialItemCsv(text: string): {
  values: SpecialItemValue[]
  errors: string[]
} {
  const numbered = text
    .split(/\r\n|\r|\n/)
    .map((line, i) => ({ line, no: i + 1 }))
    .filter(({ line }) => line.trim() !== '')

  if (numbered.length === 0) {
    return { values: [], errors: ['The CSV is empty'] }
  }

  const delim = detectDelimiter(numbered[0].line)
  const columns = splitLine(numbered[0].line, delim).map(
    cell => COLUMNS[normalizeHeader(cell)] ?? null,
  )
  if (!columns.includes('value')) {
    return {
      values: [],
      errors: ['The first row must be a header including at least a "value" column'],
    }
  }

  const legacy = columns.includes('expected')
  const dataRows = numbered.slice(1)
  if (dataRows.length === 0) {
    return { values: [], errors: ['No values found below the header row'] }
  }

  const errors: string[] = []
  const values: SpecialItemValue[] = []
  const seen = new Map<string, number>()
  for (const { line, no } of dataRows) {
    const cells = splitLine(line, delim)
    const raw: Partial<Record<ColumnKey, string>> = {}
    columns.forEach((key, i) => {
      if (key) raw[key] = (cells[i] ?? '').trim()
    })
    const field = (key: ColumnKey) => raw[key] ?? ''

    const input: Record<string, string> = {
      group: field('group'),
      value: field('value'),
    }
    for (const key of TIME_KEYS) input[ITEM_TIME_FIELDS[key]] = field(key)
    if (legacy) {
      const old = legacyOf(field('min'), field('expected'), field('max'))
      for (const key of ['green', 'yellow', 'red'] as const) {
        if (!field(key)) input[ITEM_TIME_FIELDS[key]] = old[key]
      }
    }

    const parsed = RowSchema.safeParse(input)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? '')
        errors.push(`Line ${no}: ${FIELD_DISPLAY[field] ?? field} — ${issue.message}`)
      }
      continue
    }
    const firstLine = seen.get(parsed.data.value)
    if (firstLine != null) {
      errors.push(`Line ${no}: value — duplicates line ${firstLine}`)
      continue
    }
    seen.set(parsed.data.value, no)
    values.push(parsed.data)
  }

  return { values: errors.length > 0 ? [] : values, errors }
}

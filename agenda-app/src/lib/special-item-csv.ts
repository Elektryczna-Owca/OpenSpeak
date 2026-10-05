import { z } from 'zod'
import { checkOrdering, optionalLabel, optionalMinutes } from '@/lib/item-times'
import { csvField, detectDelimiter, normalizeHeader, splitLine } from '@/lib/agenda-csv'

// Parses the value list of a special item (e.g. Pathways projects). Same CSV
// dialect as agenda CSV (delimiter auto-detect, quoting, case/space-insensitive
// header). Columns: group, value, min, expected, max — only value is required.
// - group is optional and only clusters values in the picker;
// - times are optional; if expected is empty but min and max are set, it
//   defaults to their midpoint (snapped to half minutes);
// - value labels must be unique within the list.

export type SpecialItemValue = {
  group: string | null
  value: string
  minMinutes: number | null
  expectedMinutes: number | null
  maxMinutes: number | null
}

// What the item forms need to offer a special item in the picker.
export type SpecialItemOption = {
  id: string
  name: string
  values: SpecialItemValue[]
}

type ColumnKey = 'group' | 'value' | 'min' | 'expected' | 'max'

const COLUMNS: Record<string, ColumnKey> = {
  group: 'group',
  value: 'value',
  min: 'min',
  expected: 'expected',
  max: 'max',
}

const FIELD_DISPLAY: Record<string, string> = {
  group: 'group',
  value: 'value',
  minMinutes: 'min',
  expectedMinutes: 'expected',
  maxMinutes: 'max',
}

const RowSchema = z
  .object({
    group: optionalLabel,
    value: z.string().min(1, 'is required').max(200),
    minMinutes: optionalMinutes,
    expectedMinutes: optionalMinutes,
    maxMinutes: optionalMinutes,
  })
  .transform(data =>
    data.expectedMinutes == null && data.minMinutes != null && data.maxMinutes != null
      ? {
          ...data,
          expectedMinutes: Math.round(data.minMinutes + data.maxMinutes) / 2,
        }
      : data,
  )
  .superRefine((data, ctx) => {
    if (data.expectedMinutes == null) {
      if (data.minMinutes != null || data.maxMinutes != null) {
        ctx.addIssue({
          code: 'custom',
          path: ['expectedMinutes'],
          message: 'is required when only one of min/max is set',
        })
      }
      return
    }
    checkOrdering(
      ctx,
      data.minMinutes,
      data.expectedMinutes,
      data.maxMinutes,
      'minMinutes',
      'maxMinutes',
    )
  })

const CSV_HEADER = 'group,value,min,expected,max'

export function serializeSpecialItemCsv(values: SpecialItemValue[]): string {
  const rows = values.map(v =>
    [v.group, v.value, v.minMinutes, v.expectedMinutes, v.maxMinutes]
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

  const dataRows = numbered.slice(1)
  if (dataRows.length === 0) {
    return { values: [], errors: ['No values found below the header row'] }
  }

  const errors: string[] = []
  const values: SpecialItemValue[] = []
  const seen = new Map<string, number>()
  for (const { line, no } of dataRows) {
    const cells = splitLine(line, delim)
    const raw: Record<ColumnKey, string> = { group: '', value: '', min: '', expected: '', max: '' }
    columns.forEach((key, i) => {
      if (key) raw[key] = (cells[i] ?? '').trim()
    })

    const parsed = RowSchema.safeParse({
      group: raw.group,
      value: raw.value,
      minMinutes: raw.min,
      expectedMinutes: raw.expected,
      maxMinutes: raw.max,
    })
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

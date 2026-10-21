import { z } from 'zod'
import {
  ITEM_TIME_FIELDS,
  SUB_TIME_FIELDS,
  TIME_KEYS,
  type SubTimeFields,
  type TimeFields,
  type TimeKey,
  checkItemTimes,
  checkSubItem,
  legacyTimes,
  optionalLabel,
  optionalMinutes,
} from '@/lib/item-times'

// Parses agenda CSV pasted by the user (or stored in a Template). Format:
// - delimiter auto-detected from the header line: comma, semicolon, or tab
//   (tab means cells pasted straight from Excel / Google Sheets work);
// - quoted fields supported ("a, b", doubled "" for a literal quote);
// - first row is a header; columns are matched case-insensitively ignoring
//   spaces/underscores/dashes: title, min, green, yellow, red, max, person,
//   sub label, sub min, sub green, sub yellow, sub red, sub max, url. Unknown
//   columns are ignored;
// - legacy files with an "expected" column (and no green/yellow/red) still
//   import: min becomes min+green, expected yellow, red is 30s before max;
// - per row: at least one time, following the shared item rules.

export type ParsedCsvItem = TimeFields &
  SubTimeFields & {
    title: string
    personName: string | null
    subLabel: string | null
    url: string | null
  }

type TimeColumn = TimeKey | `sub${TimeKey}`
type ColumnKey = 'title' | 'person' | 'sublabel' | 'url' | 'expected' | 'subexpected' | TimeColumn

const COLUMN_ALIASES: Record<string, ColumnKey> = {
  title: 'title',
  person: 'person',
  sublabel: 'sublabel',
  url: 'url',
  expected: 'expected',
  subexpected: 'subexpected',
  ...Object.fromEntries(
    TIME_KEYS.flatMap(k => [
      [k, k],
      [`sub${k}`, `sub${k}`],
    ]),
  ),
}

// Human names for error messages, keyed by the row-schema field the issue
// attaches to.
const FIELD_DISPLAY: Record<string, string> = {
  title: 'title',
  personName: 'person',
  subLabel: 'sub label',
  url: 'url',
  ...Object.fromEntries(
    TIME_KEYS.flatMap(k => [
      [ITEM_TIME_FIELDS[k], k],
      [SUB_TIME_FIELDS[k], `sub ${k}`],
    ]),
  ),
}

const RowSchema = z
  .object({
    title: z.string().min(1, 'is required').max(200),
    minMinutes: optionalMinutes,
    greenMinutes: optionalMinutes,
    yellowMinutes: optionalMinutes,
    redMinutes: optionalMinutes,
    maxMinutes: optionalMinutes,
    personName: optionalLabel,
    subLabel: optionalLabel,
    subMinMinutes: optionalMinutes,
    subGreenMinutes: optionalMinutes,
    subYellowMinutes: optionalMinutes,
    subRedMinutes: optionalMinutes,
    subMaxMinutes: optionalMinutes,
    url: z.preprocess(
      v => (v === '' || v === null || v === undefined ? null : v),
      z
        .string()
        .max(2000, 'is too long')
        .refine(v => URL.canParse(v), 'Enter a valid URL (including https://)')
        .nullable(),
    ),
  })
  .superRefine((data, ctx) => {
    checkItemTimes(ctx, data)
    checkSubItem(ctx, data)
  })

export type SerializableAgendaItem = ParsedCsvItem

const CSV_HEADER =
  'title,min,green,yellow,red,max,person,sub label,sub min,sub green,sub yellow,sub red,sub max,url'

export function csvField(value: string | number | null): string {
  if (value == null) return ''
  const text = String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

// Inverse of parseAgendaCsv: produces CSV that round-trips through it.
export function serializeAgendaCsv(items: SerializableAgendaItem[]): string {
  const rows = items.map(item =>
    [
      item.title,
      item.minMinutes,
      item.greenMinutes,
      item.yellowMinutes,
      item.redMinutes,
      item.maxMinutes,
      item.personName,
      item.subLabel,
      item.subMinMinutes,
      item.subGreenMinutes,
      item.subYellowMinutes,
      item.subRedMinutes,
      item.subMaxMinutes,
      item.url,
    ]
      .map(csvField)
      .join(','),
  )
  return [CSV_HEADER, ...rows].join('\n') + '\n'
}

export function normalizeHeader(cell: string): string {
  return cell.toLowerCase().replace(/[\s_-]+/g, '')
}

export function detectDelimiter(headerLine: string): string {
  let best = ','
  let bestCount = 0
  for (const delim of ['\t', ';', ',']) {
    const count = splitLine(headerLine, delim).length - 1
    if (count > bestCount) {
      best = delim
      bestCount = count
    }
  }
  return best
}

// Splits one CSV line on `delim`, honoring double quotes ("" = literal quote).
export function splitLine(line: string, delim: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delim) {
      fields.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current)
  return fields
}

// Old-style cells → strings for green / yellow / red; cells that don't parse
// as a number are left for the row schema to report.
export function legacyOf(min: string, expected: string, max: string) {
  const num = (v: string) => (v !== '' && Number.isFinite(Number(v)) ? Number(v) : null)
  const t = legacyTimes(num(min), num(expected), num(max))
  const str = (n: number | null) => (n == null ? '' : String(n))
  return { green: min ? min : str(t.green), yellow: expected, red: str(t.red) }
}

export function parseAgendaCsv(text: string): {
  items: ParsedCsvItem[]
  errors: string[]
} {
  const lines = text.split(/\r\n|\r|\n/)
  const numbered = lines
    .map((line, i) => ({ line, no: i + 1 }))
    .filter(({ line }) => line.trim() !== '')

  if (numbered.length === 0) {
    return { items: [], errors: ['The CSV is empty'] }
  }

  const headerLine = numbered[0].line
  const delim = detectDelimiter(headerLine)
  const headerCells = splitLine(headerLine, delim).map(normalizeHeader)
  const columns: (ColumnKey | null)[] = headerCells.map(
    cell => COLUMN_ALIASES[cell] ?? null,
  )

  const errors: string[] = []
  if (!columns.includes('title')) {
    return {
      items: [],
      errors: ['The first row must be a header including at least a "title" column'],
    }
  }
  const legacy = columns.includes('expected') || columns.includes('subexpected')

  const dataRows = numbered.slice(1)
  if (dataRows.length === 0) {
    return { items: [], errors: ['No agenda items found below the header row'] }
  }

  const items: ParsedCsvItem[] = []
  for (const { line, no } of dataRows) {
    const cells = splitLine(line, delim)
    const raw: Partial<Record<ColumnKey, string>> = {}
    columns.forEach((key, i) => {
      if (key) raw[key] = (cells[i] ?? '').trim()
    })
    const field = (key: ColumnKey) => raw[key] ?? ''

    const input: Record<string, string> = {
      title: field('title'),
      personName: field('person'),
      subLabel: field('sublabel'),
      url: field('url'),
    }
    for (const key of TIME_KEYS) {
      input[ITEM_TIME_FIELDS[key]] = field(key)
      input[SUB_TIME_FIELDS[key]] = field(`sub${key}`)
    }
    if (legacy) {
      // Old min / expected / max: only fill what the file doesn't say itself.
      const old = legacyOf(field('min'), field('expected'), field('max'))
      const oldSub = legacyOf(field('submin'), field('subexpected'), field('submax'))
      for (const key of ['green', 'yellow', 'red'] as const) {
        if (!field(key)) input[ITEM_TIME_FIELDS[key]] = old[key]
        if (!field(`sub${key}`)) input[SUB_TIME_FIELDS[key]] = oldSub[key]
      }
    }

    const parsed = RowSchema.safeParse(input)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const fieldName = String(issue.path[0] ?? '')
        const name = FIELD_DISPLAY[fieldName] ?? fieldName
        errors.push(`Line ${no}: ${name} — ${issue.message}`)
      }
      continue
    }
    items.push(parsed.data)
  }

  return { items: errors.length > 0 ? [] : items, errors }
}

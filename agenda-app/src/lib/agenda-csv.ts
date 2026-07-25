import { z } from 'zod'
import { checkOrdering, checkSubItem, optionalLabel, optionalMinutes } from '@/lib/item-times'

// Parses agenda CSV pasted by the user (or stored in a Template). Format:
// - delimiter auto-detected from the header line: comma, semicolon, or tab
//   (tab means cells pasted straight from Excel / Google Sheets work);
// - quoted fields supported ("a, b", doubled "" for a literal quote);
// - first row is a header; columns are matched case-insensitively ignoring
//   spaces/underscores/dashes: title, min, expected, max, person, sub label,
//   sub min, sub expected, sub max. Unknown columns are ignored;
// - per row: title + expected required, times follow the shared item rules.

export type ParsedCsvItem = {
  title: string
  minMinutes: number | null
  durationMinutes: number
  maxMinutes: number | null
  personName: string | null
  subLabel: string | null
  subMinMinutes: number | null
  subExpectedMinutes: number | null
  subMaxMinutes: number | null
}

type ColumnKey =
  | 'title'
  | 'min'
  | 'expected'
  | 'max'
  | 'person'
  | 'sublabel'
  | 'submin'
  | 'subexpected'
  | 'submax'

const COLUMN_ALIASES: Record<string, ColumnKey> = {
  title: 'title',
  min: 'min',
  expected: 'expected',
  max: 'max',
  person: 'person',
  sublabel: 'sublabel',
  submin: 'submin',
  subexpected: 'subexpected',
  submax: 'submax',
}

// Human names for error messages, keyed by the row-schema field the issue
// attaches to.
const FIELD_DISPLAY: Record<string, string> = {
  title: 'title',
  minMinutes: 'min',
  durationMinutes: 'expected',
  maxMinutes: 'max',
  personName: 'person',
  subLabel: 'sub label',
  subMinMinutes: 'sub min',
  subExpectedMinutes: 'sub expected',
  subMaxMinutes: 'sub max',
}

const RowSchema = z
  .object({
    title: z.string().min(1, 'is required').max(200),
    minMinutes: optionalMinutes,
    durationMinutes: optionalMinutes,
    maxMinutes: optionalMinutes,
    personName: optionalLabel,
    subLabel: optionalLabel,
    subMinMinutes: optionalMinutes,
    subExpectedMinutes: optionalMinutes,
    subMaxMinutes: optionalMinutes,
  })
  .superRefine((data, ctx) => {
    if (data.durationMinutes == null) {
      ctx.addIssue({ code: 'custom', path: ['durationMinutes'], message: 'is required' })
      return
    }
    checkOrdering(
      ctx,
      data.minMinutes,
      data.durationMinutes,
      data.maxMinutes,
      'minMinutes',
      'maxMinutes',
    )
    checkSubItem(ctx, data)
  })

function normalizeHeader(cell: string): string {
  return cell.toLowerCase().replace(/[\s_-]+/g, '')
}

function detectDelimiter(headerLine: string): string {
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
function splitLine(line: string, delim: string): string[] {
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
  if (!columns.includes('title') || !columns.includes('expected')) {
    return {
      items: [],
      errors: [
        'The first row must be a header including at least "title" and "expected" columns',
      ],
    }
  }

  const dataRows = numbered.slice(1)
  if (dataRows.length === 0) {
    return { items: [], errors: ['No agenda items found below the header row'] }
  }

  const items: ParsedCsvItem[] = []
  for (const { line, no } of dataRows) {
    const cells = splitLine(line, delim)
    const raw: Record<ColumnKey, string> = {
      title: '',
      min: '',
      expected: '',
      max: '',
      person: '',
      sublabel: '',
      submin: '',
      subexpected: '',
      submax: '',
    }
    columns.forEach((key, i) => {
      if (key) raw[key] = (cells[i] ?? '').trim()
    })

    const parsed = RowSchema.safeParse({
      title: raw.title,
      minMinutes: raw.min,
      durationMinutes: raw.expected,
      maxMinutes: raw.max,
      personName: raw.person,
      subLabel: raw.sublabel,
      subMinMinutes: raw.submin,
      subExpectedMinutes: raw.subexpected,
      subMaxMinutes: raw.submax,
    })
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? '')
        const name = FIELD_DISPLAY[field] ?? field
        errors.push(`Line ${no}: ${name} — ${issue.message}`)
      }
      continue
    }
    // durationMinutes is guaranteed non-null by the superRefine above.
    items.push({ ...parsed.data, durationMinutes: parsed.data.durationMinutes! })
  }

  return { items: errors.length > 0 ? [] : items, errors }
}

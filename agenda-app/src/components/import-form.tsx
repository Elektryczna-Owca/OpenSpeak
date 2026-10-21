'use client'

import { useActionState, useState } from 'react'
import { importAgendaAction, type ImportFormState } from '@/actions/import-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Upload } from 'lucide-react'

const selectClass =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30'

export function ImportForm({
  templates,
}: {
  templates: { id: string; name: string; csv: string }[]
}) {
  const [state, formAction, pending] = useActionState<ImportFormState, FormData>(
    importAgendaAction,
    {},
  )
  const [csv, setCsv] = useState('')

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="title">Agenda title</Label>
        <Input
          id="title"
          name="title"
          required
          maxLength={200}
          placeholder="Weekly club meeting"
          aria-invalid={!!state.errors?.title}
        />
        {state.errors?.title && (
          <p className="text-sm text-destructive">{state.errors.title[0]}</p>
        )}
      </div>

      {templates.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="template">Start from a template (optional)</Label>
          <select
            id="template"
            defaultValue=""
            className={selectClass}
            onChange={e => {
              const template = templates.find(t => t.id === e.target.value)
              if (template) setCsv(template.csv)
            }}
          >
            <option value="">— pick a template —</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="csv">Agenda CSV</Label>
        <Textarea
          id="csv"
          name="csv"
          value={csv}
          onChange={e => setCsv(e.target.value)}
          required
          rows={14}
          className="font-mono text-sm"
          placeholder={`title,min,green,yellow,red,max,person,sub label,sub min,sub green,sub yellow,sub red,sub max\nOpening,2,2,3,4.5,5,,,,,,,\nPrepared speeches,2,2,3,3.5,4,,Speaker,5,5,6,7,7.5`}
          aria-invalid={!!state.errors?.csv}
        />
        {state.errors?.csv && (
          <ul className="space-y-0.5 text-sm text-destructive">
            {state.errors.csv.map(error => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
        <p className="text-sm text-muted-foreground">
          First row is a header. Recognized columns: title, min, green, yellow,
          red, max, person, sub label, sub min, sub green, sub yellow, sub red,
          sub max — in any order; title and at least one time are required (old
          min / expected / max files still import). Comma, semicolon, or tab delimited
          (pasting cells from a spreadsheet works). Times are minutes in half-minute
          steps. A person name adds that participant and assigns the item.
        </p>
      </div>

      <Button type="submit" disabled={pending}>
        <Upload className="h-4 w-4" />
        Import agenda
      </Button>
    </form>
  )
}

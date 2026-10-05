'use client'

import { useActionState, useRef } from 'react'
import {
  createSpecialItemAction,
  updateSpecialItemAction,
  type SpecialItemFormState,
} from '@/actions/special-item-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Upload } from 'lucide-react'

type Props =
  | { mode: 'create' }
  | { mode: 'edit'; id: string; defaultName: string; defaultCsv: string }

export function SpecialItemForm(props: Props) {
  const action =
    props.mode === 'create'
      ? createSpecialItemAction
      : updateSpecialItemAction.bind(null, props.id)
  const [state, formAction, pending] = useActionState<SpecialItemFormState, FormData>(
    action,
    {},
  )
  const nameRef = useRef<HTMLInputElement>(null)
  const csvRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Loads a CSV file into the textarea; it is validated and stored on save.
  async function loadFile(file: File) {
    if (csvRef.current) csvRef.current.value = await file.text()
    if (nameRef.current && nameRef.current.value === '') {
      nameRef.current.value = file.name.replace(/\.[^.]*$/, '').replace(/[-_]+/g, ' ')
    }
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          ref={nameRef}
          required
          maxLength={200}
          defaultValue={props.mode === 'edit' ? props.defaultName : ''}
          placeholder="Pathways project"
          aria-invalid={!!state.errors?.name}
        />
        {state.errors?.name && (
          <p className="text-sm text-destructive">{state.errors.name[0]}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-end justify-between gap-3">
          <Label htmlFor="csv">Values CSV</Label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.tsv,.txt,text/csv,text/plain"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) void loadFile(file)
              e.target.value = ''
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Load CSV file
          </Button>
        </div>
        <Textarea
          id="csv"
          name="csv"
          ref={csvRef}
          required
          rows={14}
          className="font-mono text-sm"
          defaultValue={props.mode === 'edit' ? props.defaultCsv : ''}
          placeholder={`group,value,min,expected,max\nPresentation Mastery,PM (L1) Ice Breaker,4,5,6\nPresentation Mastery,PM (L2) Effective Body Language,5,6,7`}
          aria-invalid={!!state.errors?.csv}
        />
        {state.errors?.csv && (
          <ul className="space-y-0.5 text-sm text-destructive">
            {state.errors.csv.slice(0, 20).map(error => (
              <li key={error}>{error}</li>
            ))}
            {state.errors.csv.length > 20 && (
              <li>…and {state.errors.csv.length - 20} more</li>
            )}
          </ul>
        )}
        <p className="text-sm text-muted-foreground">
          Header row with value (required), and optionally group, min, expected,
          max — in any order; comma, semicolon, or tab delimited. Group clusters
          values in the picker. Times are minutes in half-minute steps; an empty
          expected defaults to the midpoint of min and max. Values must be unique.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {props.mode === 'create' ? 'Create special item' : 'Save changes'}
        </Button>
        {props.mode === 'edit' && state.ok && (
          <span className="text-sm text-muted-foreground">Saved.</span>
        )}
      </div>
    </form>
  )
}

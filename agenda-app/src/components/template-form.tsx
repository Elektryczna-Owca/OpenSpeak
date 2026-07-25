'use client'

import { useActionState } from 'react'
import {
  createTemplateAction,
  updateTemplateAction,
  type TemplateFormState,
} from '@/actions/template-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Props =
  | { mode: 'create' }
  | { mode: 'edit'; id: string; defaultName: string; defaultCsv: string }

export function TemplateForm(props: Props) {
  const action =
    props.mode === 'create'
      ? createTemplateAction
      : updateTemplateAction.bind(null, props.id)
  const [state, formAction, pending] = useActionState<TemplateFormState, FormData>(
    action,
    {},
  )

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={200}
          defaultValue={props.mode === 'edit' ? props.defaultName : ''}
          placeholder="Toastmasters club meeting"
          aria-invalid={!!state.errors?.name}
        />
        {state.errors?.name && (
          <p className="text-sm text-destructive">{state.errors.name[0]}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="csv">Agenda CSV</Label>
        <Textarea
          id="csv"
          name="csv"
          required
          rows={14}
          className="font-mono text-sm"
          defaultValue={props.mode === 'edit' ? props.defaultCsv : ''}
          placeholder={`title,min,expected,max,sub label,sub min,sub expected,sub max\nOpening,2,3,5,,,,\nPrepared speeches,2,3,4,Speaker,5,6,7`}
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
          Same format as the import page: header row with title, min, expected,
          max, person, sub label, sub min, sub expected, sub max. The CSV is
          validated on save.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {props.mode === 'create' ? 'Create template' : 'Save changes'}
        </Button>
        {props.mode === 'edit' && state.ok && (
          <span className="text-sm text-muted-foreground">Saved.</span>
        )}
      </div>
    </form>
  )
}

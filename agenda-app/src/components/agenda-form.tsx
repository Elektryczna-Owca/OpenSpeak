'use client'

import { useActionState } from 'react'
import {
  createAgendaAction,
  updateAgendaAction,
  type AgendaFormState,
} from '@/actions/agenda-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TimezoneSelect } from '@/components/timezone-select'
import { utcToZonedWallInput } from '@/lib/datetime'

type Props =
  | { mode: 'create' }
  | {
      mode: 'edit'
      id: string
      defaultTitle: string
      defaultDescription: string | null
      defaultStartAt: string | null
      defaultTimezone: string | null
    }

export function AgendaForm(props: Props) {
  const action =
    props.mode === 'create'
      ? createAgendaAction
      : updateAgendaAction.bind(null, props.id)
  const [state, formAction, pending] = useActionState<AgendaFormState, FormData>(
    action,
    {},
  )

  const defaultTimezone =
    props.mode === 'edit' ? props.defaultTimezone : null
  const defaultStartInput =
    props.mode === 'edit' && props.defaultStartAt && props.defaultTimezone
      ? utcToZonedWallInput(new Date(props.defaultStartAt), props.defaultTimezone)
      : ''

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          required
          maxLength={200}
          defaultValue={props.mode === 'edit' ? props.defaultTitle : ''}
          placeholder="Weekly team sync"
          aria-invalid={!!state.errors?.title}
        />
        {state.errors?.title && (
          <p className="text-sm text-destructive">{state.errors.title[0]}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          name="description"
          maxLength={1000}
          defaultValue={props.mode === 'edit' ? props.defaultDescription ?? '' : ''}
          placeholder="What is this meeting about?"
          rows={3}
        />
        {state.errors?.description && (
          <p className="text-sm text-destructive">
            {state.errors.description[0]}
          </p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="startAt">Start (optional)</Label>
          <Input
            id="startAt"
            name="startAt"
            type="datetime-local"
            defaultValue={defaultStartInput}
            aria-invalid={!!state.errors?.startAt}
          />
          {state.errors?.startAt && (
            <p className="text-sm text-destructive">{state.errors.startAt[0]}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <TimezoneSelect id="timezone" defaultValue={defaultTimezone} />
          {state.errors?.timezone && (
            <p className="text-sm text-destructive">{state.errors.timezone[0]}</p>
          )}
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {props.mode === 'create' ? 'Create agenda' : 'Save changes'}
      </Button>
    </form>
  )
}

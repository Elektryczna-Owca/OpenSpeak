'use client'

import { X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { type TimerStage, timerStageSurfaceClass } from '@/lib/timer-color'

// Full-screen presentation of the running meeting: what's happening now in the
// largest type that fits, the timer stage painted across the whole background,
// and nothing else but a small timer and the next item along the bottom, plus
// the item's QR code in the bottom-right corner when it has a URL.
//
// Purely presentational — MeetingDisplay owns the run state and hands the
// already-derived labels down. Secondary text uses opacity rather than
// text-muted-foreground: on the green/yellow/red stages the foreground is
// fixed by timerStageSurfaceClass, so theme tokens would clash.
export function MeetingFocus({
  eyebrow,
  headline,
  subline,
  elapsedLabel,
  stage,
  paused,
  nextLabel,
  nextStartLabel,
  qrUrl,
  onQrClick,
  onExit,
}: {
  eyebrow: string | null
  headline: string
  subline: string | null
  elapsedLabel: string
  stage: TimerStage
  paused: boolean
  nextLabel: string | null
  nextStartLabel: string | null
  qrUrl: string | null
  onQrClick: () => void
  onExit: () => void
}) {
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col transition-colors duration-500 ${timerStageSurfaceClass(
        stage,
      )}`}
    >
      <div className="flex justify-end p-4">
        <button
          type="button"
          onClick={onExit}
          aria-label="Leave full-screen mode"
          className="cursor-pointer opacity-40 transition-opacity hover:opacity-100"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-hidden px-8 text-center">
        {eyebrow && (
          <p className="text-2xl font-medium tracking-widest uppercase opacity-70">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[clamp(3rem,11vw,13rem)] leading-none font-semibold text-balance break-words">
          {headline}
        </h1>
        {subline && (
          <p className="text-[clamp(1.5rem,4vw,4rem)] leading-tight opacity-80">
            {subline}
          </p>
        )}
      </div>

      <div
        className={`flex items-baseline justify-between gap-6 px-8 pb-8 text-[clamp(1.25rem,3vw,2.5rem)] ${
          qrUrl ? 'pr-52' : ''
        }`}
      >
        <span className="flex shrink-0 items-baseline gap-3">
          <span
            className={`font-mono tabular-nums ${stage === 'idle' && !paused ? 'opacity-60' : ''}`}
          >
            {elapsedLabel}
          </span>
          {paused && (
            <span className="text-base font-medium tracking-widest uppercase opacity-70">
              Paused
            </span>
          )}
        </span>
        {nextLabel && (
          <span className="min-w-0 truncate opacity-70">
            Next:{' '}
            {nextStartLabel && (
              <span className="font-mono tabular-nums">{nextStartLabel} </span>
            )}
            {nextLabel}
          </span>
        )}
      </div>

      {qrUrl && (
        // White backdrop with a quiet zone so the code scans on every stage
        // color; a click blows it up to the full-page overlay.
        <button
          type="button"
          onClick={onQrClick}
          title={qrUrl}
          aria-label="Show QR code full screen"
          className="absolute right-8 bottom-8 cursor-zoom-in rounded-lg bg-white p-2"
        >
          <QRCodeSVG
            value={qrUrl}
            size={512}
            marginSize={0}
            className="h-[clamp(7rem,14vw,16rem)] w-[clamp(7rem,14vw,16rem)]"
          />
        </button>
      )}
    </div>
  )
}

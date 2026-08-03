---
title: The display screen
description: The read-only projector view — planned schedule before the meeting, the big timer and QR code during it.
---

**Run meeting** on an agenda opens the display screen. Put it on the projector or a shared screen — it's read-only and follows the meeting on its own; nobody needs to touch it. (Its header links to the [control screen](/running/control-screen/), which is what the meeting is driven from.)

## Before the meeting: the planned schedule

With no meeting running, the display shows the plan:

- The agenda's title, description, and totals ("8 items · 90 min").
- A **schedule table** — `Start | Item | Expected`. Start times are computed from the agenda's scheduled start plus the expected durations of everything before, shown as wall-clock times (`19:00`, `19:15`) in the agenda's timezone. **If the agenda has no start time, they appear as offsets instead: `+0:00`, `+0:15`, `+1:05`.**
- Each row shows the item's assignee and its sub-item note ("Speaker: 6 min each"). Because [sub-item rounds are open-ended](/concepts/sub-item-loops/#one-planning-caveat), only the item's own expected time counts toward the schedule.
- An **Estimated end** row at the bottom.
- A list of **past runs** (newest first) linking to their [reports](/running/reports/); finished runs can be deleted here (trash icon, with confirmation). A run that is still open can't be deleted.

The moment someone starts the meeting — from any device — this page flips to the live view by itself.

<!-- TODO screenshot: display screen with planned schedule -->

## During the meeting

The live view is built to be readable from the back of the room:

- A huge timer in the [standard colors](/running/overview/#timer-colors), with the item title above it and, during a speaker round, a second line like "Speaker 3 — Jane Doe".
- A **thresholds line** under the timer: `min 5 · expected 6 · max 7 min` (missing thresholds are simply omitted).
- **Between items**, the heading is prefixed **UP NEXT**, the timer shows a muted `00:00`, and the thresholds shown are the *upcoming* item's — the room always knows what's coming.
- The **remaining agenda** below: the current item highlighted, the rest greyed out, and the next item prefixed with its planned start time — so everyone can see how far ahead or behind the meeting is running.
- While paused, the timer freezes, turns grey, and shows **PAUSED**.

<!-- TODO screenshot: display screen during a running item -->

## The QR code

If the current (or up-next) item has a URL, a **QR code** appears next to the timer — always on a white card so it scans in every palette. Hover to see the URL.

**Click the QR code to blow it up to a full-screen overlay** with the URL printed underneath — big enough for the whole room to scan, perfect for "vote for best speaker" forms. Click again or press Escape to close.

## When the meeting ends

The display navigates to the finished run's [report](/running/reports/) automatically — the projector ends the evening showing the results.

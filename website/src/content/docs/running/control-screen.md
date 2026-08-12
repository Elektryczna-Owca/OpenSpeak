---
title: The control screen
description: The phone remote that drives the meeting — every button, the two-tap confirms, and the max-time beep.
---

The control screen is a phone-sized remote with big touch targets — and the **only** surface that changes the meeting. Reach it from the display screen's header, or directly at the agenda's control URL. Its own header links back to the agenda, to the live [report](/running/reports/), and to the [display](/running/display-screen/).

Give it to whoever plays timekeeper. Several people can have it open at once; the last tap wins.

## Before the meeting

One big button: **Start meeting**. Tapping it starts the first agenda item's timer immediately — there is no countdown or separate arming step. (If the agenda has no items yet, the page says so instead.)

Like the display, an idle control page notices a meeting started from another device and switches to the live view automatically.

## While an item is running

The item's title, a large color-coded timer, the thresholds line, and:

- **Finish agenda item** (or **Finish speaker 2** during a [sub-item round](/concepts/sub-item-loops/)) — closes the current timer. The meeting is then *between items*: nothing runs until you start the next thing.
- **Pause / Resume** — freezes and resumes the clock; [paused time counts nowhere](/running/overview/#pause).
- **Skip agenda item** — two-tap confirm: the first tap turns the button red and re-labels it "Tap again to skip"; it disarms by itself after 3 seconds. Skipped items appear in the report as *skipped*.
- **End meeting** — same two-tap pattern ("Tap again to end"). Ending sends you — and the display — to the report.
- An **Up next** hint showing what follows.

During a sub-item round, a **participant dropdown** lets you record who this speaker is; the name is saved on that round and shows in the report. Just below it, a **comment** box takes a free-text note for that round — the speech title, a table-topics question, anything worth remembering. It saves as you type (and when you tap away), and each round keeps its own note. Notes only show up in the [report](/running/reports/) if you write one; the projector never shows them.

<!-- TODO screenshot: control screen with a running item -->

## Between items

After a finish or skip, the screen shows **UP NEXT** with the coming item (or next speaker) and its thresholds, plus what just happened ("Finished: Prepared speeches — 06:12"), and:

- **Start agenda item** / **Start speaker 3** — starts the next timer.
- **Finish agenda item** — shown while inside a sub-item loop; closes the round so the next start moves to the next agenda item.
- **Finish meeting** — replaces the start button when nothing is left.

## The max-time beep

The moment a running timer reaches its **max** threshold, the control page plays a discreet **double beep** (two short high pips). It fires at most once per timer, and only on a live crossing — opening the page on something already over max stays silent.

The beep plays **only on the control device** — the projector stays silent by design.

:::note[No sound?]
Browsers only allow sound after you've interacted with the page. Tap anywhere on the control page once after opening it and the beep will be armed. If sound stays blocked, the red timer is the fallback signal.
:::

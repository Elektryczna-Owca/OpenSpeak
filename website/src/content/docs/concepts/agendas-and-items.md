---
title: Agendas, items & time limits
description: The building blocks of an OpenSpeak meeting — agendas, agenda items, and the min/expected/max time thresholds.
---

## Agendas

An **agenda** is one meeting plan: an ordered list of timed items plus a roster of participants. It has:

- **Title** — required.
- **Description** — optional, shown on the display screen before the meeting starts (line breaks are preserved).
- **Scheduled start** — optional date and time, with a timezone. If you set a start time you must pick a timezone; it defaults to your browser's. Start times are stored as an absolute instant plus the chosen timezone, so they display correctly on any device anywhere.

The **Agendas** page lists all agendas, most recently updated first, with each card showing the item count, the total expected minutes, and the scheduled start.

One agenda can be run many times — each run keeps its own history. See [Reports](/running/reports/).

:::caution
Deleting an agenda deletes everything in it: its items, its participants, **and all of its past meeting runs and reports**. There is no undo.
:::

## Agenda items

An **item** is one timed block of the meeting — a speech, a report, a break. It has:

- **Title** — required.
- **Time thresholds** — *Min*, *Expected*, and *Max* minutes (details below).
- **Assignee** — optionally, one of the agenda's [participants](/concepts/participants/).
- **URL** — optional. While the item runs, the URL is shown as a **QR code** on the display screen — handy for a voting form or slides link. It must be a full URL including `https://`.
- **Sub-item loop** — optional per-participant rounds; see [Sub-item loops](/concepts/sub-item-loops/).

## The three time thresholds

Every item (and every sub-item round) carries up to three times, always in the order **min ≤ expected ≤ max**:

| Threshold | Meaning | Required? |
|---|---|---|
| **Min** | The minimum a good contribution should take | optional |
| **Expected** | The planned/target duration | **required** |
| **Max** | The hard upper limit | optional |

Times are entered in **minutes**, from 0.5 to 600, in **half-minute steps** — so `1.5` means 90 seconds, and `10` or `10.5` are both fine, but `10.25` is not.

Each threshold drives something different during and after the meeting:

- **Expected** is used for planning: the schedule on the display screen adds up expected times to compute each item's planned start and the estimated end of the meeting.
- **All three** drive the live **timer colors**: the timer starts **white**, turns **green** when the minimum is reached, **yellow** at the expected time, and **red** 30 seconds before the maximum. A threshold you didn't set simply skips its stage.
- **Max** additionally triggers a beep on the [control screen](/running/control-screen/) the moment it is reached.
- **All three** appear in the [report](/running/reports/), where each item's status (*under min*, *on time*, *over expected*, *over max*) is judged against them.

The white/green/yellow/red colors are intentionally identical in every color palette — they mirror the physical timing cards used at Toastmasters meetings, so the whole room reads them instantly.

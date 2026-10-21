---
title: Agendas, items & time limits
description: The building blocks of an OpenSpeak meeting — agendas, agenda items, and the min/green/yellow/red/max time thresholds.
---

## Agendas

An **agenda** is one meeting plan: an ordered list of timed items plus a roster of participants. It has:

- **Title** — required.
- **Description** — optional, shown on the display screen before the meeting starts (line breaks are preserved).
- **Scheduled start** — optional date and time, with a timezone. If you set a start time you must pick a timezone; it defaults to your browser's. Start times are stored as an absolute instant plus the chosen timezone, so they display correctly on any device anywhere.

The **Agendas** page lists all agendas, most recently updated first, with each card showing the item count, the total planned minutes, and the scheduled start.

One agenda can be run many times — each run keeps its own history. See [Reports](/running/reports/).

:::caution
Deleting an agenda deletes everything in it: its items, its participants, **and all of its past meeting runs and reports**. There is no undo.
:::

## Agenda items

An **item** is one timed block of the meeting — a speech, a report, a break. It has:

- **Title** — required.
- **Time thresholds** — *Min*, *Green*, *Yellow*, *Red*, and *Max* minutes (details below).
- **Assignee** — optionally, one of the agenda's [participants](/concepts/participants/).
- **URL** — optional. While the item runs, the URL is shown as a **QR code** on the display screen — handy for a voting form or slides link. It must be a full URL including `https://`.
- **Description** — optional free text (up to 2000 characters), set in the item's edit dialog. It shows on the item card and on the [display screen](/running/display-screen/) under the item's title while it is current or up next.
- **Sub-item loop** — optional per-participant rounds; see [Sub-item loops](/concepts/sub-item-loops/).

## The five time thresholds

Every item (and every sub-item round) carries up to five times, always in the order **min ≤ green ≤ yellow ≤ red ≤ max** (only the ones you set are checked):

| Threshold | Meaning |
|---|---|
| **Min** | The least a good contribution should take |
| **Green** | The timer turns green — the green timing card |
| **Yellow** | The timer turns yellow — the yellow card |
| **Red** | The timer turns red — the red card; also the planned duration |
| **Max** | The hard upper limit |

All five are optional, but an item needs at least one. Items that only have a limit (say, a 2-minute welcome) can set just **Max**.

Times are entered in **minutes**, from 0.5 to 600, in **half-minute steps** — so `1.5` means 90 seconds, and `10` or `10.5` are both fine, but `10.25` is not.

Each threshold drives something different during and after the meeting:

- The **planned duration** is the red time (falling back to yellow, max, green, then min when red isn't set). The schedule on the display screen adds these up to compute each item's planned start and the estimated end of the meeting.
- **Green, yellow, and red** drive the live **timer colors**: the timer starts **white** and turns green, yellow, and red as each time is reached. A threshold you didn't set simply skips its stage.
- **Max** triggers a beep on the [control screen](/running/control-screen/) the moment it is reached.
- **Min and max** bound the *within time* verdict in the control screen's table view and the status in the [report](/running/reports/) (*under min*, *on time*, *over max*).

Agendas created before the five-time change were converted automatically: green is the old min, yellow the old expected time, and red 30 seconds before the old max.

The white/green/yellow/red colors are intentionally identical in every color palette — they mirror the physical timing cards used at Toastmasters meetings, so the whole room reads them instantly.

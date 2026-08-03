---
title: FAQ & troubleshooting
description: Quick answers about logins, sound, sync, timezones, pauses, and the things OpenSpeak deliberately doesn't do.
---

## Access & accounts

### Is there a login?

No. OpenSpeak has no accounts — anyone who can reach the URL can view and edit everything. It's designed for a single club or team on its own instance. If that's too open, restrict access at the network level (VPN, IP allowlist, or HTTP auth on your reverse proxy).

### Can two people control the meeting at the same time?

Yes. Any number of control pages can be open; the server is the single source of truth and the last tap wins. This is handy for a backup timekeeper.

## During the meeting

### The display isn't updating.

All screens sync by polling the server once per second. If the display froze, it lost its network connection — it will catch up by itself as soon as connectivity returns (the state is on the server, so nothing is lost). Check the device's Wi-Fi.

### There's no beep when time runs out.

The [max-time beep](/running/control-screen/#the-max-time-beep) plays **only on the control page**, never on the display — so the projector doesn't beep, by design. On the control device, browsers require one interaction before they allow sound: tap the page once after opening it. Also note the beep only fires when max is *crossed live*, and only once per timer.

### I paused for a while — now the times look "wrong".

They're right: paused time is excluded everywhere, deliberately. A 7-minute speech with a 3-minute pause shows 7 minutes of actual time, and the timer colors and beep also ignored the pause.

### Someone reloaded the phone / the battery died mid-meeting.

Nothing happened to the meeting. Open the control URL on any device and continue — the full state lives on the server.

## Planning & data

### What timezone are start times shown in?

The one chosen on the agenda. Start times are stored as an absolute moment plus the agenda's timezone, so every device shows the same wall-clock time regardless of where it is.

### I edited the agenda after the meeting — did my old reports change?

No. Every report row is a [snapshot taken when that segment started](/running/reports/#history-never-changes). Renaming, retiming, or deleting items and participants never rewrites history.

### My CSV won't import.

Import is [all-or-nothing](/planning/csv-import/#format-rules): one bad row blocks everything, and each problem is listed with its line and field. The usual suspects: missing `title` or `expected` (both required on every row), times that aren't whole or half minutes (0.5–600), or a sub-item value without a `sub expected`. See the [CSV reference](/reference/csv-columns/).

### Why did the schedule drift once the speeches started?

Speaker rounds are open-ended, so the [planned schedule counts only each item's own expected time](/concepts/sub-item-loops/#one-planning-caveat), not "number of speakers × time" — it can't know how many speakers will turn up. The display shows the next item's planned start so the room can see the drift.

## Scope

### Can I export a report, print an agenda, or send calendar invites?

Not currently. OpenSpeak exports agendas as [CSV](/reference/csv-columns/), but reports have no export, there is no print layout, and no email or calendar integration. The report page itself is a plain URL you can share or screenshot.

### The timer colors don't match my palette.

Intentional: white → green → yellow → red are [fixed in every palette](/running/overview/#timer-colors), mirroring physical Toastmasters timing cards, so the room always reads them the same way.

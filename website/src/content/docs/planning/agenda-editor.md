---
title: The agenda editor
description: Build and reorder the meeting plan — add items fast, edit details in the dialog, export to CSV.
---

Open any agenda from the **Agendas** list to land in its editor. The top of the page holds the agenda's own settings (title, description, scheduled start, timezone — edited in place with **Save changes**), a stats row, and the **Run meeting**, **Export CSV**, and **Delete** buttons.

<!-- TODO screenshot: agenda editor overview -->

## Adding items quickly

The row at the bottom of the item list is built for speed: **title → Min → Expected → Max → assignee → Add**. Only the title and **Expected** (pre-filled with 10 minutes) are required. After each add, the form clears and refocuses the title field, so entering a full agenda is one uninterrupted typing session.

The assignee dropdown appears once the agenda has [participants](/concepts/participants/).

Sub-item loops can't be configured from the quick-add row — add the item first, then open its edit dialog.

## Editing an item

The pencil icon opens the full edit dialog:

- **Title**
- **URL** — optional; shown as a QR code during the meeting. Must be a complete URL including `https://`.
- **Min / Expected / Max** — minutes, half-minute steps, `min ≤ expected ≤ max` (the dialog tells you exactly which rule you broke).
- **Assignee**
- **Sub-item** — label plus its own min/expected/max; active only when the sub-item's Expected is set. See [Sub-item loops](/concepts/sub-item-loops/).

## Reordering

Drag items by the **grip handle** — the new order saves immediately. Reordering also works from the keyboard: focus the handle and use the keyboard sensor to pick up, move, and drop an item. (A drag only starts after a few pixels of movement, so ordinary taps and clicks never grab an item by accident.)

## Deleting

The trash icon removes an item after a native browser confirmation. Numbering stays contiguous. Deleting an item does not touch past meeting reports — they keep the label and times [snapshotted when the meeting ran](/running/reports/#history-never-changes).

## Export CSV

**Export CSV** downloads the agenda in exactly the format the [CSV import](/planning/csv-import/) understands — items, times, sub-item loops, and participant names all round-trip. Use it to:

- duplicate an agenda (export → import under a new title),
- save a recurring meeting as a [template](/planning/templates/),
- keep a plain-text backup.

Three things are **not** exported: item **URLs**, the agenda **description**, and the **scheduled start/timezone**. If you rely on export as a backup, note those down separately.

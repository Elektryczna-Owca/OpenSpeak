---
title: CSV format reference
description: Every column, rule, and edge case of the agenda CSV format used by import, export, and templates.
---

The same CSV format is used by [import](/planning/csv-import/), [export](/planning/agenda-editor/#export-csv), and [templates](/planning/templates/). This page is the complete rulebook.

## Columns

The first row must be a header. Columns may appear in **any order**; names are matched **case-insensitively, ignoring spaces, underscores, and dashes** (`Sub Yellow`, `sub_yellow`, and `SUB-YELLOW` are all the same column). Unknown columns are ignored.

| Column | Required | Value |
|---|---|---|
| `title` | **yes** | Item title (non-empty on every row) |
| `min` | no* | Minutes — minimum time |
| `green` | no* | Minutes — the timer turns green |
| `yellow` | no* | Minutes — the timer turns yellow |
| `red` | no* | Minutes — the timer turns red; also the planned time |
| `max` | no* | Minutes — maximum time |
| `person` | no | Participant name; created on the agenda and assigned to this item |
| `sub label` | no | What one sub-slot is called (e.g. `Speaker`); defaults to "Sub-item" |
| `sub min`, `sub green`, `sub yellow`, `sub red`, `sub max` | no | Minutes — the same five times per slot; **setting any of them activates the sub-item loop** |
| `url` | no | Item URL, shown as a QR code (must be a valid URL including `https://`) |

\* every row needs **at least one** of `min`, `green`, `yellow`, `red`, `max`. A `sub label` without any sub time is an error.

**Old files still import:** a file with an `expected` column (and no `green` / `yellow` / `red`) is converted — `min` also becomes green, `expected` becomes yellow, and red is 30 seconds before `max` (likewise `sub expected`).

## Values

- **Times** are minutes from **0.5 to 600**, in **half-minute steps**: `3`, `7.5`, `90` — not `2.25`.
- **Ordering** is enforced where set: `min ≤ green ≤ yellow ≤ red ≤ max` over whichever are set (same for the `sub` times).
- **`person`**: the same name on multiple rows becomes a single participant.

## Parsing

- **Delimiter** is auto-detected per file: tab, semicolon, or comma — so a direct paste from Excel or Google Sheets (tab-separated) works unchanged.
- **Quoting**: fields may be wrapped in double quotes; a quoted field can contain the delimiter and newlines-free text; `""` inside a quoted field is a literal quote.
- **Blank lines** are skipped.

## Errors

Validation is **all-or-nothing**: if any row fails, nothing is imported, and every problem is listed with its line number and field, e.g.:

```
Line 4: sub yellow — Set a time for the sub-item
Line 7: yellow — Use whole or half minutes (e.g. 10 or 10.5)
```

## What round-trips

Export produces this exact format, so export → import reproduces an agenda's items, times, sub-item loops, and participants. **Not** included in the format (set manually after import):

- the agenda **description**,
- the **scheduled start** and **timezone**.

## The Toastmasters template

The complete example agenda — shipped in the repository at [`doc/toastmasters-agenda-template.csv`](https://github.com/Elektryczna-Owca/OpenSpeak/blob/main/doc/toastmasters-agenda-template.csv) and installed as a template by the sample-data seed:

```csv
title,min,green,yellow,red,max,person,sub label,sub min,sub green,sub yellow,sub red,sub max
Opening and welcoming guests,2,2,3,4.5,5,President,,,,,,
Introduction by the Toastmaster of the Evening,2,2,3,3.5,4,Toastmaster,,,,,,
Helpers introductions: timer / grammarian / ah-counter,3,3,4,4.5,5,,Helper,1,1,1.5,1.5,2
Word of the day,1,1,2,2.5,3,Grammarian,,,,,,
Prepared speeches,2,2,3,3.5,4,Toastmaster,Speaker,5,5,6,6.5,7
Break,10,10,10,14.5,15,,,,,,,
Table Topics — impromptu speaking,3,3,5,6.5,7,Table Topics Master,Participant,1,1,1.5,1.5,2
Speech evaluations,1,1,2,2.5,3,General Evaluator,Evaluator,2,2,2.5,2.5,3
Table Topics evaluation,3,3,4,4.5,5,,,,,,,
Helpers reports,3,3,5,5.5,6,,Helper,1,1,1.5,1.5,2
General Evaluator report,3,3,5,6.5,7,General Evaluator,,,,,,
Awards and closing,3,3,5,9.5,10,President,,,,,,
```

---
title: CSV format reference
description: Every column, rule, and edge case of the agenda CSV format used by import, export, and templates.
---

The same CSV format is used by [import](/planning/csv-import/), [export](/planning/agenda-editor/#export-csv), and [templates](/planning/templates/). This page is the complete rulebook.

## Columns

The first row must be a header. Columns may appear in **any order**; names are matched **case-insensitively, ignoring spaces, underscores, and dashes** (`Sub Expected`, `sub_expected`, and `SUB-EXPECTED` are all the same column). Unknown columns are ignored.

| Column | Required | Value |
|---|---|---|
| `title` | **yes** | Item title (non-empty on every row) |
| `min` | no | Minutes — minimum time |
| `expected` | **yes** | Minutes — planned time (every row) |
| `max` | no | Minutes — maximum time |
| `person` | no | Participant name; created on the agenda and assigned to this item |
| `sub label` | no | What one sub-slot is called (e.g. `Speaker`); defaults to "Sub-item" |
| `sub min` | no | Minutes — per-slot minimum |
| `sub expected` | no* | Minutes — per-slot planned time; **setting it is what activates the sub-item loop** |
| `sub max` | no | Minutes — per-slot maximum |

\* required only if any other `sub *` value is present on that row — a sub-item without `sub expected` is an error.

## Values

- **Times** are minutes from **0.5 to 600**, in **half-minute steps**: `3`, `7.5`, `90` — not `2.25`.
- **Ordering** is enforced where set: `min ≤ expected ≤ max` (same for the `sub` trio).
- **`person`**: the same name on multiple rows becomes a single participant.

## Parsing

- **Delimiter** is auto-detected per file: tab, semicolon, or comma — so a direct paste from Excel or Google Sheets (tab-separated) works unchanged.
- **Quoting**: fields may be wrapped in double quotes; a quoted field can contain the delimiter and newlines-free text; `""` inside a quoted field is a literal quote.
- **Blank lines** are skipped.

## Errors

Validation is **all-or-nothing**: if any row fails, nothing is imported, and every problem is listed with its line number and field, e.g.:

```
Line 4: sub expected — Set an expected time for the sub-item
Line 7: expected — Use whole or half minutes (e.g. 10 or 10.5)
```

## What round-trips

Export produces this exact format, so export → import reproduces an agenda's items, times, sub-item loops, and participants. **Not** included in the format (set manually after import):

- item **URLs** (QR codes),
- the agenda **description**,
- the **scheduled start** and **timezone**.

## The Toastmasters template

The complete example agenda — shipped in the repository at [`doc/toastmasters-agenda-template.csv`](https://github.com/Elektryczna-Owca/OpenSpeak/blob/main/doc/toastmasters-agenda-template.csv) and installed as a template by the sample-data seed:

```csv
title,min,expected,max,person,sub label,sub min,sub expected,sub max
Opening and welcoming guests,2,3,5,President,,,,
Introduction by the Toastmaster of the Evening,2,3,4,Toastmaster,,,,
Helpers introductions: timer / grammarian / ah-counter,3,4,5,,Helper,1,1.5,2
Word of the day,1,2,3,Grammarian,,,,
Prepared speeches,2,3,4,Toastmaster,Speaker,5,6,7
Break,10,10,15,,,,,
Table Topics — impromptu speaking,3,5,7,Table Topics Master,Participant,1,1.5,2
Speech evaluations,1,2,3,General Evaluator,Evaluator,2,2.5,3
Table Topics evaluation,3,4,5,,,,,
Helpers reports,3,5,6,,Helper,1,1.5,2
General Evaluator report,3,5,7,General Evaluator,,,,
Awards and closing,3,5,10,President,,,,
```

---
title: Reports
description: Actual vs. planned for every item and speaker — honest numbers that never change after the fact.
---

Every meeting run produces a report: the actual time spent on each item and each speaker, side by side with the plan. Finished runs are listed on the [display screen](/running/display-screen/#before-the-meeting-the-planned-schedule); a live run's report is one tap away from the [control screen](/running/control-screen/)'s header.

## Reading the report

The header shows when the meeting started (in the agenda's timezone) and its total length — "1:42:07 total" for a finished run, or "58:12 so far — still in progress" when opened mid-meeting.

Then one row per timed segment:

| Column | Meaning |
|---|---|
| **Item** | The label — speaker rounds are indented with an arrow and show the recorded participant's name, plus any [comment](/running/control-screen/#while-an-item-is-running) typed on the control screen |
| **Actual** | Real elapsed time, excluding pauses; a still-running segment counts up to now |
| **Expected** | The planned time |
| **Min–Max** | The other two thresholds |
| **Status** | How it went (below) |

**Status** is judged against the thresholds: `on time`, `under min`, `over expected`, `over max`, `skipped` (in italics), or `running` for the segment in flight. The comparisons are strict — finishing *exactly* at max still counts as on time.

<!-- TODO screenshot: run report -->

## The "in between" row

When at least a second of the meeting happened *between* items — after one finished, before the next was started, including the tail between the last item and the end of the meeting — the report sums it into a single **"Sum of in between times"** row. That's the applause, transitions, and setup: real meeting time that belongs to no item. A big number here is often the most actionable finding in the report.

## History never changes

Each segment's label and thresholds are **snapshotted the moment it starts**. Editing the agenda afterwards — renaming items, changing times, even deleting items or participants — never rewrites a report. What the report says happened is what happened.

## Managing runs

- Past runs accumulate on the display screen, newest first — one agenda can be run every week and keep its whole history.
- **Run again** (top of a finished report) takes you back to the display/schedule page for a fresh run; a live report shows **Back to control** instead.
- Finished runs can be deleted from the past-runs list (with confirmation). A run that is still open cannot be deleted — end it first.

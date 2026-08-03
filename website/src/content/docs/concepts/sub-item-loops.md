---
title: Sub-item loops (speaker rounds)
description: Give one agenda item an unlimited round of individually timed slots — Speaker 1, Speaker 2, … — each with its own time limits.
---

Some agenda items aren't a single timed block — they're a *round*: several prepared speeches in a row, a series of Table Topics answers, one evaluation per speaker. In OpenSpeak, any item can host such a round via its **sub-item loop**.

## How it works

Give the item a **sub-item label** (say, `Speaker`) and the sub-item's own **min / expected / max** times. During the meeting:

1. The **item's own slot runs first**, on the item's own thresholds — for example, the Toastmaster's introduction to the "Prepared speeches" section.
2. Then the controller starts **Speaker 1**. When they finish, **Speaker 2**, and so on — each round is a fresh timer with the *sub-item's* thresholds, its own colors, its own max-time beep, and its own row in the report.
3. The round is **open-ended**: OpenSpeak never decides the round is over. When the last speaker is done, the controller taps **Finish agenda item** to close the loop and move on to the next agenda item.

If the agenda has [participants](/concepts/participants/), the control screen shows a dropdown during each round so you can record *who* Speaker 2 actually was — the name lands in the report next to their actual time.

## Setting it up

In the item's edit dialog, fill in the **Sub-item** section:

- **Label** — what one slot is called: "Speaker", "Participant", "Evaluator"… (defaults to "Sub-item" if left blank).
- **Min / Expected / Max** — the per-slot time limits.

The loop is **active only when the sub-item's Expected time is set**. Clearing that Expected time turns the loop off and wipes its label, min, and max.

## Example: a Toastmasters meeting

The built-in [Toastmasters template](/planning/templates/) uses sub-item loops for exactly the sections you'd expect:

| Item (own time) | Sub-item loop (per-slot time) |
|---|---|
| Helpers introductions (3/4/5) | Helper — 1 / 1.5 / 2 min each |
| Prepared speeches (2/3/4 intro) | Speaker — 5 / 6 / 7 min each |
| Table Topics (3/5/7 intro) | Participant — 1 / 1.5 / 2 min each |
| Speech evaluations (1/2/3 intro) | Evaluator — 2 / 2.5 / 3 min each |

## One planning caveat

Because a round can have any number of slots, the planned schedule on the display screen counts only the item's **own** expected time — it can't know how many speakers will show up. Expect the real schedule to drift once a big round starts; the display always shows the next item's planned start so the room can see the drift.

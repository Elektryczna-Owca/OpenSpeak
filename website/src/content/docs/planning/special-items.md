---
title: Special items
description: Predefined value lists with times — such as Toastmasters Pathways projects — that agenda items can be picked from.
---

Some agenda items come from a fixed catalogue, each entry with its own timing: a Toastmasters speech is a **Pathways project** like "PM (L1) Ice Breaker" (4–6 minutes) or "PM (L3) Persuasive Speaking" (5–7 minutes). A **special item** is such a catalogue: a named list of values, each with optional min/expected/max times. Instead of typing the project name and looking up its timing, you pick it from a dropdown.

Special items live under **Special items** in the header. Like [templates](/planning/templates/) they are **global** — not tied to any agenda, available to everyone using the instance.

## Using a special item

Once at least one special item exists, the [agenda editor](/planning/agenda-editor/)'s add row and the item edit dialog gain a **Type** dropdown: **Regular item** (the default) or one of your special items. Choosing a special item shows a second dropdown with its values, grouped (e.g. by path for Pathways). Picking a value:

- fills **Min / Expected / Max** with the value's times (values without times leave them as they are);
- fills the **title** with the value — unless you already typed your own title (e.g. "Speech 2 — Anna"), which is kept.

Both stay editable: the special item is a shortcut, not a lock. The item card shows which value was picked (e.g. "Pathways project: PM (L1) Ice Breaker") whenever the title is something else. Switching **Type** back to **Regular item** removes the link and keeps the title and times.

In the add row the chosen type stays selected after each add, so a block of prepared speeches is quick to enter.

## Creating and editing

A special item is a name plus a **values CSV** — paste it into the editor or use **Load CSV file**. It is validated on save, with errors listed per line:

```csv
group,value,min,expected,max
Presentation Mastery,PM (L1) Ice Breaker,4,5,6
Presentation Mastery,PM (L3) Persuasive Speaking,5,6,7
Dynamic Leadership,DL (L1) Ice Breaker,4,5,6
```

- **value** is required and must be unique within the list;
- **group** is optional and only clusters values in the dropdown;
- **min / expected / max** are optional minutes in half-minute steps with `min ≤ expected ≤ max`; if expected is empty but min and max are set, it defaults to their midpoint.

Header names, delimiters and quoting follow the same rules as the [agenda CSV](/reference/csv-columns/): case and spaces in headers don't matter, columns may come in any order, and comma, semicolon and tab delimiters all work.

**Export CSV** (on the list and in the editor) downloads the values in exactly this format, so a list can be moved to another instance or edited in a spreadsheet and loaded back.

## The built-in Pathways project list

Seeding the sample data (`npx prisma db seed`, see [Install & self-host](/getting-started/self-hosting/)) installs a **"Pathways project"** special item with 555 projects across all paths (Presentation Mastery, Dynamic Leadership, Engaging Humor, …). Expected time is the midpoint of each project's range. The CSV ships in the repository at `agenda-app/prisma/special-items/pathways-projects.csv`; on an instance seeded before it existed, create a special item and load that file.

## Deleting

The trash button deletes a special item after a confirmation. Agenda items picked from it keep their title and times; only the link to the list is dropped.

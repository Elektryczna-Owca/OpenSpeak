---
title: Templates
description: Save a meeting structure once, reuse it every week — templates are named CSVs that feed the import page.
---

Most clubs run the same meeting structure every time. A **template** captures that structure once so each new meeting starts from it — a template is simply a named, saved [agenda CSV](/planning/csv-import/).

Templates live under **Templates** in the header. They are **global** — not tied to any agenda, available to everyone using the instance (remember, OpenSpeak has no accounts).

## Creating a template

Two common routes:

- **From an existing agenda** — build and polish an agenda once, [export it as CSV](/planning/agenda-editor/#export-csv), then create a new template and paste the CSV in.
- **From scratch** — write the CSV directly in the template editor.

Either way, the CSV is validated on save with the same rules as import, and errors are listed per line — a template that saves is a template that imports.

## Using a template

On the [import page](/planning/csv-import/), pick the template from the **Start from a template** dropdown. It fills the CSV box with the template's content — still fully editable, so you can tweak this week's speakers or drop an item before importing.

The template itself is never modified by using it.

## The built-in Toastmasters template

Seeding the sample data (`npx prisma db seed`, see [Install & self-host](/getting-started/self-hosting/)) installs a complete **"Toastmasters club meeting"** template: 12 items from "Opening and welcoming guests" through prepared speeches, a break, Table Topics, evaluations, and "Awards and closing" — with roles (President, Toastmaster, Grammarian, …) and [sub-item loops](/concepts/sub-item-loops/) for helpers, speakers, Table Topics participants, and evaluators.

The same CSV is printed in full in the [CSV format reference](/reference/csv-columns/#the-toastmasters-template).

## Managing templates

The Templates list shows each template's name and how many items its CSV parses to, with pencil (edit) and trash (delete, after a confirmation) buttons. Deleting a template never touches agendas that were created from it.

---
title: What is OpenSpeak?
description: An open-source web app for planning and running structured, timed meetings — built for Toastmasters clubs, useful anywhere the clock matters.
---

OpenSpeak is an open-source web application for planning and running **structured, timed meetings**. It was born for [Toastmasters](https://www.toastmasters.org/)-style club meetings — where every speech, evaluation, and report has a minimum, target, and maximum time — but it works for any meeting that should respect the clock.

## The 30-second mental model

1. **Build an agenda** — an ordered list of items, each with a *min / expected / max* time and, optionally, a person responsible for it.
2. **Run the meeting** — put the **display screen** on a projector, keep the **control screen** open on a phone. The timer changes color as time passes (green → yellow → red), and nothing ever advances until someone taps a button.
3. **Read the report** — after the meeting (or during it), see the actual time spent on every item and every speaker, compared to the plan.

That's the whole product. Everything else — speaker rounds, CSV import, templates, QR codes — supports one of those three steps.

## Who can see and edit what

OpenSpeak has **no logins and no user accounts**. Anyone who can reach the URL can view *and edit* every agenda, run every meeting, and read every report.

This is a deliberate design for a single club or team running its own private instance: share the link, and everyone can help. It also means you should **not** expose an OpenSpeak instance to the open internet unless that is what you want — put it behind your own network, VPN, or reverse-proxy access control if you need to restrict access.

## Making it yours

Two small personalization options live in the page header on every screen, and are remembered per browser:

- **Palette** — cycles through six color themes: Sandy (default), Olive, Contrast light, Contrast dark, Midnight, and Frost.
- **Font** — cycles through four typefaces.

One thing never changes with the palette: the **timer colors** during a meeting (white, green, yellow, red) are fixed, mirroring the physical timing cards used in Toastmasters clubs.

## Where to next

- Follow the [Quick start](/getting-started/quick-start/) to run your first meeting in five minutes.
- Read [Agendas, items & time limits](/concepts/agendas-and-items/) to understand the core building blocks.
- Setting up your own server? See [Install & self-host](/getting-started/self-hosting/).

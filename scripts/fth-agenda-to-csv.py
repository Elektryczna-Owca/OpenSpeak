#!/usr/bin/env python3
"""Convert a saved FreeToastHost 4 meeting-agenda page into OpenSpeak import CSV.

FreeToastHost 4 club sites render the meeting agenda as a Bootstrap table
(class "app-table"): one <tr> per agenda item, holding a start time, the role
title, a description, and the member signed up for the role. The description
usually ends in a line like "Timing: Green 1:00 | Yellow 1:30 | Red 2:00".
This script scrapes those rows and emits the CSV that OpenSpeak's importer
accepts (see website/src/content/docs/reference/csv-columns.md).

Usage:
    python3 scripts/fth-agenda-to-csv.py agenda.html > agenda.csv
    python3 scripts/fth-agenda-to-csv.py agenda.html -o agenda.csv
    python3 scripts/fth-agenda-to-csv.py agenda.html --descriptions  # notes on stderr

To get the input: open the club's Meeting Agenda page in a browser and save it
as "Web Page, complete" (or "HTML only") — no login or network access needed
here, the times and names are in the saved markup.

Notes:
- Rows with a "Timing: Green | Yellow | Red" line map to min / expected / max,
  so the run timer shows the club's own signals. OpenSpeak turns red 30 s
  *before* max, while FTH's Red is the moment red shows — so max = Red + 0:30.
  The planned schedule then follows these times, not the printed start times.
- Rows without that line (or with only "Timing: M:SS total") fall back to the
  "total", or else the gap to the next start time, with no min/max.
- Rows whose timing is "(per response)" (Table Topics, Hot Topics) become a
  sub-item loop labelled "Participant" with those per-response times; the
  item's own `expected` is the gap to the next start time.
- Other sub-item loops (multi-speaker rounds) cannot be inferred from a flat
  time table — add `sub label`/`sub min`/`sub expected`/`sub max` by hand to
  the rows that are really N timed slots.
- Item URLs, the agenda description, the scheduled start, and the timezone are
  not part of the CSV format; set them in OpenSpeak after importing.
"""

import argparse
import csv
import html
import re
import sys

# The agenda table; everything before/after it must stay out of the scrape.
TABLE_ANCHOR = 'app-table'
TITLE_RE = re.compile(r'class="fw-semibold">(.*?)</div>', re.I | re.S)
DESC_RE = re.compile(r'class="[^"]*fst-italic[^"]*">(.*?)</div>', re.I | re.S)
MEMBER_RE = re.compile(r'class="member-name">(.*?)</span>', re.I | re.S)
TIMING_RE = re.compile(r'Green (\d+:\d\d) \| Yellow (\d+:\d\d) \| Red (\d+:\d\d)', re.I)
TOTAL_RE = re.compile(r'Timing:\s*(\d+:\d\d) total', re.I)
RED_GRACE = 0.5  # OpenSpeak's red starts 30 s before max

CSV_HEADER = ['title', 'min', 'expected', 'max', 'person',
              'sub label', 'sub min', 'sub expected', 'sub max']


def strip_tags(fragment: str) -> str:
    """Plain text of an HTML fragment."""
    fragment = re.sub(r'(?s)<[^>]+>', ' ', fragment)
    return re.sub(r'[\s\xa0]+', ' ', html.unescape(fragment)).strip()


def minutes_between(start: str, end: str) -> float:
    """Whole minutes from start to end, wrapping past midnight."""
    sh, sm = (int(p) for p in start.split(':'))
    eh, em = (int(p) for p in end.split(':'))
    delta = (eh * 60 + em) - (sh * 60 + sm)
    return delta + 24 * 60 if delta < 0 else delta


def add_minutes(start: str, minutes: float) -> str:
    total = (int(start[:2]) * 60 + int(start[3:]) + round(minutes)) % (24 * 60)
    return f'{total // 60:02d}:{total % 60:02d}'


def mmss(value: str) -> float:
    """'1:30' -> 1.5 minutes."""
    m, sec = (int(p) for p in value.split(':'))
    return m + sec / 60


def half(value: float) -> float:
    """Snap to the half-minute accuracy OpenSpeak accepts, never below 0.5."""
    return max(0.5, round(value * 2) / 2)


def number(value: float) -> str:
    """3.0 -> '3', 1.5 -> '1.5' (OpenSpeak rejects finer than half minutes)."""
    return str(int(value)) if value == int(value) else str(value)


def parse_rows(markup: str) -> list[dict]:
    """Agenda rows, in meeting order, from a saved FTH 4 agenda page."""
    anchor = markup.find(TABLE_ANCHOR)
    if anchor == -1:
        raise SystemExit(
            f'No "{TABLE_ANCHOR}" table found — is this a saved FreeToastHost 4 '
            'Meeting Agenda page?'
        )
    end = markup.find('</tbody>', anchor)
    table = markup[anchor:end if end != -1 else len(markup)]

    rows = []
    for chunk in re.findall(r'<tr>(.*?)</tr>', table, re.S):
        cells = re.findall(r'<td[^>]*>(.*?)</td>', chunk, re.S)
        title = TITLE_RE.search(cells[1]) if len(cells) > 2 else None
        start = re.fullmatch(r'\d{1,2}:\d{2}', strip_tags(cells[0])) if cells else None
        if not title or not start:
            continue  # header/spacer row
        desc = DESC_RE.search(cells[1])
        member = MEMBER_RE.search(cells[2])
        description = strip_tags(desc.group(1)) if desc else ''
        timing = TIMING_RE.search(description)
        total = TOTAL_RE.search(description)
        rows.append({
            'start': start.group(0).zfill(5),
            # drop FTH's inline links ("Timer ⏱ Printed timer sheet ...")
            'title': strip_tags(title.group(1)).split(' ⏱')[0].rstrip('.'),
            'person': strip_tags(member.group(1)) if member else '',
            'description': description,
            'timing': [mmss(g) for g in timing.groups()] if timing else None,
            'per_response': bool(timing) and 'per response' in description.lower(),
            'total': mmss(total.group(1)) if total else None,
        })
    if not rows:
        raise SystemExit('Found the agenda table but no item rows in it.')

    for cur, nxt in zip(rows, rows[1:]):
        cur['end'] = nxt['start']
        cur['minutes'] = minutes_between(cur['start'], nxt['start'])
    last = rows[-1]  # no next row: use the item's own planned time
    last['minutes'] = (last['timing'] or [0, 0])[1] or last['total'] or 1
    last['end'] = add_minutes(last['start'], last['minutes'])
    return rows


def to_csv_row(row: dict) -> list[str]:
    timing = row['timing']
    if timing and row['per_response']:
        green, yellow, red = timing
        return [row['title'], '', number(half(row['minutes'])), '', row['person'],
                'Participant', number(half(green)), number(half(yellow)),
                number(half(red + RED_GRACE))]
    if timing:
        green, yellow, red = timing
        return [row['title'], number(half(green)), number(half(yellow)),
                number(half(red + RED_GRACE)), row['person'], '', '', '', '']
    expected = half(row['total'] or row['minutes'])
    return [row['title'], '', number(expected), '', row['person'], '', '', '', '']


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('html', help='saved FreeToastHost 4 agenda page')
    ap.add_argument('-o', '--output', help='write CSV here instead of stdout')
    ap.add_argument('--descriptions', action='store_true',
                    help='print each row\'s FTH description to stderr '
                         '(it has no CSV column; useful when writing item URLs)')
    args = ap.parse_args()

    with open(args.html, encoding='utf-8', errors='replace') as fh:
        rows = parse_rows(fh.read())

    csv_rows = [to_csv_row(row) for row in rows]
    out = open(args.output, 'w', newline='', encoding='utf-8') if args.output else sys.stdout
    try:
        writer = csv.writer(out, lineterminator='\n')
        writer.writerow(CSV_HEADER)
        writer.writerows(csv_rows)
    finally:
        if args.output:
            out.close()

    total = sum(float(r[2]) for r in csv_rows)
    print(f'{len(rows)} items, {number(total)} min '
          f'({rows[0]["start"]} - {rows[-1]["end"]})', file=sys.stderr)

    # Duplicate titles are legal but read badly on the projector — FTH tells
    # them apart by description only (e.g. two rows both called "Evaluator").
    seen, dupes = set(), []
    for row in rows:
        if row['title'] in seen:
            dupes.append(row['title'])
        seen.add(row['title'])
    if dupes:
        print('Duplicate titles, consider renaming: '
              + ', '.join(sorted(set(dupes))), file=sys.stderr)

    if args.descriptions:
        for row in rows:
            print(f'\n{row["start"]}-{row["end"]} {row["title"]}', file=sys.stderr)
            if row['description']:
                print(f'  {row["description"]}', file=sys.stderr)


if __name__ == '__main__':
    main()

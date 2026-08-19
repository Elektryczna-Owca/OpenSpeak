#!/usr/bin/env python3
"""Convert a saved FreeToastHost meeting-agenda page into OpenSpeak import CSV.

FreeToastHost ("FTH 3") club sites render the meeting agenda as a table with
id="rostertable": one <tr> per agenda item, holding a start/end time pair, the
role title, a description, and the member signed up for the role. This script
scrapes those rows and emits the CSV that OpenSpeak's importer accepts
(see website/src/content/docs/reference/csv-columns.md).

Usage:
    python3 scripts/fth-agenda-to-csv.py agenda.html > agenda.csv
    python3 scripts/fth-agenda-to-csv.py agenda.html -o agenda.csv
    python3 scripts/fth-agenda-to-csv.py agenda.html --no-brackets   # expected only
    python3 scripts/fth-agenda-to-csv.py agenda.html --descriptions  # notes on stderr

To get the input: open the club's Meeting Agenda page in a browser and save it
as "Web Page, complete" (or "HTML only") — no login or network access needed
here, the times and names are in the saved markup.

Notes:
- FTH stores only start/end times, so `expected` is the time difference. The
  planned start times in OpenSpeak then reproduce the printed agenda exactly.
- FTH has no min/max, so by default they are bracketed around `expected`
  (-20% / +15%, snapped to the half minutes OpenSpeak requires, floor 0.5) to
  make the run timer's colors useful. Tune them by hand afterwards, or pass
  --no-brackets to leave the columns empty.
- Sub-item loops (Table Topics, multi-speaker rounds) cannot be inferred from a
  flat time table — add `sub label`/`sub min`/`sub expected`/`sub max` by hand
  to the rows that are really N timed slots.
- Item URLs, the agenda description, the scheduled start, and the timezone are
  not part of the CSV format; set them in OpenSpeak after importing.
"""

import argparse
import csv
import html
import re
import sys

# The agenda table; everything before/after it (news, file lists, role-signup
# <select> menus full of Pathways projects) must stay out of the scrape.
TABLE_ANCHOR = 'id="rostertable"'
ROW_SPLIT = re.compile(r'<tr\b[^>]*valign="top"', re.I)

TIMES_RE = re.compile(r'timeColumn"[^>]*>\s*(\d{1,2}:\d{2})\s*<br\s*/?>\s*(\d{1,2}:\d{2})', re.I)
TITLE_RE = re.compile(r'<td[^>]*>\s*<b>(.*?)</b>', re.I | re.S)
DESC_RE = re.compile(r'class="breakwords"[^>]*>(.*?)</span>', re.I | re.S)
MEMBER_RE = re.compile(r'Role filled by</i>\s*<b>(.*?)</b>', re.I | re.S)
PATH_RE = re.compile(r'id="pathmanual-\d+"[^>]*>(.*?)</span>', re.I | re.S)

CSV_HEADER = ['title', 'min', 'expected', 'max', 'person',
              'sub label', 'sub min', 'sub expected', 'sub max']


def strip_tags(fragment: str) -> str:
    """Plain text of an HTML fragment, minus <select> menus and their options."""
    fragment = re.sub(r'(?is)<select.*?</select>', '', fragment)
    fragment = re.sub(r'(?is)<option[^>]*>.*?</option>', '', fragment)
    fragment = re.sub(r'(?s)<[^>]+>', ' ', fragment)
    return re.sub(r'[\s\xa0]+', ' ', html.unescape(fragment)).strip()


def minutes_between(start: str, end: str) -> float:
    """Whole minutes from start to end, wrapping past midnight."""
    sh, sm = (int(p) for p in start.split(':'))
    eh, em = (int(p) for p in end.split(':'))
    delta = (eh * 60 + em) - (sh * 60 + sm)
    return delta + 24 * 60 if delta < 0 else delta


def half(value: float) -> float:
    """Snap to the half-minute accuracy OpenSpeak accepts, never below 0.5."""
    return max(0.5, round(value * 2) / 2)


def number(value: float) -> str:
    """3.0 -> '3', 1.5 -> '1.5' (OpenSpeak rejects finer than half minutes)."""
    return str(int(value)) if value == int(value) else str(value)


def parse_rows(markup: str) -> list[dict]:
    """Agenda rows, in meeting order, from a saved FTH agenda page."""
    anchor = markup.find(TABLE_ANCHOR)
    if anchor == -1:
        raise SystemExit(
            f'No {TABLE_ANCHOR} found — is this a saved FreeToastHost '
            'Meeting Agenda page?'
        )
    end = markup.find('</tbody>', anchor)
    table = markup[anchor:end if end != -1 else len(markup)]

    rows = []
    for chunk in ROW_SPLIT.split(table)[1:]:
        times = TIMES_RE.search(chunk)
        title = TITLE_RE.search(chunk)
        if not times or not title:
            continue  # header/spacer row, or a row whose time cell is empty
        member = MEMBER_RE.search(chunk)
        desc = DESC_RE.search(chunk)
        path = PATH_RE.search(chunk)
        rows.append({
            'start': times.group(1),
            'end': times.group(2),
            'minutes': minutes_between(times.group(1), times.group(2)),
            'title': strip_tags(title.group(1)).rstrip('.'),
            'person': strip_tags(member.group(1)) if member else '',
            'description': strip_tags(desc.group(1)) if desc else '',
            'path': strip_tags(path.group(1)) if path else '',
        })
    if not rows:
        raise SystemExit('Found the agenda table but no item rows in it.')
    return rows


def to_csv_row(row: dict, brackets: bool) -> list[str]:
    expected = half(row['minutes'])
    low = high = ''
    if brackets:
        low = number(min(half(expected * 0.8), expected))
        high = number(max(half(expected * 1.15), expected))
    return [row['title'], low, number(expected), high, row['person'], '', '', '', '']


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('html', help='saved FreeToastHost agenda page')
    ap.add_argument('-o', '--output', help='write CSV here instead of stdout')
    ap.add_argument('--no-brackets', dest='brackets', action='store_false',
                    help='leave min/max empty instead of bracketing expected')
    ap.add_argument('--descriptions', action='store_true',
                    help='print each row\'s FTH description/path to stderr '
                         '(they have no CSV column; useful when writing item URLs)')
    args = ap.parse_args()

    with open(args.html, encoding='utf-8', errors='replace') as fh:
        rows = parse_rows(fh.read())

    out = open(args.output, 'w', newline='', encoding='utf-8') if args.output else sys.stdout
    try:
        writer = csv.writer(out, lineterminator='\n')
        writer.writerow(CSV_HEADER)
        for row in rows:
            writer.writerow(to_csv_row(row, args.brackets))
    finally:
        if args.output:
            out.close()

    total = sum(half(r['minutes']) for r in rows)
    print(f'{len(rows)} items, {number(total)} min '
          f'({rows[0]["start"]} - {rows[-1]["end"]})', file=sys.stderr)

    # Duplicate titles are legal but read badly on the projector — FTH tells
    # them apart by description only (e.g. two rows both called "Evaluator #1").
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
            if row['path']:
                print(f'  Path: {row["path"]}', file=sys.stderr)


if __name__ == '__main__':
    main()

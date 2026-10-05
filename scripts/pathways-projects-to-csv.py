#!/usr/bin/env python3
"""Extract the Toastmasters Pathways project list into OpenSpeak special-item CSV.

Input is a saved club-site "Edit agenda row" page whose role form has a
<select name="pathways_project"> picker: one <optgroup> per path, one <option>
per project, labelled like "PM (L1) Ice Breaker (4-6 min)". The output is the
CSV the Special items page imports (see
website/src/content/docs/reference/csv-columns.md):

    group,value,min,expected,max
    Presentation Mastery,PM (L1) Ice Breaker,4,5,6

Usage:
    python3 scripts/pathways-projects-to-csv.py page.html > pathways.csv
    python3 scripts/pathways-projects-to-csv.py page.html -o pathways.csv

Notes:
- The trailing "(min-max min)" is moved into the min/max columns; expected is
  their midpoint, snapped to the half minutes OpenSpeak requires.
- Projects without a time range are kept with empty time columns.
- Disabled helper options (spacers, sub-headings, rules) are skipped.
"""

import argparse
import csv
import html
import re
import sys

SELECT_RE = re.compile(r'<select[^>]*name="pathways_project".*?</select>', re.S)
TOKEN_RE = re.compile(
    r'<optgroup label="(?P<group>[^"]*)"'
    r'|<option value="(?P<value>\d+)"[^>]*>(?P<label>[^<]*)</option>'
)
TIME_RE = re.compile(r'\s*\((\d+(?:\.\d+)?)-(\d+(?:\.\d+)?) min\)\s*$')


def fmt(minutes):
    return f'{minutes:g}'


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('html', help='saved page containing the pathways_project select')
    parser.add_argument('-o', '--output', help='write CSV here instead of stdout')
    args = parser.parse_args()

    with open(args.html, encoding='utf-8') as f:
        page = f.read()
    select = SELECT_RE.search(page)
    if not select:
        sys.exit('No <select name="pathways_project"> found in the page')

    rows = []
    group = ''
    for m in TOKEN_RE.finditer(select.group(0)):
        if m.group('group') is not None:
            group = html.unescape(m.group('group')).strip()
            continue
        label = html.unescape(m.group('label')).strip()
        time = TIME_RE.search(label)
        if time:
            lo, hi = float(time.group(1)), float(time.group(2))
            expected = round((lo + hi) / 2 * 2) / 2
            rows.append([group, label[: time.start()].strip(), fmt(lo), fmt(expected), fmt(hi)])
        else:
            rows.append([group, label, '', '', ''])

    out = open(args.output, 'w', encoding='utf-8', newline='') if args.output else sys.stdout
    writer = csv.writer(out, lineterminator='\n')
    writer.writerow(['group', 'value', 'min', 'expected', 'max'])
    writer.writerows(rows)
    if args.output:
        out.close()
    print(f'{len(rows)} projects', file=sys.stderr)


if __name__ == '__main__':
    main()

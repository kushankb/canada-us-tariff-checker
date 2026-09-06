# CLAUDE.md

Project context for the Canada–US tariff checker. Read `HANDOFF.md` for full background.

## What this app does

Answers "is my product tariffed under the Canada–US trade dispute, and at what rate" for people who don't know their HS code. Static React SPA, no backend, data committed as JSON.

## Layout

```
ingest/       Scrapers. Output goes to src/data/. Run manually or via CI.
scripts/      Verification gates. `npm run check` runs all three.
src/data/     ca-measures.json, us-measures.json, ca-history.json
              — generated, but committed.
src/lib/      data.js (shaping, duty stacking, freshness), search.js, aliases.js,
              trade.js (pure join, testable without a bundler)
src/          App.jsx is the shell and owns all filter state. Components are
              presentational: Sidebar (filters), Row, DetailPanel, ContextPanel,
              Welcome, EmptyState.
prototype/    The original single-file prototype. Reference only, partial data.
```

## Rules

**Never invent an HS code.** Not to fill a gap, not to make an example, not as a placeholder. If a code isn't in a verified source, it doesn't go in the data. Every code must be a real 8-digit line, reconcilable against Canada's Customs Tariff or the USITC HTS.

**8-digit throughout.** Canada's tariff items and US HTSUS annex lines are both 8-digit. Do not mix in 6- or 10-digit codes without flagging the level.

**Screen Section 338 at 8 digits.** Decided 5 September 2026. A covered 8-digit heading is treated as catching every 10-digit statistical suffix beneath it. This is the conservative direction: it can flag a line a 10-digit reading might exclude, but it will not miss a covered one. Entries still file at 10 digits, and the UI says so.

**Cross-country joins at HS-6 only.** National codes diverge below 6 digits. Any comparison between the two lists aggregates to 6 first. This produces silent errors if ignored — the two lists share 31 identical 8-digit codes but 99 overlapping HS-6 headings.

Trade-value joins follow the same logic but are not uniformly HS-6, because one of them is not a cross-country join. US Census import codes are HTS and the Section 338 list is 8-digit HTS, so that side joins exactly at 8. The Canadian side joins US Schedule B export codes to Canadian tariff items, which diverge below 6, so it aggregates to 6 and the UI labels the figure "at HS-6".

**Fail loud on partial data.** Scrapers throw rather than write short files. The UI announces incomplete coverage rather than letting a null result read as "not tariffed."

**Preserve the disclaimers.** Finance Canada's list has no official sanction and its descriptions are illustrative. The app is not customs advice. Both statements stay visible.

## Domain facts that are easy to get wrong

- Canada's counter-tariffs key on **CUSMA marking origin**, not where the parcel shipped from.
- **CUSMA does not exempt goods from US Section 338.** Coverage is decided by whether the HTS line is in an annex.
- Tariffs **stack** on top of the base MFN rate and other duties. They don't replace it.
- Section 338 excludes energy, potash, and Section 232 goods, plus U.S. Note 51(c) and (d).
- U.S. note 51(c) carve-outs are all Section 232 actions: steel/aluminum/copper, passenger vehicles and parts, wood products, medium- and heavy-duty vehicles and parts, semiconductors, patented pharmaceuticals. Excluded from 338 does not mean untariffed — it means a different measure applies.
- 28 codes sit in both 51(b) and 51(d): covered, unless the article qualifies as civil aircraft under General Note 6.
- **Being under the de minimis threshold does not avoid Canada's surtax.** It applies to shipments below the thresholds and to goods eligible for relief under the Postal Imports Remission Order or the Courier Imports Remission Order. A traveller's personal exemption *does* exempt goods. Source: CBSA Customs Notice 25-10.
- Canada's earlier 25% counter-tariffs were lifted on **1 September 2025** (not 2026). The page's own section labels settle it: 1,814 items up to 31 August 2025, 313 from 1 September 2025.

## Commands

```bash
npm install && npm run dev
npm run check      # data + aliases + search ranking + trade join. Run before committing data.
npm run build

cd ingest && npm i
node scrape-canada.mjs    # 648 current rows + 2,127 historical, throws under 600
node scrape-us.mjs        # 554 codes, throws under 500. Downloads chapter 99 itself.

CENSUS_API_KEY=... npm run ingest:trade   # optional: 2025 trade values
```

Trade values are optional. `src/data/trade-2025.json` ships as a placeholder
with `available: false`, and the app hides trade weight entirely rather than
showing a zero — "not measured" is not "no trade". `check-data.mjs` refuses to
ship a file that claims real data without a Census source and plausible totals.

`scrape-us.mjs` takes an optional path to a local chapter 99 PDF; with no
argument it downloads the current release from the USITC.

## Where the data actually comes from

**Canada.** One page, but *three* tables inside separate `<details>` blocks:
the list in force, and two superseded tranches. They do not share a column
layout — the current one has 4 columns and puts the tariff item in a `<th>`,
the historical ones have 6 columns and use `<td>` throughout. Selecting `td`
and indexing columns positionally silently drops most of the page and mixes
expired rates into live ones. Sections are matched on their `<summary>` text
and columns by header label.

**United States.** Not the Federal Register (annexes are images) and not CBP's
CSMS attachment. Section 338's code lists are enacted as **U.S. note 51 to
subchapter III of chapter 99**, which the USITC publishes as a PDF with a text
layer. 51(b)(1)–(3) are the covered codes, 51(c) the Section 232 carve-outs,
51(d) the civil aircraft carve-out. Every code is then reconciled against the
live HTS via the USITC REST API before publication.

Note the API returns **10-digit statistical lines**; the 8-digit tariff line
exists only as their prefix. Keying on an exact 8-digit `htsno` finds almost
nothing.

## Search

The alias map in `src/lib/aliases.js` is the product, not the ranking
algorithm. Two rules learned the hard way:

- Alias keys match on **word boundaries** with an optional plural. Plain
  substring matching means "tee" fires inside "s**tee**l".
- The fuzzy fallback runs **only** when the query matched no alias key. If we
  recognise the word, an empty result is the answer — "socks" really are on
  neither list, and guessing turns that into socket wrenches.

Keys that resolve to nothing are kept deliberately. They are what lets the
empty state say "we understood you, and it is not listed" instead of the much
weaker "no results".

## Layout of the interface

Three columns: filter rail, results, detail. The rail keeps filters off the
result column so search stays at the top — two rows of filter pills above the
results used to push every hit below the fold on a phone.

The right panel shows the selected line's detail, and when nothing is selected
it shows the rules that reverse the answer. Those rules previously lived in an
onboarding flow seen once and never again; they belong on screen at the moment
someone reads a rate. Below 1140px the detail becomes a drawer and a "Rules"
button in the header opens the same panel. Below 820px the rail becomes a
drawer too.

Rate is encoded three ways — the number, the bar length, and the hue — so it
never depends on colour perception alone.

Row descriptions clamp to two lines. The full schedule text runs past 300
characters and belongs in the detail panel, not in a list of 554.

## Style

Plain language over customs jargon in anything user-facing — the audience includes people who have never seen a tariff schedule. Keep jargon in tooltips and detail views, not in the primary result line.

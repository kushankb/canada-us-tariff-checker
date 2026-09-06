# Canada–U.S. tariff checker

**Live: https://kushankbajaj.com/canada-us-tariff-checker/**

Answers one question in plain language: **is the thing I am buying, shipping or
receiving subject to a Canada–U.S. tariff, and at what rate?**

Government portals answer this only if you already know your HS code. This
answers it for someone who knows only that they ordered a sweater.

Static React SPA. No backend, no database, no API. The data is scraped,
verified and committed as JSON.

```bash
npm install
npm run dev          # http://localhost:5173
npm run check        # data integrity, alias coverage, search ranking, trade join
npm run build
```

Trade values are optional and off by default. To turn them on, get a free
Census API key (issued instantly at api.census.gov/data/key_signup.html) and:

```bash
CENSUS_API_KEY=your-key npm run ingest:trade
```

## Coverage

| Side | Source | Lines | Level |
|---|---|---|---|
| Canada | Finance Canada, complete counter-tariff list | 648 at 15 / 25 / 50% | 8-digit tariff item |
| United States | U.S. note 51, chapter 99 HTSUS | 554 at 50% (Section 338) | 8-digit HTSUS |
| United States | Hand-maintained proclamation records | 7 scope-level measures | no code list |

Both lists are complete as published. The superseded Canadian tranches
(2,127 rows) are kept separately so the app can distinguish "not tariffed"
from "not tariffed *any more*".

## How the data is built

```
ingest/scrape-canada.mjs    Finance Canada HTML -> ca-measures.json, ca-history.json
ingest/scrape-us.mjs        USITC chapter 99 PDF -> us-measures.json
ingest/fetch-trade-values.mjs  US Census API -> trade-2025.json (optional)
scripts/check-data.mjs      fails the build on malformed or partial data
scripts/check-aliases.mjs   reports alias keys that no longer resolve
scripts/search-smoke.mjs    ranking assertions for real user queries
```

The U.S. side deliberately does not use the Federal Register (annexes render
as images) or CBP's CSMS attachment. Section 338's code lists are enacted as
U.S. note 51 to subchapter III of chapter 99, which the USITC publishes as a
PDF with a real text layer. Every code parsed from it is then reconciled
against the live HTS through the USITC REST API; anything that does not
resolve to a current tariff line is dropped and reported, never published.

`.github/workflows/refresh-data.yml` re-runs both scrapers on a schedule and
commits the diff. That commit history is the change feed.

## Rules this codebase does not bend

**Never invent an HS code.** Not to fill a gap, not for an example, not as a
placeholder. If it is not in a verified source it is not in the data.

**8-digit throughout**, on both sides.

**Cross-country joins at HS-6 only.** National codes diverge below 6 digits.
The two lists share 31 identical 8-digit codes but 99 overlapping HS-6
headings — comparing at 8 undercounts the overlap threefold, silently.

**Screen Section 338 at 8 digits.** A covered 8-digit heading catches every
10-digit suffix under it. The conservative direction: it may flag a line a
10-digit reading would exclude, but it will not miss a covered one.

**Fail loud on partial data.** Scrapers throw rather than write short files,
`npm run check` fails the build, and the UI announces coverage in the header
rather than letting a null result read as "not tariffed".

**Preserve the disclaimers.** Finance Canada's list has no official sanction
and its descriptions are illustrative. This is not customs advice. Both
statements stay visible.

## Not customs advice

Product descriptions here are simplified and the underlying lists change
often. Classification and entry decisions belong with a licensed customs
broker.

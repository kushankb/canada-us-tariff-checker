# Canada–US Tariff Checker — Handoff

Everything needed to continue this project in Claude Code. Written 5 September 2026.
**Updated 5 September 2026 after the first implementation pass — see §10 for what
changed and what is still open.**

---

## 1. What this is

A public-facing web app that answers one question: **is the thing I'm buying, shipping, or receiving subject to a Canada–US tariff, and at what rate?**

Existing government portals answer this only if you already know your HS code. The point of this project is to make it answerable by someone who knows only that they ordered a sweater.

Audience is mixed by design: consumers receiving parcels, small importers, and journalists/researchers. Coverage target is the full US measure stack, not just Section 338. English only.

---

## 2. Current state

```
tariff-checker.jsx          Working prototype. Single-file React.
ingest/scrape-canada.mjs    Complete. Should hit 100% on first run.
ingest/scrape-us.mjs        Skeleton. Parser assumes XLSX; fails loud otherwise.
```

**Prototype data coverage is partial and the app says so in the footer.** 63 of ~700 Canadian lines; the US side is 19 category-level entries against ~554 codes. All 64 codes present are verified 8-digit and real. Nothing was invented.

The reason it's partial: `web_fetch` truncates the Canada.ca page at row `7214.10.00` regardless of token limit, and the sandbox proxy blocks canada.ca (`x-deny-reason: host_not_allowed`). Claude Code with normal network access won't have either problem — **running `scrape-canada.mjs` should be the first thing you do.**

---

## 3. Data sources

### Canada — solved

Finance Canada, "Complete list of U.S. products subject to counter tariffs":

```
https://www.canada.ca/en/department-finance/programs/international-trade-finance-policy/
canadas-response-us-tariffs/complete-list-us-products-subject-to-counter-tariffs.html
```

Clean HTML table, four columns: **Tariff item | HS heading | Indicative description | Tariff rate**. Roughly 700 rows at 15%, 25%, or 50%. Effective 8 September 2026, covering $27.6B in imports. List last updated 26 August 2026.

Concentrated in steel and aluminum, dairy, appliances, agricultural equipment, pulp and paper, plastics, and electronics. Steel and aluminum rose from 25% to 50% to match US rates. Pre-existing counter-tariffs including autos continue separately.

Finance Canada's own caveat, which the app must inherit: the descriptions are illustrative, the list should be read alongside the Schedule to Canada's Customs Tariff, and the consolidated list has no official sanction.

### US — not solved

Three separate authorities, three different formats.

**Section 338** — ~554 codes at 50%. Three proclamations signed 20 July 2026, effective 12:01 a.m. ET 22 August 2026 (moved from 19 August by a three-day suspension). Entry under HTSUS headings 9903.03.12 through 9903.03.16; exclusions in U.S. Note 51(c) and (d). Roughly $20B in trade, about 5.2% of the $382B the US imported from Canada in 2025.

The Federal Register renders the annex tables as **images**, not text. Two viable routes:
- CBP CSMS **#69606660** (21 August 2026) — includes a consolidated "Section 338 Canada HTS List" attachment. Best option if it's XLSX/CSV.
- White House annex PDFs — better than the Federal Register version.

If both turn out to be image-only, OCR is required. **Do not infer codes.** Transcribe, then reconcile every code against the USITC HTS export at hts.usitc.gov to confirm it's a real 8-digit line before publishing.

**Section 232** — separate proclamation per sector, each with its own rate and date. Currently: steel and aluminum 50%; copper 50%; softwood timber and lumber 10%; upholstered wooden furniture 30% (rose from 25% on 1 Jan 2026); kitchen cabinets and vanities 50% (rose from 25% on 1 Jan 2026); patented pharmaceuticals 100% from 29 September 2026, with Annex III companies deferred to 20 January 2029 and generics currently exempt. Few enough to hand-maintain — they live in `NON_338` in `scrape-us.mjs`.

**Forced labour** — from 24 July 2026, 10% for economies that committed to adopting and enforcing forced-labour import prohibitions, 12.5% for those that haven't, with exclusions in Annexes I and II Part A. CUSMA-compliant Canadian goods are exempt.

---

## 4. Domain rules that must be encoded correctly

These are the ones that make the difference between a useful tool and a harmful one.

**Origin is not shipping address.** Canada's counter-tariffs apply to goods eligible to be marked as a good of the US under the CUSMA marking regulations. Something manufactured in Vietnam and shipped from an Ohio warehouse is not US-origin. Most users will assume otherwise.

**CUSMA does not exempt you from Section 338.** This inverts the usual assumption and is the single most commonly missed point in the trade advisories. Coverage is decided by whether the specific HTS line appears in one of the three annexes — a valid certificate of origin is irrelevant.

**Duties stack.** Section 338's 50% is *additional* to the base MFN rate and any other duties and fees. The worked example in one advisory: HTS 7013.99.90 carries 7.2% general duty, so a covered shipment owes 57.2%.

**Section 338 exclusions.** Energy, potash, and Section 232 goods are carved out, plus the specific exclusions in U.S. Note 51(c) and (d). Coverage is product lists with exclusions layered on top, so checking at HTS level tells you far more than asking whether something is Canadian.

**Goods in transit.** Canada's countermeasures don't apply to US goods in transit on the day they come into force.

**Remission.** Canada's remission framework and the United States Surtax Remission Order continue to apply, including product- and company-specific remission. Steel goods eligible for remission of the 25% tariff get relief from the 50%.

**Litigation risk.** This is the first use of Section 338 in 96 years and trade counsel broadly expects a Court of International Trade challenge. Importers keeping clean entry records preserve a refund claim if it's struck down. Worth a line in the UI.

---

## 5. HS code level

| Side | Level | Notes |
|---|---|---|
| Canada | 8-digit tariff item | Matches the level the counter-tariff order operates at. Nothing lost. |
| US | 8-digit HTSUS | Annexes publish at 8; entries file at 10. |

Decision taken: **8-digit throughout.**

**Open item.** Sources disagreed on whether to screen Section 338 at 8 or 10 digits — one advisory said match at eight, another said screen at ten against all three annexes. The working assumption is that a covered 8-digit heading catches all its 10-digit children. Verify this against CBP guidance before it drives public output.

**Cross-country joins are only valid at HS-6.** Canada's and the US's 8- and 10-digit codes are nationally assigned and diverge. Any comparison between the two lists, and any join to trade values, must aggregate to 6 digits first. Getting this wrong produces silent, plausible-looking errors.

---

## 6. Architecture

Static React SPA, no backend.

```
ingest/          Scheduled scrapers → versioned JSON, committed to the repo
src/data/        ca-measures.json, us-measures.json
src/             App, search, components
```

Run the scrapers on a GitHub Action and commit the diff. The commit history then *is* the change feed — "what changed this week" is a feature no existing portal offers, and it costs nothing.

At full size (~1,300 rows) everything stays client-side comfortably. No API, no database, no hosting cost beyond static files.

### Search

Currently dependency-free: alias expansion → substring → trigram fallback, in `scoreItem()`. Code prefix matches short-circuit to score 100.

The **alias map is the actual product**, not the search algorithm. Fuzzy matching alone fails badly here: "wine" works, but "sneakers" will never match *footwear with outer soles of rubber*. The prototype ships ~120 hand-curated consumer-word mappings. Grow this from logs of queries that returned nothing — that log is your roadmap.

Consider swapping in MiniSearch once the data is complete; better ranking and prefix handling for little cost. Keep the alias layer either way, it's upstream of whichever engine you use.

### Staleness

Show the "as of" date on every screen. If the scraper hasn't succeeded in N days, banner it — fail loud rather than quietly serving stale tariff rates.

---

## 7. Known gaps

**Unverified:** how Canada's surtax treats personal and low-value shipments. The app currently hedges in the triage flow. This is the single question most consumers arrive with, so resolving it properly is high value. Related: the US suspended the $800 duty-free de minimis exception for commercial shipments on 29 August 2025.

**Needs checking:** there were conflicting dates in sources around Canada's removal of earlier 25% counter-tariffs on roughly $14.2B of goods effective 1 September — some sources read 2025, others 2026. Confirm before displaying any timeline.

**Empty-state bug (fix early).** With a partial dataset, a null search result reads as "not tariffed" when it means "not in the sample." Until coverage is complete, the empty state must say so explicitly, and the header should carry a coverage indicator (`63/700`) rather than burying it in the footer.

---

## 8. Suggested order

1. `cd ingest && npm i cheerio && node scrape-canada.mjs` — Canada to 100%.
2. Wire the app to read `src/data/*.json` instead of the inlined arrays.
3. Fix the empty state and add the coverage indicator.
4. Design pass. **Do this on the full 700-row dataset** — scanning and layout problems that 63 rows hide will be obvious at 700.
5. US ingestion as a parallel workstream. It's transcription and verification work, not coding.
6. Trade values for the home screen: StatCan CIMT and US Census DataWeb, joined at HS-6.
7. GitHub Action for scheduled re-scrape + diff commit.

---

## 9. Non-negotiables

- Never invent or infer an HS code. If it isn't in a source, it isn't in the data.
- Every screen shows an "as of" date and a link to the official source.
- "Not customs advice" stays prominent. People will make money decisions on this.
- Partial data must announce itself. A confident-looking wrong answer is worse than no answer.


---

## 10. Implementation pass, 5 September 2026

### Done

**Canada is at 100%.** 648 tariff items, not the ~700 estimated. Rates split
413 at 50%, 214 at 25%, 21 at 15%.

The page was not one table. It is three, inside separate `<details>` blocks:
the list in force from 8 September 2026, and two superseded tranches. The
column layouts differ — the current table has 4 columns and puts the tariff
item in a `<th>`, the historical ones have 6 columns and use `<td>`. The
original scraper selected `td` only and indexed columns positionally, so it
picked up 314 rows, most of them expired 25% lines, and would have published
them as current. It now matches sections on `<summary>` text and columns on
header label, and throws if either is missing.

The 2,127 superseded rows are written to `ca-history.json` and lazy-loaded, so
the app can tell a user their product was listed until a date that has passed.

**The U.S. side is solved, and neither route in §3 was needed.** Section 338's
code lists are enacted into the tariff schedule as U.S. note 51 to subchapter
III of chapter 99, and the USITC publishes chapter 99 as a PDF with a real
text layer. No images, no OCR, no transcription step. 554 codes — exactly the
figure in §3 — split 63 / 52 / 439 across headings 9903.03.12, .13 and .14.

Every code is reconciled against the live HTS through the USITC REST API
before publication. All 554 resolve. The reconciliation also supplies each
line's ordinary duty rate, which is what makes the stacking display concrete:
7013.99.90 shows 7.2% + 50% = 57.2%, matching the worked example in §4.

Note 51(c) and (d) are captured too: the eight Section 232 carve-out
categories, and 554 civil aircraft codes, 28 of which also appear in 51(b).

**Empty-state bug is fixed**, and became a feature. A miss now distinguishes
four cases: the word is recognised and genuinely unlisted; it was listed until
a date that has passed; it is off Section 338 because Section 232 covers it;
or the word is unknown, in which case the app says so rather than implying a
clean result. Coverage counts moved to the header.

**Verification gates.** `npm run check` runs three scripts and fails the build:
`check-data.mjs` (code shape, counts, rates, blank descriptions, HTML leakage,
domain invariants), `check-aliases.mjs` (alias resolution, gated on collapse
rather than individual misses), and `search-smoke.mjs` (23 ranking assertions
against real queries, including six that must return nothing).

**Scheduled re-scrape** in `.github/workflows/refresh-data.yml`, with CI on
push in `ci.yml`.

### Open item from §7 now resolved

The conflicting dates around Canada's removal of counter-tariffs on roughly
$14.2B of goods: it was **1 September 2025**, not 2026. Finance Canada's own
section labels settle it — 1,814 tariff items "effective up to August 31,
2025", 313 "effective September 1, 2025 to September 7, 2026".

### Still open

**The 8-versus-10-digit screening question (§5) is untouched.** The working
assumption is still that a covered 8-digit heading catches all its 10-digit
children. This has not been verified against CBP guidance and it drives public
output. It is the most important remaining item.

**Personal and low-value shipments (§7) are still unverified.** The triage flow
hedges, as before. This is the question most consumers arrive with.

**Trade values were not built** (§8 step 6). Ranking results by import value
needs StatCan CIMT and U.S. Census DataWeb joined at HS-6. Everything needed to
do that join correctly is in place — the check script already reports the
HS-6 overlap — but no trade data is ingested. Nothing in the UI implies it is.

**Alias map is at 372 keys**, of which 329 resolve against current data. The 43
that resolve to nothing are kept on purpose: they are what lets the app answer
"we understood you, and it is not listed". Grow the map from logs of searches
that returned nothing.

### One thing to know about the search

Two bugs in the original scorer are worth not reintroducing. Alias keys were
matched as plain substrings, so "tee" fired inside "s**tee**l". And the trigram
fallback was scored alongside real term hits, so "sweater" returned milk powder
ahead of pullovers and "socks" returned socket wrenches. Keys now match on word
boundaries with an optional plural, and fuzzy matching runs only when the query
hit no alias key at all.

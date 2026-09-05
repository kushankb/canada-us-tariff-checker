#!/usr/bin/env node
/**
 * scrape-canada.mjs
 *
 * Pulls the Canadian counter-tariff lists from Finance Canada and writes
 * ../src/data/ca-measures.json (in force now) and ../src/data/ca-history.json
 * (superseded tranches).
 *
 * PAGE STRUCTURE (verified 2026-09-05)
 * The page is not one table. It is three <details> blocks, each labelled by
 * its <summary>, and the column layout differs between them:
 *
 *   "Effective September 8, 2026"                     648 rows, 4 columns
 *       Tariff item | HS heading | Indicative description | Tariff rate
 *       First cell is a <th>, not a <td>. Rate is a bare number ("50").
 *
 *   "Effective September 1, 2025 to September 7, 2026"  313 rows, 6 columns
 *   "Effective up to August 31, 2025"                  1814 rows, 6 columns
 *       Tariff item | HS chapter | HS heading | Indicative description
 *       | Effective date | Tariff rate      Rate is "25%". All cells <td>.
 *
 * Anything keying on cell index alone, or on td-only selection, silently
 * drops most of the page. Sections are matched on their summary text and
 * columns are located by header label.
 *
 * Run:  node scrape-canada.mjs
 * Deps: npm i cheerio
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import * as cheerio from "cheerio";

/* Resolve outputs against this file, not the working directory. Run from the
   repo root rather than ingest/, a bare "../src/data" lands a stray copy of
   the data one level above the project. */
const HERE = dirname(fileURLToPath(import.meta.url));

const SRC =
  "https://www.canada.ca/en/department-finance/programs/international-trade-finance-policy/" +
  "canadas-response-us-tariffs/complete-list-us-products-subject-to-counter-tariffs.html";

const OUT_CURRENT = resolve(HERE, "../src/data/ca-measures.json");
const OUT_HISTORY = resolve(HERE, "../src/data/ca-history.json");

const MIN_CURRENT = 600;   // fail loud below this
const MIN_HISTORY = 2000;  // 313 + 1814 across both superseded tranches

const TARIFF_ITEM = /^\d{4}\.\d{2}\.\d{2}$/;

/* HS chapter -> plain-language sector. Drives the filter chips in the UI.
   Order matters: first match wins, so narrower ranges come first. */
const SECTORS = [
  [/^0[1-2]/, "Meat & live animals"],
  [/^03/, "Fish & seafood"],
  [/^04/, "Dairy & eggs"],
  [/^0[5-9]|^1[0-4]/, "Produce & crops"],
  [/^1[5-9]|^2[0-3]/, "Food & drink"],
  [/^24/, "Tobacco"],
  [/^2[5-7]/, "Minerals & fuel"],
  [/^2[89]|^3[0-2]/, "Chemicals"],
  [/^33|^34/, "Cosmetics & soap"],
  [/^3[5-8]/, "Chemicals"],
  [/^39|^40/, "Plastics & rubber"],
  [/^4[1-3]/, "Leather & fur"],
  [/^4[4-6]/, "Wood"],
  [/^4[789]/, "Pulp & paper"],
  [/^5[0-9]|^60/, "Textiles"],
  [/^6[1-3]/, "Clothing"],
  [/^6[4-7]/, "Footwear & headgear"],
  [/^6[89]|^70/, "Stone, glass & ceramics"],
  [/^71/, "Jewellery & precious metal"],
  [/^7[2-9]|^8[0-3]/, "Metals"],
  [/^84/, "Machinery & appliances"],
  [/^85/, "Electronics"],
  [/^8[6-9]/, "Vehicles & transport"],
  [/^9[0-2]/, "Instruments & clocks"],
  [/^93/, "Arms"],
  [/^94/, "Furniture & lighting"],
  [/^9[5-6]/, "Toys & misc. goods"],
  [/^9[7-9]/, "Art & other"],
];

const sectorFor = (code) =>
  (SECTORS.find(([re]) => re.test(code.replace(/\D/g, ""))) || [, "Other"])[1];

/* The "indicative description" column is a breadcrumb of nested subheadings
   ("- Other cheese: Cheddar and Cheddar types: Within access commitment").
   Keep the leaf plus one parent: enough to disambiguate, short enough to read.
   13 rows on the current list have no description at all, so fall back to the
   HS heading rather than emitting a blank row. */
function readable(heading, indicative) {
  const parts = String(indicative || "")
    .replace(/^[-–\s]+/, "")
    .split(":")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!parts.length) return String(heading || "").replace(/\.$/, "").trim();
  return parts.slice(-2).join(" — ");
}

const clean = (s) => String(s).replace(/\s+/g, " ").trim();

/* Locate a <details> block by the text of its <summary>. */
function sectionBySummary($, needle) {
  let found = null;
  $("details").each((_, d) => {
    if (found) return;
    const sum = clean($(d).find("summary").first().text());
    if (sum.toLowerCase().includes(needle.toLowerCase())) {
      found = { el: $(d), label: sum };
    }
  });
  return found;
}

/* Map header labels -> column index, so a reordered or added column does not
   shift everything by one. */
function headerIndex($, table) {
  const cells = $(table).find("tr").first().children();
  const idx = {};
  cells.each((i, c) => {
    const t = clean($(c).text()).toLowerCase();
    if (t.includes("tariff item")) idx.code = i;
    else if (t.includes("chapter")) idx.chapter = i;
    else if (t.includes("heading")) idx.heading = i;
    else if (t.includes("description")) idx.desc = i;
    else if (t.includes("effective")) idx.effective = i;
    else if (t.includes("rate")) idx.rate = i;
  });
  return idx;
}

function parseTable($, table, { defaultEffective }) {
  const idx = headerIndex($, table);
  for (const need of ["code", "desc", "rate"]) {
    if (idx[need] === undefined) {
      throw new Error(
        `Column "${need}" not found in table header. Columns seen: ` +
          JSON.stringify(idx) +
          ". The page layout has changed; update headerIndex()."
      );
    }
  }

  const rows = [];
  $(table)
    .find("tr")
    .each((_, tr) => {
      // children(), not find("td") — the current list puts the tariff item in a <th>.
      const cells = $(tr).children().map((__, c) => clean($(c).text())).get();
      const code = cells[idx.code];
      if (!TARIFF_ITEM.test(code || "")) return; // header and spacer rows

      const rate = Number(String(cells[idx.rate]).replace(/[^\d.]/g, ""));
      if (!Number.isFinite(rate) || rate === 0) return;

      const heading = (cells[idx.heading] || "").replace(/\.$/, "");
      const row = {
        code,
        rate,
        sector: sectorFor(code),
        desc: readable(heading, cells[idx.desc]),
        heading, // full text, kept for search
      };
      const eff = idx.effective !== undefined ? cells[idx.effective] : "";
      row.effective = /^\d{4}-\d{2}-\d{2}$/.test(eff) ? eff : defaultEffective;
      rows.push(row);
    });
  return rows;
}

async function main() {
  const res = await fetch(SRC, { headers: { "User-Agent": "tariff-checker/1.0" } });
  if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  /* ---- the list in force ---- */
  const cur = sectionBySummary($, "Effective September 8, 2026");
  if (!cur) {
    throw new Error(
      'No <details> section whose summary contains "Effective September 8, 2026". ' +
        "Either a new tranche has been published under a different date, or the " +
        "page structure changed. Do not fall back to the first table on the page: " +
        "the historical tranches sit alongside the current one and would be " +
        "published as if they were in force."
    );
  }
  const curTable = cur.el.find("table").first();
  const measures = parseTable($, curTable, { defaultEffective: "2026-09-08" });

  if (measures.length < MIN_CURRENT) {
    throw new Error(
      `Only parsed ${measures.length} rows from the current list; expected ~650. ` +
        "The page structure may have changed."
    );
  }

  /* ---- superseded tranches, kept so the app can answer "it used to be" ---- */
  const HIST = [
    { needle: "Effective September 1, 2025", id: "2025-09-01", from: "2025-09-01", to: "2026-09-07" },
    { needle: "Effective up to August 31, 2025", id: "pre-2025-09", from: "2025-03-04", to: "2025-08-31" },
  ];
  const tranches = [];
  for (const h of HIST) {
    const sec = sectionBySummary($, h.needle);
    if (!sec) {
      console.warn(`Warning: historical section "${h.needle}" not found; skipping.`);
      continue;
    }
    const rows = parseTable($, sec.el.find("table").first(), { defaultEffective: h.from });
    tranches.push({ id: h.id, label: sec.label, from: h.from, to: h.to, count: rows.length, measures: rows });
  }

  const histTotal = tranches.reduce((n, t) => n + t.count, 0);
  if (histTotal < MIN_HISTORY) {
    throw new Error(
      `Only parsed ${histTotal} historical rows; expected ~2100. ` +
        "A short history file makes removed products look as if they were never listed."
    );
  }

  const listUpdated = (html.match(/List updated as of ([A-Z][a-z]+ \d{1,2}, \d{4})/) || [])[1] || null;

  const dupes = measures.length - new Set(measures.map((r) => r.code)).size;
  if (dupes) console.warn(`Warning: ${dupes} duplicate tariff items on the current list`);

  const payload = {
    source: SRC,
    scrapedAt: new Date().toISOString(),
    listUpdated,
    effective: "2026-09-08",
    label: cur.label,
    codeLevel: 8,
    count: measures.length,
    rates: [...new Set(measures.map((r) => r.rate))].sort((a, b) => a - b),
    // Finance Canada's own caveats. These are reproduced in the UI verbatim.
    caveats: [
      "The tariff items listed represent U.S. products subject to counter tariffs. The included Harmonized System headings and descriptions are for illustrative purposes.",
      "The list of products outlined at the tariff item level should be read in conjunction with the Schedule to Canada's Customs Tariff.",
    ],
    measures: measures.sort((a, b) => a.code.localeCompare(b.code)),
  };

  mkdirSync(dirname(OUT_CURRENT), { recursive: true });

  if (existsSync(OUT_CURRENT)) {
    const prev = JSON.parse(readFileSync(OUT_CURRENT, "utf8"));
    const before = new Map(prev.measures.map((m) => [m.code, m.rate]));
    const after = new Map(measures.map((r) => [r.code, r.rate]));
    const added = [...after.keys()].filter((c) => !before.has(c));
    const removed = [...before.keys()].filter((c) => !after.has(c));
    const rateChanged = [...after.entries()].filter(([c, r]) => before.has(c) && before.get(c) !== r);
    if (added.length || removed.length || rateChanged.length) {
      console.log(`Changed: +${added.length} added, -${removed.length} removed, ${rateChanged.length} rate changes`);
      if (added.length) console.log(`  added:   ${added.slice(0, 10).join(", ")}`);
      if (removed.length) console.log(`  removed: ${removed.slice(0, 10).join(", ")}`);
      if (rateChanged.length)
        console.log(`  rates:   ${rateChanged.slice(0, 10).map(([c, r]) => `${c} ${before.get(c)}%->${r}%`).join(", ")}`);
    }
  }

  writeFileSync(OUT_CURRENT, JSON.stringify(payload, null, 2));

  writeFileSync(
    OUT_HISTORY,
    JSON.stringify(
      {
        source: SRC,
        scrapedAt: new Date().toISOString(),
        note:
          "Superseded counter-tariff tranches. Used only to tell a user that a product " +
          "was once listed and no longer is. Never merge these into the current list.",
        codeLevel: 8,
        tranches,
      },
      null,
      2
    )
  );

  console.log(`Wrote ${measures.length} tariff items to ${OUT_CURRENT}`);
  console.log(`Rates present: ${payload.rates.join("%, ")}%`);
  console.log(`List updated as of: ${listUpdated}`);
  for (const t of tranches) console.log(`History: ${t.count} rows — ${t.label}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

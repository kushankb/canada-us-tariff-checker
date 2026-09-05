#!/usr/bin/env node
/**
 * fetch-trade-values.mjs
 *
 * Builds ../src/data/trade-2025.json — 2025 bilateral trade values, so results
 * can be ranked by how much trade a line actually carries rather than by
 * alphabetical accident.
 *
 * WHY ONE SOURCE FOR BOTH DIRECTIONS
 * The obvious design is Census for the U.S. side and StatCan for the Canadian
 * side. StatCan's open data service does not publish bilateral trade at
 * tariff-line detail — its open tables stop at HS section and chapter — and
 * the tariff-item detail sits behind the CIMT application rather than an API.
 *
 * The U.S. Census API publishes both directions: imports from Canada, and
 * exports to Canada. Exports to Canada are the mirror of Canada's imports from
 * the U.S. One source, one key, two requests, one methodology.
 *
 * The cost of that choice is real and is recorded in the output: mirror
 * statistics do not equal the partner's own figures. Valuation differs (FOB
 * against FAS), timing differs, and re-exports are treated differently. For
 * ranking lines by economic weight this is entirely fit for purpose. For
 * quoting a dollar figure as Canada's official import statistic it is not, and
 * the UI says so.
 *
 * JOIN LEVELS
 *   U.S. side     HS10 imports aggregated to 8 digits. Census import codes are
 *                 HTS, and the Section 338 list is 8-digit HTS, so this is a
 *                 same-country join and exact at 8.
 *   Canada side   HS6 only. U.S. exports are classified under Schedule B,
 *                 which diverges from both HTS and Canada's tariff items below
 *                 6 digits. Joining lower would produce silent, plausible
 *                 errors — the failure mode this project exists to avoid.
 *
 * Run:  CENSUS_API_KEY=... node fetch-trade-values.mjs
 *       CENSUS_API_KEY=... node fetch-trade-values.mjs 2024   (any year)
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../src/data/trade-2025.json");

const API = "https://api.census.gov/data/timeseries/intltrade";
const CANADA = "1220"; // Census country code
const YEAR = process.argv[2] || "2025";

/* Year-to-date at December is the calendar-year total, so one request per
   direction rather than twelve. */
const PERIOD = `${YEAR}-12`;

const KEY = process.env.CENSUS_API_KEY;
if (!KEY) {
  console.error(
    [
      "CENSUS_API_KEY is not set.",
      "",
      "The U.S. Census trade API requires a key. It is free and issued instantly:",
      "  https://api.census.gov/data/key_signup.html",
      "",
      "Then:  CENSUS_API_KEY=your-key node fetch-trade-values.mjs",
      "",
      "Without it no trade values are written. The app runs fine without them —",
      "it simply does not show trade weight. It will not show invented numbers.",
    ].join("\n")
  );
  process.exit(1);
}

async function census(path, params) {
  const url = new URL(`${API}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", KEY);

  const res = await fetch(url, { headers: { "User-Agent": "tariff-checker/1.0" } });
  const body = await res.text();

  if (!res.ok) {
    if (res.status === 401 || /Invalid Key|Missing Key/i.test(body)) {
      throw new Error(
        `Census rejected the API key (HTTP ${res.status}). Check CENSUS_API_KEY.`
      );
    }
    throw new Error(`Census API ${res.status} for ${path}: ${body.slice(0, 300)}`);
  }

  let rows;
  try {
    rows = JSON.parse(body);
  } catch {
    throw new Error(`Census returned non-JSON for ${path}: ${body.slice(0, 300)}`);
  }
  if (!Array.isArray(rows) || rows.length < 2) {
    throw new Error(`Census returned no rows for ${path}. Is ${YEAR} published yet?`);
  }

  // First row is the header; turn the rest into objects.
  const [header, ...data] = rows;
  return data.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

const digits = (c) => String(c || "").replace(/\D/g, "");

function rollUp(rows, codeField, valueField, level) {
  const out = new Map();
  let skipped = 0;
  for (const r of rows) {
    const d = digits(r[codeField]);
    if (d.length < level) {
      skipped++;
      continue;
    }
    const key = d.slice(0, level);
    const v = Number(r[valueField]);
    if (!Number.isFinite(v)) {
      skipped++;
      continue;
    }
    out.set(key, (out.get(key) || 0) + v);
  }
  return { totals: out, skipped };
}

const fmtCode = (d) =>
  d.length === 8 ? `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}` : `${d.slice(0, 4)}.${d.slice(4, 6)}`;

const asObject = (map) =>
  Object.fromEntries(
    [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => [fmtCode(k), v])
  );

async function main() {
  console.log(`Fetching ${YEAR} U.S.–Canada trade from the Census API…`);

  // U.S. imports from Canada, at 10 digits so it can roll to an exact 8.
  const imports = await census("imports/hs", {
    get: "I_COMMODITY,GEN_VAL_YR",
    COMM_LVL: "HS10",
    CTY_CODE: CANADA,
    time: PERIOD,
  });
  console.log(`  imports from Canada: ${imports.length} ten-digit lines`);

  // U.S. exports to Canada, the mirror of Canada's imports. HS6 only — see the
  // note at the top of this file on why nothing lower is valid here.
  const exports = await census("exports/hs", {
    get: "E_COMMODITY,ALL_VAL_YR",
    COMM_LVL: "HS6",
    CTY_CODE: CANADA,
    time: PERIOD,
  });
  console.log(`  exports to Canada:   ${exports.length} six-digit lines`);

  const imp8 = rollUp(imports, "I_COMMODITY", "GEN_VAL_YR", 8);
  const imp6 = rollUp(imports, "I_COMMODITY", "GEN_VAL_YR", 6);
  const exp6 = rollUp(exports, "E_COMMODITY", "ALL_VAL_YR", 6);

  const sum = (m) => [...m.values()].reduce((a, b) => a + b, 0);
  const impTotal = sum(imp8.totals);
  const expTotal = sum(exp6.totals);

  // Both directions run to hundreds of billions. Anything far below that means
  // a truncated response or the wrong country code, not a quiet trade collapse.
  if (impTotal < 1e11 || expTotal < 1e11) {
    throw new Error(
      `Totals look wrong: imports $${(impTotal / 1e9).toFixed(1)}B, exports ` +
        `$${(expTotal / 1e9).toFixed(1)}B. Both should be in the hundreds of billions. ` +
        "Check the country code and that the year is fully published."
    );
  }

  const payload = {
    available: true,
    year: Number(YEAR),
    fetchedAt: new Date().toISOString(),
    source: {
      name: "U.S. Census Bureau, USA Trade Online API",
      api: API,
      countryCode: CANADA,
      period: PERIOD,
      measure: {
        imports: "GEN_VAL_YR — year-to-date general imports, total value, USD",
        exports: "ALL_VAL_YR — year-to-date total exports, total value, USD",
      },
    },
    caveat:
      "U.S. exports to Canada are a mirror of Canada's imports from the U.S. They " +
      "are not Statistics Canada's figures: valuation, timing and the treatment of " +
      "re-exports all differ. Use them to rank lines by economic weight, not to quote " +
      "an official Canadian import statistic.",
    joinLevels: {
      usSection338: 8,
      canadaCounterTariff: 6,
      note:
        "The U.S. join is same-country HTS to HTS and exact at 8 digits. The Canadian " +
        "join is against Schedule B export codes, which diverge from Canada's tariff " +
        "items below 6 digits, so it is aggregated to 6 first.",
    },
    totals: { usImportsFromCanada: impTotal, usExportsToCanada: expTotal },
    counts: {
      usImportsHs8: imp8.totals.size,
      usImportsHs6: imp6.totals.size,
      usExportsHs6: exp6.totals.size,
      skipped: imp8.skipped + exp6.skipped,
    },
    // Keyed by dotted code. Values are USD for the calendar year.
    usImportsFromCanadaHs8: asObject(imp8.totals),
    usImportsFromCanadaHs6: asObject(imp6.totals),
    usExportsToCanadaHs6: asObject(exp6.totals),
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload, null, 2));

  console.log(`\nWrote ${OUT}`);
  console.log(`  U.S. imports from Canada ${YEAR}: $${(impTotal / 1e9).toFixed(1)}B across ${imp8.totals.size} 8-digit lines`);
  console.log(`  U.S. exports to Canada   ${YEAR}: $${(expTotal / 1e9).toFixed(1)}B across ${exp6.totals.size} 6-digit lines`);
  if (payload.counts.skipped) console.log(`  skipped ${payload.counts.skipped} rows with short or non-numeric values`);
}

main().catch((e) => {
  console.error("\n" + e.message);
  process.exit(1);
});

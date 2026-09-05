#!/usr/bin/env node
/**
 * Tests the trade-value join against a fixture, so the code path is exercised
 * even when no Census key is present and the shipped file is a placeholder.
 *
 * The join is asymmetric by design and that is the thing worth testing: the
 * U.S. side joins at 8 digits because both sides of it are HTS, and the
 * Canadian side joins at 6 because U.S. export codes are Schedule B and
 * diverge from Canada's tariff items below that.
 */
import { tradeWeight, fmtUSD } from "../src/lib/trade.js";

const FIXTURE = {
  available: true,
  year: 2025,
  usImportsFromCanadaHs8: { "7013.99.90": 12_345_678, "4412.10.05": 9_000 },
  usExportsToCanadaHs6: { "0402.10": 250_000_000, "4818.10": 1_500_000_000 },
};

const EMPTY = { available: false, usImportsFromCanadaHs8: {}, usExportsToCanadaHs6: {} };

let fails = 0;
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) {
    fails++;
    console.log(`FAIL  ${name}\n        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`);
  } else {
    console.log(`ok    ${name}`);
  }
};

/* U.S. side: exact 8-digit join. */
check(
  "us line joins at 8 digits, exactly",
  tradeWeight({ side: "us", code: "7013.99.90" }, FIXTURE),
  { usd: 12_345_678, level: 8, direction: "U.S. imports from Canada", exact: true }
);

/* Canadian side: rolls the 8-digit tariff item up to its HS-6 heading. */
check(
  "ca line joins at HS-6 and is flagged inexact",
  tradeWeight({ side: "ca", code: "0402.10.10" }, FIXTURE),
  {
    usd: 250_000_000,
    level: 6,
    hs6: "0402.10",
    direction: "U.S. exports to Canada",
    exact: false,
    mirror: true,
  }
);

check(
  "a different 8-digit item under the same HS-6 heading gets the same figure",
  tradeWeight({ side: "ca", code: "0402.10.20" }, FIXTURE)?.usd,
  250_000_000
);

/* Absences must be null, never zero: "not measured" is not "no trade". */
check("unmatched us code returns null", tradeWeight({ side: "us", code: "9999.99.99" }, FIXTURE), null);
check("unmatched ca code returns null", tradeWeight({ side: "ca", code: "9999.99.99" }, FIXTURE), null);
check("scope-level record with no code returns null", tradeWeight({ side: "us" }, FIXTURE), null);
check("placeholder dataset returns null", tradeWeight({ side: "us", code: "7013.99.90" }, EMPTY), null);
check("missing dataset returns null", tradeWeight({ side: "us", code: "7013.99.90" }, undefined), null);

/* The U.S. join must never silently fall back to HS-6. */
check(
  "us line with no 8-digit match does not borrow an HS-6 figure",
  tradeWeight({ side: "us", code: "0402.10.10" }, FIXTURE),
  null
);

/* Money formatting across the range it actually spans. */
check("fmtUSD billions", fmtUSD(1_500_000_000), "$1.5B");
check("fmtUSD tens of billions drops the decimal", fmtUSD(24_000_000_000), "$24B");
check("fmtUSD millions", fmtUSD(12_345_678), "$12M");
check("fmtUSD single-digit millions keeps a decimal", fmtUSD(1_200_000), "$1.2M");
check("fmtUSD thousands", fmtUSD(9_000), "$9K");
check("fmtUSD non-numeric", fmtUSD(undefined), "");

console.log(fails ? `\n${fails} failed.` : "\nAll trade join tests passed.");
process.exit(fails ? 1 : 0);

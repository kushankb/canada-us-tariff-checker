#!/usr/bin/env node
/**
 * Data integrity gate. Runs before the app is built or deployed.
 *
 * The rule this enforces is the one the whole project rests on: every code
 * shipped is a real 8-digit tariff line from a verified source. A fabricated
 * or malformed code that reaches the UI reads as authoritative, so this fails
 * the build rather than warning.
 */
import { readFileSync } from "node:fs";

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const ca = read("../src/data/ca-measures.json");
const us = read("../src/data/us-measures.json");
const hist = read("../src/data/ca-history.json");

const CODE = /^\d{4}\.\d{2}\.\d{2}$/;
const errors = [];
const warn = (m) => console.log(`  warn: ${m}`);

function checkCodes(rows, label, getCode) {
  const bad = rows.filter((r) => !CODE.test(getCode(r)));
  if (bad.length) {
    errors.push(
      `${label}: ${bad.length} codes are not 8-digit dotted lines, e.g. ${bad
        .slice(0, 5)
        .map(getCode)
        .join(", ")}`
    );
  }
  const codes = rows.map(getCode);
  const dupes = codes.length - new Set(codes).size;
  if (dupes) warn(`${label}: ${dupes} duplicate codes`);
  return codes.length;
}

/* --- shape and completeness --- */
if (ca.codeLevel !== 8) errors.push(`Canada codeLevel is ${ca.codeLevel}, expected 8`);
if (us.codeLevel !== 8) errors.push(`U.S. codeLevel is ${us.codeLevel}, expected 8`);

const nCa = checkCodes(ca.measures, "Canada", (m) => m.code);
const nUs = checkCodes(us.section338, "U.S. Section 338", (m) => m.code);
checkCodes(us.aircraftExclusions, "U.S. note 51(d)", (m) => m.code);
for (const t of hist.tranches) checkCodes(t.measures, `history ${t.id}`, (m) => m.code);

if (nCa < 600) errors.push(`Canada has ${nCa} rows; a complete list is ~648. Refusing to ship a partial list.`);
if (nUs < 500) errors.push(`U.S. has ${nUs} Section 338 codes; expected ~554.`);
if (ca.count !== nCa) errors.push(`Canada count field says ${ca.count}, actual ${nCa}`);
if (us.counts.section338 !== nUs) errors.push(`U.S. count field says ${us.counts.section338}, actual ${nUs}`);

/* --- rates --- */
const caRates = new Set(ca.measures.map((m) => m.rate));
for (const r of caRates) {
  if (![15, 25, 50].includes(r)) errors.push(`Canada has an unexpected rate: ${r}%`);
}
for (const m of us.section338) {
  if (m.rate !== 50) errors.push(`U.S. Section 338 line ${m.code} has rate ${m.rate}, expected 50`);
}

/* --- descriptions --- */
const blankCa = ca.measures.filter((m) => !m.desc || !m.desc.trim()).length;
const blankUs = us.section338.filter((m) => !m.desc || !m.desc.trim()).length;
if (blankCa) errors.push(`${blankCa} Canadian rows have no description`);
if (blankUs) errors.push(`${blankUs} U.S. rows have no description`);

const markup = [...ca.measures, ...us.section338].filter((m) => /<[a-z/][^>]*>/i.test(`${m.desc} ${m.heading}`));
if (markup.length) errors.push(`${markup.length} rows still carry HTML markup, e.g. ${markup[0].code}`);

/* --- domain rules --- */
if (us.section338.some((m) => m.cusmaExempt)) {
  errors.push("A Section 338 line is marked CUSMA-exempt. Section 338 coverage does not turn on CUSMA origin.");
}
if (!us.exclusionCategories?.length) {
  errors.push("U.S. note 51(c) exclusion categories are missing. Section 232 goods would look uncovered.");
}
if (!ca.caveats?.length) {
  errors.push("Finance Canada's caveats are missing. They must stay visible in the UI.");
}

/* Cross-country joins are only valid at HS-6, so confirm we never claim a
   shared 8-digit code space between the two lists. */
const shared8 = ca.measures.map((m) => m.code).filter((c) => us.section338.some((u) => u.code === c));
const shared6 = new Set(
  ca.measures
    .map((m) => m.code.slice(0, 7))
    .filter((c6) => us.section338.some((u) => u.code.slice(0, 7) === c6))
);
console.log(
  `Canada ${nCa} lines · U.S. ${nUs} lines · ${shared8.length} identical 8-digit codes, ${shared6.size} overlapping HS-6 headings`
);
console.log("  (the HS-6 figure is the only valid cross-country comparison)");

if (errors.length) {
  console.error(`\n${errors.length} problem(s):`);
  errors.forEach((e) => console.error(`  ✗ ${e}`));
  process.exit(1);
}
console.log("\nData checks passed.");

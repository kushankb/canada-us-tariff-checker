import assert from "node:assert/strict";
import * as cheerio from "cheerio";
import { currentSection, historicalSections } from "./scrape-canada.mjs";

const $ = cheerio.load(`
  <details><summary>Effective November 1, 2026</summary><table></table></details>
  <details><summary>Effective October 10, 2026</summary><table></table></details>
  <details><summary>Effective September 8, 2026</summary><table></table></details>
  <details><summary>Effective September 1, 2025 to September 7, 2026</summary><table></table></details>
  <details><summary>Effective up to August 31, 2025</summary><table></table></details>
`);

const current = currentSection($, new Date("2026-10-12T00:00:00Z"));
assert.equal(current.label, "Effective October 10, 2026");
assert.equal(current.from, "2026-10-10");

assert.deepEqual(
  historicalSections($, current).map(({ from, to }) => [from, to]),
  [
    ["2025-09-01", "2026-09-07"],
    ["2026-09-08", "2026-10-09"],
  ]
);

console.log("Canada scraper section selection passed.");

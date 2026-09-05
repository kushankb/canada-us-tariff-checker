#!/usr/bin/env node
/**
 * Search smoke test. Every query here is one a real user would type; the
 * expectation is written as "the top hit's code must start with X", because
 * ranking is what the alias map exists to get right. The result-count cap
 * catches the other failure mode: a query that technically matches but buries
 * the answer in a couple of hundred rows.
 */
import { readFileSync } from "node:fs";
import { indexItems, search } from "../src/lib/search.js";

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const ca = read("../src/data/ca-measures.json");
const us = read("../src/data/us-measures.json");

const shape = (m, side) => ({
  side,
  code: m.code,
  rate: m.rate,
  sector: m.sector,
  desc: m.desc,
  heading: m.heading,
  qualifier: m.qualifier,
  authority: m.authority || "Canada counter-tariff",
});

const caIdx = indexItems(ca.measures.map((m) => shape(m, "ca")));
const usIdx = indexItems([
  ...us.section338.map((m) => shape(m, "us")),
  ...us.otherMeasures.map((m, i) => ({
    side: "us",
    id: `scope-${i}`,
    rate: m.rate,
    sector: m.sector,
    desc: m.scope,
    heading: m.scope,
    authority: m.authority,
  })),
]);

/* [side, query, expected code prefix of the top hit] */
const CASES = [
  ["ca", "toilet paper", "4818"],
  ["ca", "sweater", "6110"],
  ["ca", "t-shirt", "6109"],
  ["ca", "6109", "6109"],
  ["ca", "6109.10", "6109.10"],
  ["ca", "plywood", "4412"],
  ["ca", "cheese", "0406"],
  ["ca", "honey", "0409"],
  ["ca", "rebar", "7213"],
  ["ca", "fishing rod", "9507"],
  ["us", "whisky", "2208"],
  ["us", "wine", "2204"],
  ["us", "plywood", "4412"],
  ["us", "milk", "0402"],
  ["us", "4412", "4412"],
  ["us", "antiques", "9706"],
  ["us", "seeds", "1209"],
];

/* Words we understand that are genuinely on neither list. These must come
   back empty, not fuzzy-matched into something that looks like an answer:
   "socks" finding socket wrenches is worse than finding nothing. */
const MUST_BE_EMPTY = [
  ["ca", "socks"],
  ["us", "socks"],
  ["ca", "tomatoes"],
  ["us", "sunglasses"],
  ["ca", "mattress"],
  ["us", "vitamins"],
];

let fails = 0;
const MAX_RESULTS = 120;

for (const [side, q, want] of CASES) {
  const idx = side === "ca" ? caIdx : usIdx;
  const { results } = search(idx, q);
  const top = results[0];
  const ok = top && String(top.code || "").startsWith(want);
  const tooBroad = results.length > MAX_RESULTS;

  if (!ok || tooBroad) {
    fails++;
    console.log(
      `FAIL  [${side}] "${q}" -> ${results.length} results, top ${
        top ? top.code : "none"
      } "${top ? top.desc.slice(0, 44) : ""}" expected ${want}${
        tooBroad ? `  [too broad, >${MAX_RESULTS}]` : ""
      }`
    );
  } else {
    console.log(
      `ok    [${side}] "${q}" -> ${String(results.length).padStart(3)} results, top ${top.code}`
    );
  }
}

for (const [side, q] of MUST_BE_EMPTY) {
  const idx = side === "ca" ? caIdx : usIdx;
  const { results } = search(idx, q);
  if (results.length) {
    fails++;
    console.log(
      `FAIL  [${side}] "${q}" -> expected no results, got ${results.length}, top ${
        results[0].code
      } "${results[0].desc.slice(0, 44)}"`
    );
  } else {
    console.log(`ok    [${side}] "${q}" -> correctly empty`);
  }
}

const total = CASES.length + MUST_BE_EMPTY.length;
console.log(`\n${total - fails}/${total} passed.`);
process.exit(fails ? 1 : 0);

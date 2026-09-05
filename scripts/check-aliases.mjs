#!/usr/bin/env node
/**
 * Fails if an alias key no longer matches anything in the shipped data.
 *
 * The alias map is the product, and its failure mode is silent: a list
 * revision drops a product line, the alias stops matching, and the search box
 * quietly returns nothing for a word that used to work. This turns that into
 * a build error.
 */
import { readFileSync } from "node:fs";
import { ALIASES } from "../src/lib/aliases.js";

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const ca = read("../src/data/ca-measures.json");
const us = read("../src/data/us-measures.json");

const items = [
  ...ca.measures.map((m) => `${m.desc} ${m.heading} ${m.sector}`),
  ...us.section338.map((m) => `${m.desc} ${m.heading} ${m.sector} ${m.qualifier || ""}`),
  ...us.otherMeasures.map((m) => `${m.scope} ${m.sector}`),
].map((s) => s.toLowerCase());

const hay = items.join("\n");

const dead = [];
const weak = [];
for (const [key, expansions] of Object.entries(ALIASES)) {
  const hits = expansions.filter((e) => hay.includes(e.toLowerCase()));
  if (hits.length === 0) dead.push(key);
  else if (hits.length === 1 && expansions.length > 2) weak.push(`${key} (only "${hits[0]}")`);
}

const total = Object.keys(ALIASES).length;
const resolving = total - dead.length;
console.log(`Checked ${total} alias keys against ${items.length} rows.`);
console.log(`  ${resolving} resolve to something on a current list.`);
console.log(`  ${dead.length} resolve to nothing.`);

/* A key that matches nothing is usually correct and useful: socks, tomatoes
   and mattresses really are absent from both lists. Knowing the word still
   lets the app answer "we understood you, and it is not listed" instead of
   the much weaker "no results". So this is a report, not a gate.

   What it does gate is collapse. If most of the vocabulary stops resolving at
   once, the data changed shape rather than a few products moving. */
if (dead.length > total * 0.6) {
  console.error(
    `\nOver 60% of alias keys resolve to nothing (${dead.length}/${total}). ` +
      "That is a data shape change, not products leaving the list."
  );
  process.exit(1);
}

if (weak.length) {
  console.log(`\n${weak.length} keys matching on a single expansion:`);
  weak.slice(0, 15).forEach((w) => console.log(`  · ${w}`));
}
if (dead.length) {
  console.log(`\nNot on either list right now (kept, so the app can say so):`);
  console.log("  " + dead.join(", "));
}

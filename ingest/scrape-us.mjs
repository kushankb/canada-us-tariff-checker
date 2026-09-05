#!/usr/bin/env node
/**
 * scrape-us.mjs
 *
 * Builds ../src/data/us-measures.json — the U.S. side of the tariff picture.
 *
 * SOURCE DECISION
 * The handoff proposed CBP's CSMS #69606660 attachment or the White House
 * annex PDFs, because the Federal Register renders the proclamation annexes
 * as images. Both are avoidable. The Section 338 code lists are enacted into
 * the tariff schedule itself as U.S. note 51 to subchapter III of chapter 99,
 * and the USITC publishes chapter 99 as a PDF with a real text layer. That is
 * the authoritative text, it is machine-readable, and it is reissued with
 * every HTS revision — so no OCR, and no transcription step to get wrong.
 *
 * WHAT NOTE 51 CONTAINS
 *   51(b)(1)  codes dutiable under heading 9903.03.12
 *   51(b)(2)  codes dutiable under heading 9903.03.13
 *   51(b)(3)  codes dutiable under heading 9903.03.14
 *   51(c)     exclusions, given as chapter 99 headings, not product codes:
 *             steel/aluminum/copper, vehicles and parts, wood, semiconductors,
 *             patented pharmaceuticals. These are the Section 232 carve-outs.
 *   51(d)     exclusions, given as 8-digit codes: civil aircraft and parts
 *             meeting General Note 6.
 *
 * Every code parsed out of the note is then reconciled against the live HTS
 * through the USITC REST API. A code that does not resolve to a real tariff
 * line is reported and dropped, never published.
 *
 * Run:  node scrape-us.mjs                 (downloads the current chapter 99)
 *       node scrape-us.mjs ./ch99.pdf      (uses a local copy)
 * Deps: npm i pdfjs-dist
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/* Resolve outputs against this file, not the working directory. Run from the
   repo root rather than ingest/, a bare "../src/data" lands a stray copy of
   the data one level above the project. */
const HERE = dirname(fileURLToPath(import.meta.url));

const OUT = resolve(HERE, "../src/data/us-measures.json");
const CH99_PDF =
  "https://hts.usitc.gov/reststop/file?release=currentRelease&filename=Chapter%2099";
const HTS_API = "https://hts.usitc.gov/reststop/exportList";

const MIN_COVERED = 500; // fail loud below this — the handoff expects ~554

/* An 8-digit HTS line, dot-formatted. Chapter 99 headings match this shape
   too, so they are filtered out separately: they are entry provisions, never
   covered product lines. */
const HTS8 = /\b(\d{4}\.\d{2}\.\d{2})\b/g;
const isCh99 = (c) => c.startsWith("99");

/* ---------- PDF text extraction ---------- */

/* pdfjs returns text items in the PDF's internal order, which for a
   multi-column table is not reading order. Sort by page, then by line
   (y, descending), then by x — otherwise the subdivision headers and the
   code blocks they introduce can interleave. */
async function pdfLines(data) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true, verbosity: 0 }).promise;
  const lines = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items = content.items
      .filter((i) => i.str && i.str.trim())
      .map((i) => ({ x: i.transform[4], y: i.transform[5], s: i.str }));

    // Bucket into lines on a 2pt tolerance, top of page first.
    const buckets = [];
    for (const it of items) {
      const b = buckets.find((k) => Math.abs(k.y - it.y) < 2);
      if (b) b.items.push(it);
      else buckets.push({ y: it.y, items: [it] });
    }
    buckets.sort((a, b) => b.y - a.y);
    for (const b of buckets) {
      b.items.sort((a, c) => a.x - c.x);
      lines.push(b.items.map((i) => i.s).join(" ").replace(/\s+/g, " ").trim());
    }
  }
  return lines;
}

/* ---------- note 51 segmentation ---------- */

function findIndex(lines, from, re) {
  for (let i = from; i < lines.length; i++) if (re.test(lines[i])) return i;
  return -1;
}

function codesBetween(lines, start, end) {
  const set = new Set();
  for (let i = start; i < end; i++) {
    for (const m of lines[i].matchAll(HTS8)) {
      const c = m[1];
      if (!isCh99(c)) set.add(c);
    }
  }
  return [...set].sort();
}

function parseNote51(lines) {
  // Anchor on the operative sentence of 51(a) rather than a bare "51." line,
  // which occurs on many pages as part of other text.
  const aIdx = findIndex(
    lines,
    0,
    /Except as provided for in headings 9903\.03\.15 and 9903\.03\.16/
  );
  if (aIdx < 0) throw new Error("U.S. note 51(a) not found in chapter 99. Check the HTS revision.");

  const marks = [
    { key: "b1", heading: "9903.03.12", re: /Heading 9903\.03\.12 applies to articles classifiable/ },
    { key: "b2", heading: "9903.03.13", re: /Heading 9903\.03\.13 applies to articles classifiable/ },
    { key: "b3", heading: "9903.03.14", re: /Heading 9903\.03\.14 applies to articles classifiable/ },
    { key: "c", heading: "9903.03.15", re: /As provided in heading 9903\.03\.15, the additional duties/ },
    { key: "d", heading: "9903.03.16", re: /As provided in heading 9903\.03\.16, the additional duties/ },
    { key: "end", re: /^\s*52\.\s*$|As provided in headings 9903\.05\.85/ },
  ];

  const at = {};
  let cursor = aIdx;
  for (const m of marks) {
    const i = findIndex(lines, cursor, m.re);
    if (i < 0) throw new Error(`Note 51 subdivision "${m.key}" not found. The note layout changed.`);
    at[m.key] = i;
    cursor = i;
  }

  return {
    b1: codesBetween(lines, at.b1, at.b2),
    b2: codesBetween(lines, at.b2, at.b3),
    b3: codesBetween(lines, at.b3, at.c),
    // 51(c) lists chapter 99 headings, not product codes. Captured as text.
    cText: lines.slice(at.c, at.d).join(" "),
    d: codesBetween(lines, at.d, at.end),
  };
}

/* 51(c) is a fixed set of eight categories keyed to Section 232 actions.
   Parsed from the note text so a change in the note is visible, but labelled
   here in plain language because the note itself only gives heading numbers. */
function parseExclusionCategories(text) {
  const cats = [
    [/articles of aluminum, of steel or of copper/i, "Steel, aluminum and copper, and derivatives", "Section 232"],
    [/passenger vehicles .*and light trucks\s*provided for/i, "Passenger vehicles and light trucks", "Section 232"],
    [/parts of passenger vehicles/i, "Parts of passenger vehicles and light trucks", "Section 232"],
    [/wood products provided for/i, "Wood products", "Section 232"],
    [/medium- and heavy-duty vehicles, buses/i, "Medium- and heavy-duty vehicles and buses", "Section 232"],
    [/medium- and heavy-duty vehicle parts/i, "Medium- and heavy-duty vehicle parts", "Section 232"],
    [/semiconductor articles provided for/i, "Semiconductor articles", "Section 232"],
    [/patented pharmaceutical articles provided for/i, "Patented pharmaceutical articles", "Section 232"],
  ];
  const found = [];
  for (const [re, label, authority] of cats) {
    if (re.test(text)) found.push({ label, authority });
  }
  if (found.length !== cats.length) {
    console.warn(
      `Warning: matched ${found.length} of ${cats.length} exclusion categories in note 51(c). ` +
        "The note may have been amended."
    );
  }
  return found;
}

/* ---------- reconciliation against the live HTS ---------- */

const chapterOf = (c) => c.slice(0, 2);

async function fetchChapter(ch) {
  const url = `${HTS_API}?from=${ch}01&to=${ch}99&format=JSON&styles=true`;
  const res = await fetch(url, { headers: { "User-Agent": "tariff-checker/1.0" } });
  if (!res.ok) throw new Error(`HTS API ${res.status} for chapter ${ch}`);
  return res.json();
}

/* Build an 8-digit index for every chapter our codes touch.
   Two things about the HTS export make the naive read wrong:

   1. It publishes 10-digit statistical lines. The 8-digit tariff line that
      note 51 names appears only as their prefix, so keying on an exact
      8-digit `htsno` finds almost nothing — 9 rows in chapter 4, against 272
      ten-digit ones. Key on the first 8 digits instead.

   2. Descriptions are nested by indent and many rows carry no code at all,
      only a grouping label. A line's own text is meaningless alone ("Other",
      "Described in general note 15..."), so walk the indent stack and keep
      the substantive ancestors for the plain-language description. */
const ADMIN_LEAF = /^(other|other:)$|^described in (general note|additional u\.s\. note)/i;

const to8 = (htsno) => {
  const d = String(htsno || "").replace(/\D/g, "");
  if (d.length < 8) return null;
  return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}`;
};

async function buildHtsIndex(codes) {
  const chapters = [...new Set(codes.map(chapterOf))].sort();
  const index = new Map();
  process.stdout.write(`Reconciling against HTS: ${chapters.length} chapters `);

  for (const ch of chapters) {
    let rows;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        rows = await fetchChapter(ch);
        break;
      } catch (e) {
        if (attempt === 3) throw e;
        await new Promise((r) => setTimeout(r, 800 * attempt));
      }
    }

    const stack = [];
    for (const r of rows) {
      const indent = Number(r.indent || 0);
      // The export carries inline markup (<u>Swietenia</u> and friends). It
      // must not reach the JSON, or it renders as literal angle brackets.
      const desc = String(r.description || "")
        .replace(/<[^>]*>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      stack.length = indent;
      stack[indent] = desc;

      const key = to8(r.htsno);
      if (!key || index.has(key)) continue;

      const trail = stack.slice(0, indent + 1).filter(Boolean);
      const substantive = trail.filter((t) => !ADMIN_LEAF.test(t));
      const leaf = trail[trail.length - 1] || "";

      index.set(key, {
        desc: (substantive.slice(-2).join(" — ") || leaf).replace(/:$/, ""),
        full: trail.join(" — "),
        qualifier: ADMIN_LEAF.test(leaf) ? leaf.replace(/:$/, "") : null,
        general: String(r.general || "").trim(),
      });
    }
    process.stdout.write(".");
  }
  process.stdout.write(" done\n");
  return index;
}

/* ---------- hand-maintained measures ---------- */

/* Section 232 and forced-labour measures are scope-level, not code lists.
   Few enough to maintain by hand. Review whenever a proclamation lands. */
const NON_338 = [
  { authority: "Section 232", sector: "Metals", rate: 50, scope: "Steel and aluminum, and derivative products", cusmaExempt: false, effective: "2026-08-22" },
  { authority: "Section 232", sector: "Metals", rate: 50, scope: "Copper and derivative products", cusmaExempt: false, effective: "2025-08-01" },
  { authority: "Section 232", sector: "Wood", rate: 10, scope: "Softwood timber and lumber", cusmaExempt: false, effective: "2025-10-14" },
  { authority: "Section 232", sector: "Furniture", rate: 30, scope: "Upholstered wooden furniture", cusmaExempt: false, effective: "2026-01-01" },
  { authority: "Section 232", sector: "Furniture", rate: 50, scope: "Kitchen cabinets and vanities", cusmaExempt: false, effective: "2026-01-01" },
  { authority: "Section 232", sector: "Pharmaceuticals", rate: 100, scope: "Patented pharmaceuticals and ingredients. Generics currently exempt. Annex III companies deferred to 2029-01-20", cusmaExempt: false, effective: "2026-09-29" },
  { authority: "Forced labour", sector: "Broad", rate: 12.5, scope: "Economies found not to enforce forced-labour import prohibitions, with exclusions in Annexes I and II Part A", cusmaExempt: true, effective: "2026-07-24" },
];

/* HS chapter -> plain-language sector. Kept in step with scrape-canada.mjs. */
const SECTORS = [
  [/^0[1-2]/, "Meat & live animals"], [/^03/, "Fish & seafood"], [/^04/, "Dairy & eggs"],
  [/^0[5-9]|^1[0-4]/, "Produce & crops"], [/^1[5-9]|^2[0-3]/, "Food & drink"], [/^24/, "Tobacco"],
  [/^2[5-7]/, "Minerals & fuel"], [/^2[89]|^3[0-2]/, "Chemicals"], [/^33|^34/, "Cosmetics & soap"],
  [/^3[5-8]/, "Chemicals"], [/^39|^40/, "Plastics & rubber"], [/^4[1-3]/, "Leather & fur"],
  [/^4[4-6]/, "Wood"], [/^4[789]/, "Pulp & paper"], [/^5[0-9]|^60/, "Textiles"],
  [/^6[1-3]/, "Clothing"], [/^6[4-7]/, "Footwear & headgear"], [/^6[89]|^70/, "Stone, glass & ceramics"],
  [/^71/, "Jewellery & precious metal"], [/^7[2-9]|^8[0-3]/, "Metals"], [/^84/, "Machinery & appliances"],
  [/^85/, "Electronics"], [/^8[6-9]/, "Vehicles & transport"], [/^9[0-2]/, "Instruments & clocks"],
  [/^93/, "Arms"], [/^94/, "Furniture & lighting"], [/^9[5-6]/, "Toys & misc. goods"],
  [/^9[7-9]/, "Art & other"],
];
const sectorFor = (c) =>
  (SECTORS.find(([re]) => re.test(c.replace(/\D/g, ""))) || [, "Other"])[1];

/* ---------- main ---------- */

async function loadPdf(argPath) {
  if (argPath) {
    if (!existsSync(argPath)) throw new Error(`Not found: ${argPath}`);
    console.log(`Reading local chapter 99: ${argPath}`);
    return new Uint8Array(readFileSync(argPath));
  }
  console.log("Downloading HTS chapter 99 from USITC…");
  const res = await fetch(CH99_PDF, { headers: { "User-Agent": "tariff-checker/1.0" } });
  if (!res.ok) throw new Error(`Chapter 99 download failed: HTTP ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.length < 1_000_000) {
    throw new Error(`Chapter 99 download is only ${buf.length} bytes; expected >1MB.`);
  }
  return buf;
}

/* Confirm the rate from the schedule itself rather than hardcoding 50. */
async function fetchEntryRates() {
  const res = await fetch(
    `${HTS_API}?from=9903.03.12&to=9903.03.16&format=JSON&styles=true`,
    { headers: { "User-Agent": "tariff-checker/1.0" } }
  );
  if (!res.ok) throw new Error(`HTS API ${res.status} for entry headings`);
  const rows = await res.json();
  const out = {};
  for (const r of rows) {
    const no = String(r.htsno || "").trim();
    const pct = String(r.general || "").match(/\+\s*(\d+(?:\.\d+)?)\s*%/);
    out[no] = { general: String(r.general || "").trim(), rate: pct ? Number(pct[1]) : null, description: String(r.description || "").replace(/\s+/g, " ").trim() };
  }
  return out;
}

async function main() {
  const buf = await loadPdf(process.argv[2]);
  const lines = await pdfLines(buf);
  const revision = (lines.find((l) => /Revision \d+ \(\d{4}\)/.test(l)) || "").match(/Revision \d+ \(\d{4}\)/)?.[0] || null;
  console.log(`Chapter 99 text extracted: ${lines.length} lines${revision ? ` — ${revision}` : ""}`);

  const note = parseNote51(lines);
  console.log(`Note 51 parsed: b1=${note.b1.length} b2=${note.b2.length} b3=${note.b3.length} d=${note.d.length}`);

  const entry = await fetchEntryRates();
  const rateFor = (h) => {
    const r = entry[h]?.rate;
    if (r == null) throw new Error(`No additional duty rate found for heading ${h} in the HTS.`);
    return r;
  };

  const covered = [];
  const seen = new Map();
  for (const [key, heading] of [["b1", "9903.03.12"], ["b2", "9903.03.13"], ["b3", "9903.03.14"]]) {
    for (const code of note[key]) {
      if (seen.has(code)) {
        console.warn(`Warning: ${code} appears under both ${seen.get(code)} and ${heading}`);
        continue;
      }
      seen.set(code, heading);
      covered.push({ code, rate: rateFor(heading), entryHeading: heading });
    }
  }

  if (covered.length < MIN_COVERED) {
    throw new Error(
      `Parsed only ${covered.length} Section 338 codes; expected ~554. ` +
        "Check whether note 51 was amended or the PDF text layer changed."
    );
  }

  // Reconcile every code — covered and excluded — against the live schedule.
  const allCodes = [...covered.map((c) => c.code), ...note.d];
  const hts = await buildHtsIndex(allCodes);

  const unresolved = [];
  const measures = [];
  const aircraftExcluded = new Set(note.d);

  for (const c of covered) {
    const hit = hts.get(c.code);
    if (!hit) {
      unresolved.push(c.code);
      continue;
    }
    measures.push({
      code: c.code,
      rate: c.rate,
      authority: "Section 338",
      sector: sectorFor(c.code),
      desc: hit.desc,
      heading: hit.full,
      qualifier: hit.qualifier || undefined,
      baseDuty: hit.general || null,
      cusmaExempt: false, // Section 338 coverage does not turn on CUSMA origin
      effective: "2026-08-22",
      entryHeading: c.entryHeading,
      // A code in both 51(b) and 51(d) is covered unless the article
      // qualifies as civil aircraft under General Note 6.
      aircraftCarveOut: aircraftExcluded.has(c.code) || undefined,
    });
  }

  const unresolvedD = note.d.filter((c) => !hts.get(c));
  if (unresolved.length || unresolvedD.length) {
    console.warn(
      `\nWarning: ${unresolved.length} covered and ${unresolvedD.length} excluded codes did ` +
        "not resolve to a current HTS line and were dropped, not published:"
    );
    console.warn("  covered: " + (unresolved.join(", ") || "none"));
    console.warn("  excluded: " + (unresolvedD.slice(0, 20).join(", ") || "none"));
  }

  if (measures.length < MIN_COVERED) {
    throw new Error(
      `Only ${measures.length} codes survived reconciliation against the HTS; expected ~554.`
    );
  }

  const payload = {
    source: {
      note: "U.S. note 51 to subchapter III of chapter 99, HTSUS",
      chapter99Pdf: CH99_PDF,
      htsApi: HTS_API,
      revision,
    },
    scrapedAt: new Date().toISOString(),
    codeLevel: 8,
    note:
      "Section 338 coverage is enacted as U.S. note 51 to subchapter III of chapter 99. " +
      "Codes are 8-digit HTSUS lines; entries file at 10 digits. A covered 8-digit heading " +
      "is expected to catch its 10-digit children — confirm against CBP guidance before " +
      "relying on that. Section 232 and forced-labour measures are scope-level records, " +
      "not code lists.",
    entryHeadings: entry,
    counts: {
      section338: measures.length,
      aircraftExcluded: note.d.length,
      exclusionCategories: 0,
      other: NON_338.length,
      droppedUnresolved: unresolved.length + unresolvedD.length,
    },
    section338: measures.sort((a, b) => a.code.localeCompare(b.code)),
    // 51(c): scope-level carve-outs, all of them Section 232 actions.
    exclusionCategories: parseExclusionCategories(note.cText),
    // 51(d): civil aircraft carve-out, by code.
    aircraftExclusions: note.d
      .filter((c) => hts.get(c))
      .map((c) => ({ code: c, sector: sectorFor(c), desc: hts.get(c).desc })),
    otherMeasures: NON_338,
  };
  payload.counts.exclusionCategories = payload.exclusionCategories.length;

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload, null, 2));

  const byRate = {};
  measures.forEach((m) => (byRate[m.rate] = (byRate[m.rate] || 0) + 1));
  console.log(`\nWrote ${measures.length} Section 338 codes to ${OUT}`);
  console.log(`  rates: ${Object.entries(byRate).map(([r, n]) => `${r}% × ${n}`).join(", ")}`);
  console.log(`  civil aircraft exclusions: ${payload.aircraftExclusions.length}`);
  console.log(`  scope exclusion categories: ${payload.exclusionCategories.length}`);
  console.log(`  other measures: ${NON_338.length}`);
}

main().catch((e) => {
  console.error("\n" + e.message);
  process.exit(1);
});

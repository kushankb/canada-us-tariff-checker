/**
 * Search: alias expansion, then substring, then a trigram fallback.
 *
 * Dependency-free and fast enough for the ~1,200 rows in play. If ranking
 * needs to improve, swap the scorer for MiniSearch — but keep the alias
 * layer, which sits upstream of whatever engine does the matching.
 */

import { ALIASES } from "./aliases.js";

export const norm = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9 .]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/* A query is a code lookup if it is mostly digits. Users type "6109",
   "6109.10", "610910" and "6109.10.00" and all four should work. */
export const asCodePrefix = (q) => {
  const bare = q.replace(/[^0-9]/g, "");
  return bare.length >= 2 && bare.length <= 8 && /^[\d.\s]+$/.test(q.trim()) ? bare : null;
};

function trigrams(s) {
  const t = ` ${s} `;
  const out = new Set();
  for (let i = 0; i < t.length - 2; i++) out.add(t.slice(i, i + 3));
  return out;
}

function trigramScore(a, b) {
  const A = trigrams(a);
  const B = trigrams(b);
  let hits = 0;
  A.forEach((g) => {
    if (B.has(g)) hits++;
  });
  return hits / Math.max(A.size, 1);
}

/* Longest alias keys first, so "kitchen cabinets" wins over "cabinets" and
   contributes both sets of terms rather than only the shorter one's.

   Each key is matched on word boundaries, with an optional plural. A plain
   substring test looks fine until it doesn't: "tee" sits inside "steel", so
   searching for steel quietly went looking for t-shirts. The optional "s"
   keeps "sweaters" matching the "sweater" key. */
const ALIAS_KEYS = Object.keys(ALIASES)
  .sort((a, b) => b.length - a.length)
  .map((key) => ({
    key,
    re: new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}s?\\b`),
  }));

export function expandQuery(q) {
  const n = norm(q);
  const direct = new Set(n.split(" ").filter((w) => w.length >= 3));
  const alias = new Set();
  const matched = [];
  for (const { key, re } of ALIAS_KEYS) {
    if (re.test(n)) {
      matched.push(key);
      ALIASES[key].forEach((v) =>
        norm(v)
          .split(" ")
          .forEach((w) => {
            if (w.length >= 3 && !direct.has(w)) alias.add(w);
          })
      );
    }
  }
  return {
    direct: [...direct],
    alias: [...alias],
    // Everything the caller might want to match on, direct first.
    terms: [...direct, ...alias],
    matched,
  };
}

/* Precomputed haystacks, so a keystroke does not re-normalise 1,200 strings.
   `lead` is the short description a user actually reads; `hay` adds the full
   schedule heading, which is long and matches almost anything. Scoring them
   separately is what stops a one-word alias hit buried in 200 characters of
   schedule text from ranking level with a real match. */
export function indexItems(items) {
  return items.map((item) => ({
    item,
    /* The last segment of a description is what the line actually is; the
       segments before it are the branch it hangs off. "Sheets for veneering
       ... for plywood" and "Of bamboo — Plywood" both contain the word, but
       only the second one IS plywood. Scoring the leaf separately is what
       puts 4412 above 4408 for that search. */
    leaf: norm(String(item.desc || "").split("—").pop()),
    lead: norm([item.desc, item.sector].filter(Boolean).join(" ")),
    hay: norm(
      [item.desc, item.heading, item.sector, item.qualifier, item.authority]
        .filter(Boolean)
        .join(" ")
    ),
    bareCode: (item.code || "").replace(/\./g, ""),
  }));
}

export function scoreEntry(entry, rawQuery, expanded) {
  const q = norm(rawQuery);
  if (!q) return 0;

  let score = 0;

  // Whole-phrase hit is the strongest textual signal, strongest of all when
  // it lands in the description rather than deep in the schedule text.
  if (entry.lead.includes(q)) score += 60;
  else if (entry.hay.includes(q)) score += 35;

  // What the line is, rather than what it hangs off.
  if (entry.leaf === q) score += 30;
  else if (entry.leaf.includes(q)) score += 18;

  // A word the user actually typed counts for more than one we inferred.
  for (const t of expanded.direct) {
    if (entry.lead.includes(t)) score += 16;
    else if (entry.hay.includes(t)) score += 10;
  }
  for (const t of expanded.alias) {
    if (entry.lead.includes(t)) score += 11;
    else if (entry.hay.includes(t)) score += 6;
  }

  return score;
}

/* Fuzzy matching is for typos, and nothing else. Run against the short
   description only: trigram overlap with 200 characters of schedule text is
   near-meaningless, and scoring it alongside real term hits is how "sweater"
   ends up returning milk powder ahead of pullovers. */
export function fuzzyScore(entry, rawQuery) {
  const q = norm(rawQuery);
  if (q.length < 4) return 0;
  const fz = trigramScore(q, entry.lead);
  return fz > 0.22 ? fz * 30 : 0;
}

/**
 * @param {Array} index  output of indexItems()
 * @param {string} query
 * @returns {{results: Array, matchedAliases: string[], mode: "code"|"text"|"all"}}
 */
export function search(index, query) {
  const q = query.trim();
  if (!q) return { results: index.map((e) => e.item), matchedAliases: [], mode: "all" };

  const codePrefix = asCodePrefix(q);
  if (codePrefix) {
    const hits = index
      .filter((e) => e.bareCode.startsWith(codePrefix))
      .map((e) => e.item)
      .sort((a, b) => a.code.localeCompare(b.code));
    return { results: hits, matchedAliases: [], mode: "code" };
  }

  const expanded = expandQuery(q);
  let scored = index
    .map((e) => ({ item: e.item, score: scoreEntry(e, q, expanded) }))
    .filter((r) => r.score > 4);

  /* Fall back to fuzzy matching only when nothing matched on terms AND the
     query is a word we do not know. If it hit an alias key we understand the
     product, so an empty result is the answer — socks really are not on
     either list — and guessing turns that into socket wrenches. An unknown
     word is the only case where a typo is the likely explanation. */
  let fuzzy = false;
  if (scored.length === 0 && expanded.matched.length === 0) {
    fuzzy = true;
    scored = index
      .map((e) => ({ item: e.item, score: fuzzyScore(e, q) }))
      .filter((r) => r.score > 0);
  }

  /* A fixed threshold cannot separate signal from tail here. "whisky" expands
     to "spirits", which appears in a couple of hundred schedule headings, and
     every one of those clears any absolute bar. Cut relative to the best hit
     instead: results well below the top match are noise regardless of how
     many there are, while a genuinely broad query like "steel" produces many
     matches at similar scores and keeps them all. */
  const top = scored.reduce((m, r) => Math.max(m, r.score), 0);
  const floor = Math.max(10, top * 0.45);

  const results = scored
    .filter((r) => r.score >= floor)
    .sort(
      (a, b) =>
        b.score - a.score ||
        String(a.item.code || "").localeCompare(String(b.item.code || ""))
    )
    .map((r) => r.item);

  return { results, matchedAliases: expanded.matched, mode: fuzzy ? "fuzzy" : "text" };
}

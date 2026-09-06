/**
 * Data layer.
 *
 * The two current lists are bundled: together they are ~490KB of JSON, which
 * gzips small and means the first search never waits on a network round trip.
 * The superseded Canadian tranches are ~856KB and are only needed to answer
 * "it used to be on the list", so they load on demand.
 */

import ca from "../data/ca-measures.json";
import us from "../data/us-measures.json";
import trade from "../data/trade-2025.json";
import { tradeWeight as join } from "./trade.js";

export const CA = ca;
export const US = us;
export const TRADE = trade;

/* ---------- shaping ---------- */

/* One row shape for both sides, so search and rendering stay simple. */
export const CA_ITEMS = ca.measures.map((m) => ({
  side: "ca",
  code: m.code,
  rate: m.rate,
  sector: m.sector,
  desc: m.desc,
  heading: m.heading,
  authority: "Canada counter-tariff",
  effective: m.effective || ca.effective,
}));

export const US_ITEMS = us.section338.map((m) => ({
  side: "us",
  code: m.code,
  rate: m.rate,
  sector: m.sector,
  desc: m.desc,
  heading: m.heading,
  qualifier: m.qualifier || null,
  baseDuty: m.baseDuty,
  authority: m.authority,
  entryHeading: m.entryHeading,
  aircraftCarveOut: !!m.aircraftCarveOut,
  effective: m.effective,
}));

/* Section 232 and forced-labour measures have no code list. They are searched
   alongside the coded rows but render differently: no code, and a note that
   coverage is decided by the proclamation's own scope. */
export const US_SCOPE_ITEMS = us.otherMeasures.map((m, i) => ({
  side: "us",
  id: `scope-${i}`,
  scopeLevel: true,
  rate: m.rate,
  sector: m.sector,
  desc: m.scope,
  heading: m.scope,
  authority: m.authority,
  cusmaExempt: m.cusmaExempt,
  effective: m.effective,
}));

export const US_ALL = [...US_ITEMS, ...US_SCOPE_ITEMS];

/* Codes carved out of Section 338 for civil aircraft under U.S. note 51(d). */
export const US_AIRCRAFT = new Map(
  (us.aircraftExclusions || []).map((a) => [a.code, a])
);

/* ---------- duty stacking ---------- */

/* Section 338's 50% is additional to the base MFN rate, not a replacement.
   Where the base rate is a plain percentage the two can be added and shown as
   one number. Where it is specific (3.3 cents per kilo) or compound, they
   cannot, and the app must not pretend otherwise. */
export function stackedDuty(item) {
  if (!item.baseDuty) return null;
  const base = item.baseDuty.trim();
  if (/^free$/i.test(base)) {
    return { kind: "free", total: `${item.rate}%`, base: "Free" };
  }
  const pct = base.match(/^(\d+(?:\.\d+)?)\s*%$/);
  if (pct) {
    const total = Math.round((Number(pct[1]) + item.rate) * 100) / 100;
    return { kind: "percent", total: `${total}%`, base };
  }
  return { kind: "specific", total: `${item.rate}% + ${base}`, base };
}

/* ---------- trade weight ---------- */

/* The join itself lives in trade.js as pure functions so it can be tested in
   Node without a bundler. Here it is simply bound to the shipped dataset. */
export { fmtUSD } from "./trade.js";

export const tradeWeight = (item, dataset = trade) => join(item, dataset);

/* The first segment of the breadcrumb is the product family — what the thing
   actually is. Without it a row reads "of a fat content, by weight, not
   exceeding 1.5 percent", which is unidentifiable; with it the list scans on
   the bold family name and the dim qualifier separates siblings. */
export function productFamily(item) {
  const trail = String(item.heading || item.desc || "");
  const first = trail.split("—")[0].trim().replace(/[:.]$/, "");
  return first || String(item.desc || "").trim();
}

/* The schedule describes a line as a breadcrumb — family, then subdivision,
   then the qualifier that actually distinguishes it from its siblings. Run
   together in a list that is a paragraph per row. The last segment is the
   distinguishing one, so the list shows that and the detail panel carries the
   whole thing. "Other" and bare qualifiers are useless alone, so those fall
   back to the fuller text. */
const WEAK_LEAF = /^(other|others)$/i;

export function shortLabel(item) {
  const full = String(item.desc || "").trim();
  const parts = full.split("—").map((x) => x.trim()).filter(Boolean);
  if (parts.length < 2) return full;

  const leaf = parts[parts.length - 1];
  if (WEAK_LEAF.test(leaf) || leaf.split(/\s+/).length < 3) {
    return parts.slice(-2).join(" — ");
  }
  return leaf;
}

/* Several 8-digit lines sit under one schedule heading, and listing each of
   them repeats that heading verbatim down the page — five rows of "Milk and
   cream, concentrated..." separated only by their code. Group them instead:
   the list shows each heading once, and the panel shows every line under it.

   Grouping is keyed on the 4-digit HS heading as well as the text, so two
   genuinely different headings that happen to share an opening phrase are
   never merged. Order follows first appearance, which preserves whatever
   ranking the caller has already applied. Scope-level measures have no code
   and are never grouped. */
export function groupByScheduleText(items) {
  const groups = [];
  const byKey = new Map();

  for (const item of items) {
    const scheduleText = productFamily(item);
    const key = item.code
      ? `${item.code.slice(0, 4)}|${scheduleText}`
      : `scope|${item.id}`;

    let g = byKey.get(key);
    if (!g) {
      g = {
        key,
        scheduleText,
        sector: item.sector,
        side: item.side,
        scopeLevel: !!item.scopeLevel,
        items: [],
      };
      byKey.set(key, g);
      groups.push(g);
    }
    g.items.push(item);
  }

  for (const g of groups) {
    const rates = g.items.map((i) => i.rate);
    g.minRate = Math.min(...rates);
    g.maxRate = Math.max(...rates);
    g.rateLabel = g.minRate === g.maxRate ? `${g.maxRate}%` : `${g.minRate}–${g.maxRate}%`;
    // Sectors can differ inside a heading; name the one that dominates.
    const bySector = {};
    g.items.forEach((i) => (bySector[i.sector] = (bySector[i.sector] || 0) + 1));
    g.sector = Object.entries(bySector).sort((a, b) => b[1] - a[1])[0][0];
  }

  return groups;
}

/* Rate bands. 50% is the top band on both sides, so it gets the strongest
   colour; 15% and 25% step down from it. */
export const rateColor = (r) =>
  r >= 50 ? "var(--r50)" : r >= 25 ? "var(--r25)" : "var(--r15)";

/* ---------- freshness ---------- */

const DAY = 86_400_000;

export function freshness(now = Date.now()) {
  const stamps = [ca.scrapedAt, us.scrapedAt].map((s) => new Date(s).getTime());
  const oldest = Math.min(...stamps);
  const ageDays = Math.floor((now - oldest) / DAY);
  return {
    checkedAt: new Date(oldest),
    ageDays,
    // Fail loud rather than serving stale tariff rates quietly.
    stale: ageDays >= 14,
  };
}

/* ---------- history (loaded on demand) ---------- */

let historyPromise = null;

export function loadHistory() {
  if (!historyPromise) {
    historyPromise = import("../data/ca-history.json").then((m) => m.default || m);
  }
  return historyPromise;
}

/* ---------- formatting ---------- */

export const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return d.toLocaleDateString("en-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};

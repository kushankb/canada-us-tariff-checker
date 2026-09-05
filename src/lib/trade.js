/**
 * Trade-weight join. Pure functions, no data imports, so they can be tested
 * directly in Node as well as bundled.
 *
 * The join is asymmetric on purpose:
 *
 *   U.S.    Census import codes are HTS and the Section 338 list is 8-digit
 *           HTS. Same-country join, exact at 8 digits.
 *   Canada  The figure is U.S. exports to Canada, classified under Schedule B,
 *           which diverges from Canada's tariff items below 6 digits. Joined
 *           and labelled at 6. Anything lower would be wrong in a way that
 *           still looks plausible, which is the failure this project exists to
 *           avoid.
 *
 * A miss returns null, never zero. "Not measured" is not "no trade", and a
 * zero would sort and read as the latter.
 */

export function tradeWeight(item, dataset) {
  if (!dataset?.available || !item?.code) return null;

  if (item.side === "us") {
    const usd = dataset.usImportsFromCanadaHs8?.[item.code];
    if (typeof usd !== "number") return null;
    return { usd, level: 8, direction: "U.S. imports from Canada", exact: true };
  }

  const hs6 = item.code.slice(0, 7); // "0402.10.10" -> "0402.10"
  const usd = dataset.usExportsToCanadaHs6?.[hs6];
  if (typeof usd !== "number") return null;
  return {
    usd,
    level: 6,
    hs6,
    direction: "U.S. exports to Canada",
    exact: false,
    mirror: true,
  };
}

/* Trade values span seven orders of magnitude, so a fixed number of decimals
   is either unreadable at one end or misleadingly precise at the other. */
export function fmtUSD(n) {
  if (!Number.isFinite(n)) return "";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(n >= 1e10 ? 0 : 1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

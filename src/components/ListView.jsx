import React, { useState, useMemo, useEffect } from "react";
import Row from "./Row.jsx";
import Detail from "./Detail.jsx";
import EmptyState from "./EmptyState.jsx";
import { indexItems, search } from "../lib/search.js";
import { CA_ITEMS, US_ALL, CA, US, fmtDate } from "../lib/data.js";

const PAGE = 60;

const CA_INDEX = indexItems(CA_ITEMS);
const US_INDEX = indexItems(US_ALL);

export default function ListView({ side }) {
  const [q, setQ] = useState("");
  const [rateF, setRateF] = useState(null);
  const [sectorF, setSectorF] = useState(null);
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState(null);

  const index = side === "ca" ? CA_INDEX : US_INDEX;
  const items = side === "ca" ? CA_ITEMS : US_ALL;

  const { results, matchedAliases, mode } = useMemo(() => search(index, q), [index, q]);

  const filtered = useMemo(() => {
    let r = results;
    if (rateF !== null) r = r.filter((i) => i.rate === rateF);
    if (sectorF) r = r.filter((i) => i.sector === sectorF);
    return r;
  }, [results, rateF, sectorF]);

  useEffect(() => setLimit(PAGE), [q, rateF, sectorF]);

  /* Opening a detail from halfway down a long result list otherwise leaves
     the reader looking at the middle of the panel. */
  useEffect(() => {
    if (open) window.scrollTo({ top: 0, behavior: "instant" });
  }, [open]);

  const rates = useMemo(
    () => [...new Set(items.map((d) => d.rate))].sort((a, b) => a - b),
    [items]
  );
  const sectors = useMemo(() => {
    const counts = {};
    items.forEach((i) => (counts[i.sector] = (counts[i.sector] || 0) + 1));
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([s]) => s);
  }, [items]);

  if (open) return <Detail item={open} onBack={() => setOpen(null)} />;

  const meta = side === "ca" ? CA : US;
  const asOf = side === "ca" ? CA.listUpdated : `HTS ${US.source.revision}`;

  return (
    <div>
      <p className="sub" style={{ marginBottom: "0.8rem" }}>
        {side === "ca" ? (
          <>
            Canada's counter-tariffs on goods of U.S. origin, in force from{" "}
            {fmtDate(CA.effective)}. {CA.count} tariff items at 15%, 25% or 50%.
          </>
        ) : (
          <>
            U.S. measures on goods of Canadian origin. Section 338 names {US.counts.section338}{" "}
            tariff lines at 50%. Section 232 and forced-labour measures sit alongside it and
            stack.
          </>
        )}
      </p>

      <div className="searchrow">
        <input
          className="field"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={
            side === "ca"
              ? "Try “toilet paper”, “sweater”, or 6109"
              : "Try “whisky”, “plywood”, or 4412"
          }
          aria-label={`Search the ${side === "ca" ? "Canadian" : "U.S."} list`}
        />
        {q && (
          <button className="clearbtn" onClick={() => setQ("")} aria-label="Clear search">
            ×
          </button>
        )}
      </div>

      {matchedAliases.length > 0 && (
        <p className="aliasnote">
          Also searching schedule words for{" "}
          {matchedAliases.slice(0, 3).map((a, i) => (
            <React.Fragment key={a}>
              {i > 0 ? ", " : ""}
              <b>{a}</b>
            </React.Fragment>
          ))}
          .
        </p>
      )}

      <div className="filters">
        <span className="lbl">Rate</span>
        <button className="pill" data-on={rateF === null ? "1" : "0"} onClick={() => setRateF(null)}>
          Any
        </button>
        {rates.map((r) => (
          <button
            key={r}
            className="pill"
            data-on={rateF === r ? "1" : "0"}
            onClick={() => setRateF(rateF === r ? null : r)}
          >
            {r}%
          </button>
        ))}
      </div>

      <div className="filters">
        <span className="lbl">Sector</span>
        <button
          className="pill"
          data-on={sectorF === null ? "1" : "0"}
          onClick={() => setSectorF(null)}
        >
          All
        </button>
        {sectors.map((s) => (
          <button
            key={s}
            className="pill"
            data-on={sectorF === s ? "1" : "0"}
            onClick={() => setSectorF(sectorF === s ? null : s)}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="resultbar">
        <span>
          {filtered.length.toLocaleString()} of {items.length.toLocaleString()}{" "}
          {filtered.length === 1 ? "line" : "lines"}
          {mode === "code" && q.trim() ? " · code lookup" : ""}
        </span>
        <span>as of {asOf}</span>
      </div>

      {filtered.length === 0 ? (
        q.trim() ? (
          <EmptyState query={q} side={side} onSearch={setQ} />
        ) : (
          <div className="empty">No lines match those filters.</div>
        )
      ) : (
        <>
          {filtered.slice(0, limit).map((item) => (
            <Row key={item.code || item.id} item={item} onOpen={setOpen} />
          ))}
          {filtered.length > limit && (
            <button className="morebtn" onClick={() => setLimit((l) => l + PAGE)}>
              Show {Math.min(PAGE, filtered.length - limit)} more of{" "}
              {(filtered.length - limit).toLocaleString()} remaining
            </button>
          )}
        </>
      )}
    </div>
  );
}

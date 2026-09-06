import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Sidebar from "./components/Sidebar.jsx";
import Row from "./components/Row.jsx";
import DetailPanel from "./components/DetailPanel.jsx";
import ContextPanel from "./components/ContextPanel.jsx";
import Story from "./components/Story.jsx";
import EmptyState from "./components/EmptyState.jsx";
import { indexItems, search } from "./lib/search.js";
import {
  CA_ITEMS,
  US_ALL,
  CA,
  US,
  TRADE,
  freshness,
  fmtDate,
  tradeWeight,
  groupByScheduleText,
  indexByHeading,
} from "./lib/data.js";

const PAGE = 60;

/* Built once. Re-normalising 1,200 strings on every keystroke is the one thing
   that would make this feel slow. */
const INDEX = { ca: indexItems(CA_ITEMS), us: indexItems(US_ALL) };
const ITEMS = { ca: CA_ITEMS, us: US_ALL };

function useFacets(items) {
  return useMemo(() => {
    const rate = new Map();
    const sector = new Map();
    for (const i of items) {
      rate.set(i.rate, (rate.get(i.rate) || 0) + 1);
      sector.set(i.sector, (sector.get(i.sector) || 0) + 1);
    }
    return {
      rates: [...rate.entries()]
        .map(([rate, n]) => ({ rate, n }))
        .sort((a, b) => a.rate - b.rate),
      sectors: [...sector.entries()]
        .map(([sector, n]) => ({ sector, n }))
        .sort((a, b) => b.n - a.n || a.sector.localeCompare(b.sector)),
    };
  }, [items]);
}

export default function App() {
  const [side, setSide] = useState(null); // null until the direction is chosen
  const [q, setQ] = useState("");
  const [rateF, setRateF] = useState(null);
  const [sectorF, setSectorF] = useState(null);
  const [sort, setSort] = useState("match");
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState(null);
  const [railOpen, setRailOpen] = useState(false);
  /* On narrow screens the rules panel is off-canvas, so it needs its own way
     in. On the wide layout it is simply always there and this stays false. */
  const [contextOpen, setContextOpen] = useState(false);

  const centerRef = useRef(null);
  const fresh = freshness();

  const items = side ? ITEMS[side] : [];
  const index = side ? INDEX[side] : [];
  const { rates, sectors } = useFacets(items);

  const { results, matchedAliases, mode } = useMemo(
    () => (side ? search(index, q) : { results: [], matchedAliases: [], mode: "all" }),
    [index, q, side]
  );

  const filtered = useMemo(() => {
    let r = results;
    if (rateF !== null) r = r.filter((i) => i.rate === rateF);
    if (sectorF) r = r.filter((i) => i.sector === sectorF);

    if (sort === "code") {
      r = [...r].sort((a, b) =>
        String(a.code || "￿").localeCompare(String(b.code || "￿"))
      );
    } else if (sort === "trade" && TRADE.available) {
      /* Lines with no trade figure sort last rather than as zero. A missing
         measurement is not the same as no trade. */
      r = [...r].sort((a, b) => {
        const ta = tradeWeight(a);
        const tb = tradeWeight(b);
        if (!ta && !tb) return 0;
        if (!ta) return 1;
        if (!tb) return -1;
        return tb.usd - ta.usd;
      });
    }
    return r;
  }, [results, rateF, sectorF, sort]);

  /* Every line on the current list, by heading, so a group can say how much of
     its heading the search actually matched. */
  const allByHeading = useMemo(() => indexByHeading(items), [items]);

  /* One row per schedule heading. Grouping happens after ranking and
     filtering, so a group appears where its best-ranked line did. */
  const groups = useMemo(
    () => groupByScheduleText(filtered, allByHeading),
    [filtered, allByHeading]
  );

  useEffect(() => {
    setLimit(PAGE);
    centerRef.current?.scrollTo({ top: 0 });
  }, [q, rateF, sectorF, sort, side]);

  /* Drop the open panel when the result set changes membership. A group's
     "4 of 34 lines match" is a statement about the current query, so leaving
     it on screen after the query moves on makes it describe a search that is
     no longer running. Sorting does not change membership, so it is exempt. */
  useEffect(() => {
    setSelected(null);
  }, [q, rateF, sectorF]);

  /* Switching direction must drop a selection from the other list. */
  useEffect(() => {
    setSelected(null);
    setRateF(null);
    setSectorF(null);
  }, [side]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setSelected(null);
        setRailOpen(false);
        setContextOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const reset = useCallback(() => {
    setRateF(null);
    setSectorF(null);
    setSort("match");
  }, []);

  if (!side) {
    return (
      <div className="app">
        <header className="appbar">
          <span className="brand">
            <span className="chips">
              <i className="chip us" />
              <i className="chip ca" />
            </span>
            <span className="label">Canada–U.S. tariff checker</span>
          </span>
          <span className="spacer" />
          <span className="status">
            <span className="hide-sm">Checked {fmtDate(fresh.checkedAt.toISOString())}</span>
          </span>
          {/* A way out of the walkthrough at any point. Opens Canada's list;
              the direction switch is the first control in the rail. */}
          <button className="gotoexplorer" onClick={() => setSide("ca")}>
            Tariff Explorer <span aria-hidden="true">→</span>
          </button>
        </header>
        {fresh.stale && (
          <div className="center" style={{ overflow: "visible", paddingTop: "0.6rem" }}>
            <div className="stalebar">
              <b>This data is {fresh.ageDays} days old.</b> The lists change often. Check
              the official sources before relying on any rate here.
            </div>
          </div>
        )}
        <Story onPick={setSide} />
      </div>
    );
  }

  const asOf = side === "ca" ? CA.listUpdated : `HTS ${US.source.revision}`;
  const shown = groups.slice(0, limit);

  return (
    <div className="app">
      <header className="appbar">
        <button
          className="railtoggle"
          onClick={() => setRailOpen((v) => !v)}
          aria-expanded={railOpen}
        >
          ☰ Filters
        </button>
        <button
          className="brand"
          style={{ background: "none", border: 0, cursor: "pointer" }}
          onClick={() => setSide(null)}
          title="Back to the start"
        >
          <span className="chips">
            <i className="chip us" />
            <i className="chip ca" />
          </span>
          <span className="label">Canada–U.S. tariff checker</span>
        </button>

        <span className="spacer" />

        <button className="ctxtoggle" onClick={() => setContextOpen(true)}>
          Rules
        </button>

        {/* Coverage stays in the chrome. A null result reads as "not tariffed",
            so how complete the data is has to be visible while it is read. */}
        <span className="status">
          <span className="dot hide-sm">
            Canada <b>{CA.count}</b>/<b>{CA.count}</b>
          </span>
          <span className="dot hide-sm">
            U.S. 338 <b>{US.counts.section338}</b>/<b>{US.counts.section338}</b>
          </span>
          <span>as of {asOf}</span>
        </span>
      </header>

      <div className="cols">
        <Sidebar
          side={side}
          setSide={setSide}
          rates={rates}
          rateF={rateF}
          setRateF={setRateF}
          sectors={sectors}
          sectorF={sectorF}
          setSectorF={setSectorF}
          sort={sort}
          setSort={setSort}
          onReset={reset}
          open={railOpen}
          onClose={() => setRailOpen(false)}
        />

        <main className="center" ref={centerRef}>
          <div className="searchwrap">
            <div className="searchrow">
              <span className="glass" aria-hidden="true">
                ⌕
              </span>
              <input
                className="field"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={
                  side === "ca"
                    ? "Search “toilet paper”, “sweater”, or 6109"
                    : "Search “whisky”, “plywood”, or 4412"
                }
                aria-label={`Search the ${side === "ca" ? "Canadian" : "U.S."} list`}
              />
              {q && (
                <button className="clearbtn" onClick={() => setQ("")} aria-label="Clear search">
                  ×
                </button>
              )}
            </div>
          </div>

          {fresh.stale && (
            <div className="stalebar" style={{ marginBottom: "0.7rem" }}>
              <b>This data is {fresh.ageDays} days old.</b> Check the official sources
              before relying on any rate.
            </div>
          )}

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

          {(rateF !== null || sectorF) && (
            <div className="activefilters">
              {rateF !== null && (
                <button className="tokenbtn" onClick={() => setRateF(null)}>
                  {rateF}% <span>×</span>
                </button>
              )}
              {sectorF && (
                <button className="tokenbtn" onClick={() => setSectorF(null)}>
                  {sectorF} <span>×</span>
                </button>
              )}
            </div>
          )}

          <div className="resultbar">
            <span>
              {groups.length.toLocaleString()}{" "}
              {groups.length === 1 ? "heading" : "headings"} ·{" "}
              {filtered.length.toLocaleString()} of {items.length.toLocaleString()}{" "}
              {filtered.length === 1 ? "line" : "lines"}
              {mode === "code" && q.trim() ? " · code lookup" : ""}
              {mode === "fuzzy" ? " · closest guesses" : ""}
            </span>
            {shown.length > 0 && groups.length > shown.length && (
              <span>Showing {shown.length.toLocaleString()}</span>
            )}
          </div>

          {groups.length === 0 ? (
            q.trim() ? (
              <EmptyState query={q} side={side} onSearch={setQ} />
            ) : (
              <div className="empty">
                <h3>No lines match those filters</h3>
                <p>
                  Clear a filter in the panel on the left, or search for a product by name.
                </p>
              </div>
            )
          ) : (
            <>
              <div className="rows">
                {shown.map((group) => (
                  <Row
                    key={group.key}
                    group={group}
                    selected={selected?.key === group.key}
                    onOpen={setSelected}
                  />
                ))}
              </div>
              {groups.length > limit && (
                <button className="morebtn" onClick={() => setLimit((l) => l + PAGE)}>
                  Show {Math.min(PAGE, groups.length - limit)} more of{" "}
                  {(groups.length - limit).toLocaleString()} remaining headings
                </button>
              )}
            </>
          )}
        </main>

        <aside
          className="detailcol"
          data-open={selected || contextOpen ? "1" : "0"}
          aria-label={selected ? "Detail" : "Rules"}
        >
          {selected ? (
            <DetailPanel group={selected} onClose={() => setSelected(null)} />
          ) : (
            <>
              <div className="panelhead">
                <h2>Before you rely on this</h2>
                <button className="iconbtn detailclose" onClick={() => setContextOpen(false)}>
                  Close
                </button>
              </div>
              <ContextPanel side={side} />
            </>
          )}
        </aside>
      </div>

      <div
        className="scrim"
        data-on={selected || railOpen || contextOpen ? "1" : "0"}
        onClick={() => {
          setSelected(null);
          setRailOpen(false);
          setContextOpen(false);
        }}
      />
    </div>
  );
}

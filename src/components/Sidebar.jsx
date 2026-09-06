import React from "react";
import { CA, US, TRADE, rateColor } from "../lib/data.js";

/**
 * The filter rail. Filters live here rather than above the results so the
 * search box stays at the top of the column — on a narrow screen two rows of
 * filter pills used to push every result below the fold.
 */
export default function Sidebar({
  side,
  setSide,
  rates,
  rateF,
  setRateF,
  sectors,
  sectorF,
  setSectorF,
  sort,
  setSort,
  onReset,
  open,
  onClose,
}) {
  const hasFilters = rateF !== null || sectorF !== null || sort !== "match";

  return (
    <aside className="rail" data-open={open ? "1" : "0"} aria-label="Filters">
      <div className="railgroup">
        <div className="raillabel">Direction</div>
        <div className="dirswitch">
          <button
            data-on={side === "ca" ? "1" : "0"}
            style={{ "--edge": "var(--ca)", "--edgesoft": "var(--ca-soft)" }}
            onClick={() => {
              setSide("ca");
              onClose?.();
            }}
          >
            <span>
              Into Canada
              <small>Canada's counter-tariffs</small>
            </span>
          </button>
          <button
            data-on={side === "us" ? "1" : "0"}
            style={{ "--edge": "var(--us)", "--edgesoft": "var(--us-soft)" }}
            onClick={() => {
              setSide("us");
              onClose?.();
            }}
          >
            <span>
              Into the U.S.
              <small>Section 338, 232 and more</small>
            </span>
          </button>
        </div>
      </div>

      <div className="railgroup">
        <div className="raillabel">Added rate</div>
        <div className="facets">
          <button className="facet" data-on={rateF === null ? "1" : "0"} onClick={() => setRateF(null)}>
            <span className="name">Any rate</span>
          </button>
          {rates.map(({ rate, n }) => (
            <button
              key={rate}
              className="facet"
              data-on={rateF === rate ? "1" : "0"}
              onClick={() => setRateF(rateF === rate ? null : rate)}
            >
              <span className="swatch" style={{ background: rateColor(rate) }} />
              <span className="name">{rate}%</span>
              <span className="n">{n}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="railgroup">
        <div className="raillabel">Sector</div>
        <div className="facets">
          <button className="facet" data-on={sectorF === null ? "1" : "0"} onClick={() => setSectorF(null)}>
            <span className="name">All sectors</span>
          </button>
          {sectors.map(({ sector, n }) => (
            <button
              key={sector}
              className="facet"
              data-on={sectorF === sector ? "1" : "0"}
              onClick={() => setSectorF(sectorF === sector ? null : sector)}
            >
              <span className="name">{sector}</span>
              <span className="n">{n}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="railgroup">
        <div className="raillabel">Sort</div>
        <div className="facets">
          <button className="facet" data-on={sort === "match" ? "1" : "0"} onClick={() => setSort("match")}>
            <span className="name">Best match</span>
          </button>
          <button
            className="facet"
            data-on={sort === "code" ? "1" : "0"}
            onClick={() => setSort("code")}
          >
            <span className="name">Tariff line</span>
          </button>
          {TRADE.available && (
            <button
              className="facet"
              data-on={sort === "trade" ? "1" : "0"}
              onClick={() => setSort("trade")}
            >
              <span className="name">Most traded</span>
            </button>
          )}
        </div>
      </div>

      {hasFilters && (
        <div className="railgroup">
          <button className="railbtn" onClick={onReset}>
            Clear filters
          </button>
        </div>
      )}

      <div className="railgroup">
        <p className="railnote">
          {side === "ca" ? (
            <>
              {CA.count} tariff items, in force {CA.effective}. Source: Finance Canada,
              updated {CA.listUpdated}.
            </>
          ) : (
            <>
              {US.counts.section338} Section 338 lines plus {US.counts.other} scope-level
              measures. Source: U.S. note 51, {US.source.revision}.
            </>
          )}
        </p>
      </div>
    </aside>
  );
}

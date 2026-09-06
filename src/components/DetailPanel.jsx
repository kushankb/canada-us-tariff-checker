import React from "react";
import {
  stackedDuty,
  fmtDate,
  rateColor,
  tradeWeight,
  fmtUSD,
  CA,
  US,
  TRADE,
} from "../lib/data.js";

/** Where the customs jargon is allowed to live, next to the thing it qualifies. */
export default function DetailPanel({ item, onClose }) {
  const stack = item.side === "us" ? stackedDuty(item) : null;
  const trade = tradeWeight(item);
  const colour = rateColor(item.rate);
  const edge = item.side === "ca" ? "var(--ca)" : "var(--us)";

  return (
    <>
      <div className="panelhead">
        <h2>Detail</h2>
        <button className="iconbtn detailclose" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="card accent" style={{ "--edge": edge }}>
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "baseline" }}>
          <span className="bigrate" style={{ color: colour }}>
            {item.rate}%
          </span>
          <span style={{ fontSize: "0.78rem", color: "var(--dim)", lineHeight: 1.35 }}>
            added to what this product already owes
          </span>
        </div>

        <h3 className="detailtitle">{item.desc}</h3>

        {stack && stack.kind !== "free" && (
          <div className="stackbox">
            <div>
              <span className="lbl">Ordinary duty on this line</span>
              <span>{stack.base}</span>
            </div>
            <div>
              <span className="lbl">Section 338 addition</span>
              <span>{item.rate}%</span>
            </div>
            <div>
              <span className="lbl">Total before other fees</span>
              <span>{stack.total}</span>
            </div>
          </div>
        )}

        <dl className="dl">
          {item.code && (
            <>
              <dt>Tariff line</dt>
              <dd>
                {item.code} <span className="sub">(8-digit)</span>
              </dd>
            </>
          )}
          <dt>Sector</dt>
          <dd>{item.sector}</dd>
          <dt>Measure</dt>
          <dd>{item.authority}</dd>
          {item.entryHeading && (
            <>
              <dt>Entered under</dt>
              <dd>{item.entryHeading}</dd>
            </>
          )}
          <dt>In force from</dt>
          <dd>{fmtDate(item.effective)}</dd>
          {stack && stack.kind === "free" && (
            <>
              <dt>Ordinary duty</dt>
              <dd>Free, so {item.rate}% is the whole charge</dd>
            </>
          )}
          {trade && (
            <>
              <dt>{TRADE.year} trade</dt>
              <dd>
                {fmtUSD(trade.usd)}{" "}
                <span className="sub">
                  {trade.exact
                    ? `${trade.direction}, this line`
                    : `${trade.direction}, HS-6 heading ${trade.hs6}`}
                </span>
              </dd>
            </>
          )}
          {item.qualifier && (
            <>
              <dt>Line qualifier</dt>
              <dd>{item.qualifier}</dd>
            </>
          )}
          {item.heading && item.heading !== item.desc && (
            <>
              <dt>Schedule text</dt>
              <dd style={{ fontVariantNumeric: "normal" }}>{item.heading}</dd>
            </>
          )}
        </dl>
      </div>

      {item.aircraftCarveOut && (
        <div className="card accent" style={{ "--edge": "var(--r25)" }}>
          <p>
            <b>There is a civil aircraft carve-out on this line.</b> U.S. note 51(d) lifts
            the duty for civil aircraft articles, engines, parts and components meeting
            General Note 6. The same code is otherwise covered.
          </p>
        </div>
      )}

      {item.scopeLevel && (
        <div className="card accent" style={{ "--edge": "var(--r25)" }}>
          <p>
            <b>This measure has no published code list.</b> Coverage is set by the
            proclamation's own scope, so whether a specific line is caught has to be read
            from that proclamation rather than looked up.
          </p>
        </div>
      )}

      {/* The rule that reverses the answer has to stay on screen while the rate
          is being read, not only in the panel this one replaced. */}
      {item.side === "us" && !item.scopeLevel && (
        <div className="card">
          <p>
            <b>A CUSMA certificate does not exempt this.</b> Coverage turns on whether the
            tariff line is named in U.S. note 51, not on origin status.
          </p>
        </div>
      )}

      {item.side === "ca" && (
        <div className="card">
          <p>
            <b>Origin, not shipping address.</b> This applies to goods qualifying to be
            marked as a good of the U.S. under the CUSMA marking rules. Being under a
            duty-free threshold does not exempt a shipment, though a traveller's personal
            exemption does.
          </p>
        </div>
      )}

      {trade && trade.mirror && (
        <div className="card">
          <p>
            <b>That trade figure is a mirror statistic.</b> It is what the U.S. reports
            exporting to Canada, not what Statistics Canada reports importing. Use it to
            judge which lines carry weight, not as an official Canadian figure.
          </p>
        </div>
      )}

      <div className="card">
        <p>
          Source:{" "}
          {item.side === "ca" ? (
            <a href={CA.source} target="_blank" rel="noopener noreferrer">
              Finance Canada's published list
            </a>
          ) : (
            <a href={US.source.chapter99Pdf} target="_blank" rel="noopener noreferrer">
              U.S. note 51, chapter 99 HTSUS ({US.source.revision})
            </a>
          )}
          . Descriptions are simplified. This is not customs advice.
        </p>
      </div>
    </>
  );
}

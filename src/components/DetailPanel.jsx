import React, { useState, useEffect } from "react";
import {
  shortLabel,
  stackedDuty,
  fmtDate,
  rateColor,
  tradeWeight,
  fmtUSD,
  CA,
  US,
  TRADE,
} from "../lib/data.js";

const FIRST = 12;

/** One tariff line inside a heading. */
function LineCard({ item }) {
  const stack = item.side === "us" ? stackedDuty(item) : null;
  const trade = tradeWeight(item);
  const colour = rateColor(item.rate);

  return (
    <div className="linecard">
      <div className="linehead">
        <span className="linecode">{item.code || item.authority}</span>
        <span className="linerate" style={{ color: colour }}>
          {item.rate}%
        </span>
      </div>

      <p className="linedesc">{shortLabel(item)}</p>

      {stack && stack.kind !== "free" && (
        <div className="stackbox">
          <div>
            <span className="lbl">Ordinary duty (MFN general rate)</span>
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

      <dl className="dl compact">
        {stack && stack.kind === "free" && (
          <>
            <dt>Ordinary duty</dt>
            <dd>Free, so {item.rate}% is the whole charge</dd>
          </>
        )}
        {item.entryHeading && (
          <>
            <dt>Entered under</dt>
            <dd>{item.entryHeading}</dd>
          </>
        )}
        <dt>In force from</dt>
        <dd>{fmtDate(item.effective)}</dd>
        {trade && (
          <>
            <dt>{TRADE.year} trade</dt>
            <dd>
              {fmtUSD(trade.usd)}{" "}
              <span className="sub">
                {trade.exact ? "this line" : `HS-6 heading ${trade.hs6}`}
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
        <dt>Detailed description</dt>
        <dd style={{ fontVariantNumeric: "normal" }}>{item.desc}</dd>
      </dl>

      {item.aircraftCarveOut && (
        <p className="linenote">
          Civil aircraft carve-out: U.S. note 51(d) lifts the duty for aircraft articles
          and parts meeting General Note 6. Otherwise covered.
        </p>
      )}
      {item.scopeLevel && (
        <p className="linenote">
          Scope-level measure. Coverage is set by the proclamation itself, not by a
          published code list.
        </p>
      )}
    </div>
  );
}

/** Everything under one schedule heading. */
export default function DetailPanel({ group, onClose }) {
  const [limit, setLimit] = useState(FIRST);
  useEffect(() => setLimit(FIRST), [group.key]);

  const n = group.items.length;
  const edge = group.side === "ca" ? "var(--ca)" : "var(--us)";
  const colour = rateColor(group.maxRate);
  const shown = group.items.slice(0, limit);
  const anyStack = group.items.some((i) => i.side === "us" && !i.scopeLevel);

  return (
    <>
      <div className="panelhead">
        <h2>{n === 1 ? "Tariff line" : `${n} tariff lines`}</h2>
        <button className="iconbtn detailclose" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="card accent" style={{ "--edge": edge }}>
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "baseline" }}>
          <span className="bigrate" style={{ color: colour }}>
            {group.rateLabel}
          </span>
          <span style={{ fontSize: "0.78rem", color: "var(--dim)", lineHeight: 1.35 }}>
            added to what these products already owe
          </span>
        </div>
        <h3 className="detailtitle">{group.scheduleText}</h3>
        <p className="detailqual">
          {group.sector}
          {n > 1 && ` · ${group.items[0].code} to ${group.items[n - 1].code}`}
        </p>
      </div>

      {shown.map((item) => (
        <LineCard key={item.code || item.id} item={item} />
      ))}

      {n > limit && (
        <button className="morebtn" onClick={() => setLimit(n)}>
          Show the remaining {n - limit} lines under this heading
        </button>
      )}

      {group.side === "us" && anyStack && (
        <div className="card">
          <p>
            <b>A CUSMA certificate does not exempt these.</b> Coverage turns on whether the
            tariff line is named in U.S. note 51, not on origin status.
          </p>
        </div>
      )}

      {group.side === "ca" && (
        <div className="card">
          <p>
            <b>Origin, not shipping address.</b> These apply to goods qualifying to be
            marked as a good of the U.S. under the CUSMA marking rules. Being under a
            duty-free threshold does not exempt a shipment, though a traveller's personal
            exemption does.
          </p>
        </div>
      )}

      <div className="card">
        <p>
          Source:{" "}
          {group.side === "ca" ? (
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
        {anyStack && (
          <p style={{ marginTop: "0.5rem" }}>
            The ordinary duty is the general (MFN) rate published for that line in the
            USITC tariff schedule, read straight from the source above. Rates given per
            kilogram or per litre are specific duties, which is how the schedule itself
            expresses them.
          </p>
        )}
      </div>
    </>
  );
}

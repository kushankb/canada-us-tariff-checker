import React from "react";
import { stackedDuty, fmtDate, rateColor, CA, US } from "../lib/data.js";

/**
 * The detail view is where the customs jargon is allowed to live. The primary
 * result line stays in plain language; everything that would need a glossary
 * is here, next to the thing it qualifies.
 */
export default function Detail({ item, onBack }) {
  const stack = item.side === "us" ? stackedDuty(item) : null;
  const edge = item.side === "ca" ? "var(--ca)" : "var(--us)";

  return (
    <div>
      <button className="back" onClick={onBack}>
        ← Back to results
      </button>

      <div className="detail" style={{ "--edge": edge }}>
        <div style={{ display: "flex", gap: "1rem", alignItems: "baseline" }}>
          <span className="bigrate" style={{ color: rateColor(item.rate) }}>
            {item.rate}%
          </span>
          <span className="sub" style={{ flex: 1 }}>
            added to what this product already owes
          </span>
        </div>

        <h2 style={{ marginTop: "0.8rem" }}>{item.desc}</h2>

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

        <dl>
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

          {item.qualifier && (
            <>
              <dt>Line qualifier</dt>
              <dd>{item.qualifier}</dd>
            </>
          )}

          {item.heading && item.heading !== item.desc && (
            <>
              <dt>Full schedule text</dt>
              <dd style={{ fontVariantNumeric: "normal" }}>{item.heading}</dd>
            </>
          )}
        </dl>

        {item.aircraftCarveOut && (
          <div className="note" style={{ "--edge": "var(--r25)" }}>
            <b>There is a civil aircraft carve-out on this line.</b> U.S. note 51(d)
            lifts the duty for civil aircraft articles, their engines, parts and
            components that meet General Note 6. The same code is otherwise covered.
          </div>
        )}

        {item.scopeLevel && (
          <div className="note" style={{ "--edge": "var(--r25)" }}>
            <b>This measure has no published code list here.</b> Coverage is set by the
            proclamation's own scope, so whether a specific line is caught has to be read
            from that proclamation rather than looked up.
          </div>
        )}

        {item.side === "us" && !item.scopeLevel && (
          <div className="note quiet">
            <b>A CUSMA certificate does not exempt this.</b> Section 338 coverage turns on
            whether the tariff line is named in U.S. note 51, not on origin status.
          </div>
        )}

        {item.side === "ca" && (
          <div className="note quiet">
            <b>Origin, not shipping address.</b> This applies to goods that qualify to be
            marked as a good of the U.S. under the CUSMA marking rules.
          </div>
        )}

        <p className="sub" style={{ marginTop: "1rem" }}>
          Source:{" "}
          {item.side === "ca" ? (
            <a href={CA.source} target="_blank" rel="noopener noreferrer">
              Finance Canada, complete list of U.S. products subject to counter tariffs
            </a>
          ) : (
            <a href={US.source.chapter99Pdf} target="_blank" rel="noopener noreferrer">
              U.S. note 51, chapter 99 of the HTSUS ({US.source.revision})
            </a>
          )}
          . Descriptions are simplified. This is not customs advice.
        </p>
      </div>
    </div>
  );
}

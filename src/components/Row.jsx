import React from "react";
import { stackedDuty, rateColor, tradeWeight, fmtUSD } from "../lib/data.js";

/**
 * A result row. Deliberately compact: at 554 lines a row that runs four lines
 * of schedule text turns the list into a wall. The description clamps to two
 * lines and the full text lives in the detail panel.
 */
export default function Row({ item, selected, onOpen }) {
  const stack = item.side === "us" ? stackedDuty(item) : null;
  const trade = tradeWeight(item);
  const colour = rateColor(item.rate);

  return (
    <button
      className="row"
      data-sel={selected ? "1" : "0"}
      style={{ "--edge": colour, "--edgesoft": "var(--sunken)" }}
      onClick={() => onOpen(item)}
      aria-pressed={selected}
    >
      <span className="ratebadge" style={{ color: colour }}>
        <b>{item.rate}%</b>
        {/* Length as well as hue, so the rate is legible without colour. */}
        <span className="ratebar" aria-hidden="true">
          <i style={{ width: `${Math.min(100, item.rate)}%` }} />
        </span>
      </span>

      <span className="rowbody">
        <span className="rowdesc">{item.desc}</span>
        <span className="rowmeta">
          {item.code && <span className="code">{item.code}</span>}
          <span>{item.sector}</span>
          {item.scopeLevel && <span>{item.authority}</span>}
          {trade && (
            <span title={`${trade.direction}, 2025`}>
              {fmtUSD(trade.usd)}
              {trade.exact ? "" : " at HS-6"}
            </span>
          )}
          {stack && stack.kind === "percent" && (
            <span className="tag info">{stack.total} with duty</span>
          )}
          {stack && stack.kind === "specific" && (
            <span className="tag info">+ {stack.base}</span>
          )}
          {item.scopeLevel && <span className="tag warn">No code list</span>}
          {item.aircraftCarveOut && <span className="tag warn">Aircraft carve-out</span>}
        </span>
      </span>
    </button>
  );
}

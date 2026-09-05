import React from "react";
import { stackedDuty, rateColor, tradeWeight, fmtUSD } from "../lib/data.js";

export default function Row({ item, onOpen }) {
  const stack = item.side === "us" ? stackedDuty(item) : null;
  const trade = tradeWeight(item);

  return (
    <button className="row" onClick={() => onOpen(item)}>
      <span className="rate" style={{ color: rateColor(item.rate) }}>
        {item.rate}%<small>added</small>
      </span>
      <span className="rowbody">
        <p>{item.desc}</p>
        <span className="metaline">
          {item.code ? (
            <>
              <span className="code">{item.code}</span>
              {" · "}
            </>
          ) : null}
          {item.sector}
          {item.scopeLevel ? ` · ${item.authority}` : null}
          {trade && (
            <>
              {" · "}
              <span title={`${trade.direction}, 2025${trade.exact ? "" : ` (HS-6 heading ${trade.hs6})`}`}>
                {fmtUSD(trade.usd)}
                {trade.exact ? "" : " at HS-6"}
              </span>
            </>
          )}
        </span>
        {stack && stack.kind === "percent" && (
          <span className="tag info">{stack.total} with the base duty</span>
        )}
        {stack && stack.kind === "specific" && (
          <span className="tag info">plus base duty of {stack.base}</span>
        )}
        {item.scopeLevel && (
          <span className="tag warn">Scope-level — no published code list</span>
        )}
        {item.aircraftCarveOut && (
          <span className="tag warn">Carve-out if it is a civil aircraft part</span>
        )}
      </span>
    </button>
  );
}

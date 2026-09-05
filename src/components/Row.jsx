import React from "react";
import { stackedDuty, rateColor } from "../lib/data.js";

export default function Row({ item, onOpen }) {
  const stack = item.side === "us" ? stackedDuty(item) : null;

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

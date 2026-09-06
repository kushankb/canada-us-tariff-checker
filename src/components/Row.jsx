import React from "react";
import { rateColor } from "../lib/data.js";

/**
 * One schedule heading, not one tariff line. The heading appears once and the
 * lines under it are counted; the panel lists them individually.
 */
export default function Row({ group, selected, onOpen }) {
  const colour = rateColor(group.maxRate);
  const n = group.items.length;

  return (
    <button
      className="row"
      data-sel={selected ? "1" : "0"}
      style={{ "--edge": colour, "--edgesoft": "var(--sunken)" }}
      onClick={() => onOpen(group)}
      aria-pressed={selected}
    >
      <span className="ratebadge" style={{ color: colour }}>
        <b>{group.rateLabel}</b>
        {/* Length as well as hue, so the rate reads without colour. */}
        <span className="ratebar" aria-hidden="true">
          <i style={{ width: `${Math.min(100, group.maxRate)}%` }} />
        </span>
      </span>

      <span className="rowbody">
        <span className="rowdesc">{group.scheduleText}</span>
        <span className="rowmeta">
          <span className="code">
            {group.isSubset
              ? `${n} of ${group.totalInHeading} lines match`
              : n === 1
                ? group.items[0].code
                : `${n} tariff lines`}
          </span>
          <span>{group.sector}</span>
          {n > 1 && (
            <span className="codespan">
              {group.items[0].code} – {group.items[n - 1].code}
            </span>
          )}
          {group.scopeLevel && <span className="tag warn">No code list</span>}
        </span>
      </span>
    </button>
  );
}

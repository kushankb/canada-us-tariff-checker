import React from "react";
import Triage from "./Triage.jsx";
import { CA, US, fmtDate } from "../lib/data.js";

export default function Home({ go }) {
  const caRates = {};
  CA.measures.forEach((m) => (caRates[m.rate] = (caRates[m.rate] || 0) + 1));

  return (
    <div>
      <Triage onPick={go} />

      <h2 style={{ marginTop: "2rem" }}>Where things stand</h2>
      <div className="stats">
        <div className="stat">
          <b style={{ color: "var(--us)" }}>{US.counts.section338}</b>
          <span>
            U.S. tariff lines at 50% under Section 338, in force since{" "}
            {fmtDate("2026-08-22")}
          </span>
        </div>
        <div className="stat">
          <b style={{ color: "var(--ca)" }}>{CA.count}</b>
          <span>
            Canadian tariff items in reply, in force from {fmtDate(CA.effective)}
          </span>
        </div>
        <div className="stat">
          <b>$27.6B</b>
          <span>
            Value Canada is matching dollar for dollar, against the same figure of
            Canadian goods hit by the U.S.
          </span>
        </div>
        <div className="stat">
          <b>{caRates[50] || 0}</b>
          <span>
            of Canada's lines are at the top 50% rate; {caRates[25] || 0} at 25% and{" "}
            {caRates[15] || 0} at 15%
          </span>
        </div>
      </div>

      <div className="note">
        <b>These duties stack.</b> A tariff here is added on top of the ordinary duty a
        product already owes, plus any other fees. It does not replace it. Decorative
        glassware entering the U.S. under 7013.99.90 carries a 7.2% ordinary duty, so a
        covered shipment owes 57.2%.
      </div>

      <div className="note" style={{ "--edge": "var(--us)" }}>
        <b>Section 338 has carve-outs, and they are not the ones people expect.</b> Steel,
        aluminum and copper, vehicles and their parts, wood products, semiconductors and
        patented pharmaceuticals are all excluded from Section 338 — because Section 232
        already covers them at its own rates. Civil aircraft parts are excluded outright.
      </div>

      <h2 style={{ marginTop: "1.8rem" }}>What changed recently</h2>
      <div className="note quiet" style={{ "--edge": "var(--ca)" }}>
        <b>Canada, 1 September 2025.</b> Counter-tariffs were lifted from a large block of
        goods. The list went from about 1,800 tariff items to roughly 300.
      </div>
      <div className="note quiet" style={{ "--edge": "var(--us)" }}>
        <b>United States, 22 August 2026.</b> Section 338 took effect at 50% on{" "}
        {US.counts.section338} tariff lines, three days later than first proclaimed.
      </div>
      <div className="note quiet" style={{ "--edge": "var(--ca)" }}>
        <b>Canada, {fmtDate(CA.effective)}.</b> The matching counter-tariff list took
        effect, expanding to {CA.count} items and raising steel and aluminum from 25% to
        50%.
      </div>
    </div>
  );
}

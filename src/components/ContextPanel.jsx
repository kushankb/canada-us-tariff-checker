import React from "react";
import { CA, US } from "../lib/data.js";

/**
 * What the right panel shows when no line is selected.
 *
 * These are the rules that reverse the answer. In the previous design they
 * appeared once in an onboarding flow and were never seen again. Keeping them
 * beside the results means they are on screen at the moment someone reads a
 * rate, which is when they matter.
 */
export default function ContextPanel({ side }) {
  const edge = side === "ca" ? "var(--ca)" : "var(--us)";

  return (
    <>
      {side === "ca" ? (
        <>
          <div className="card accent" style={{ "--edge": edge }}>
            <h3>Being under the duty-free threshold does not help</h3>
            <p>
              The surtax applies to shipments below the de minimis thresholds, and to goods
              that would otherwise get relief under the Postal or Courier Imports Remission
              Orders. A small parcel that owes no duty can still owe the counter-tariff.
            </p>
            <p>
              <b>Carrying it yourself is different.</b> Goods qualifying for a traveller's
              personal exemption are not surtaxed.{" "}
              <a
                href="https://www.cbsa-asfc.gc.ca/publications/cn-ad/cn25-10-eng.html"
                target="_blank"
                rel="noopener noreferrer"
              >
                CBSA Customs Notice 25-10
              </a>{" "}
              sets out both rules.
            </p>
          </div>

          <div className="card">
            <h3>Duties stack</h3>
            <p>
              The rate shown is added on top of the ordinary duty the product already owes,
              plus any other fees. It does not replace it.
            </p>
          </div>

          <div className="card">
            <h3>What changed</h3>
            <p>
              <b>1 September 2025.</b> Counter-tariffs were lifted from a large block of
              goods, cutting the list from about 1,800 items to roughly 300.
            </p>
            <p>
              <b>{CA.effective}.</b> The matching list took effect, expanding to {CA.count}{" "}
              items and raising steel and aluminum from 25% to 50%.
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="card accent" style={{ "--edge": edge }}>
            <h3>A CUSMA certificate does not exempt you</h3>
            <p>
              Section 338 applies to covered goods regardless of CUSMA origin status, which
              reverses the usual assumption. What decides it is whether the specific tariff
              line is named in U.S. note 51.
            </p>
          </div>

          <div className="card accent" style={{ "--edge": edge }}>
            <h3>The carve-outs are not the ones people expect</h3>
            <p>
              Steel, aluminum and copper, vehicles and their parts, wood products,
              semiconductors and patented pharmaceuticals are all excluded from Section 338
              — because Section 232 already covers them at its own rates. Excluded from one
              duty is not exempt from all of them.
            </p>
          </div>

          <div className="card">
            <h3>Duties stack</h3>
            <p>
              The 50% is added to the ordinary duty. Decorative glassware under 7013.99.90
              carries a 7.2% duty, so a covered shipment owes 57.2%.
            </p>
          </div>

          <div className="card">
            <h3>Keep clean entry records</h3>
            <p>
              This is the first use of Section 338 in 96 years and a Court of International
              Trade challenge is widely expected. Complete records preserve a refund claim
              if the measure is struck down.
            </p>
          </div>

          <div className="card">
            <h3>Screening level</h3>
            <p>
              Coverage is screened at 8 digits: a listed heading is treated as catching
              every 10-digit suffix under it. Entries file at 10 digits, so confirm your
              exact line. {US.counts.section338} lines are listed.
            </p>
          </div>
        </>
      )}
    </>
  );
}

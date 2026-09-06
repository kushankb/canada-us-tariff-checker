import React from "react";
import { CA, US, fmtDate } from "../lib/data.js";

/**
 * First screen. Its job is to get one fact from the reader — which way the
 * goods are moving — because that decides which list applies, and to correct
 * the assumption that the answer follows the shipping address.
 *
 * The three facts below are ranked and numbered rather than stacked as
 * identical blocks. The old home page presented six notes of equal visual
 * weight and gave no signal about which one would actually change someone's
 * answer.
 */
export default function Welcome({ onPick }) {
  const caRates = {};
  CA.measures.forEach((m) => (caRates[m.rate] = (caRates[m.rate] || 0) + 1));

  return (
    <div className="welcome">
      <h1>Is my product tariffed?</h1>
      <p className="lede">
        A plain-language check on whether the thing you are buying, shipping or receiving
        is caught by the Canada–U.S. tariffs, and at what rate. Start with the direction:
        it decides which list applies.
      </p>

      <div className="pickers">
        <button
          className="picker"
          style={{ "--edge": "var(--ca)" }}
          onClick={() => onPick("ca")}
        >
          <b>Coming into Canada from the U.S.</b>
          <em>
            Canada's counter-tariffs — {CA.count} tariff items at 15%, 25% or 50%, in force
            from {fmtDate(CA.effective)}
          </em>
        </button>
        <button
          className="picker"
          style={{ "--edge": "var(--us)" }}
          onClick={() => onPick("us")}
        >
          <b>Going into the U.S. from Canada</b>
          <em>
            Section 338 at 50% on {US.counts.section338} tariff lines, plus Section 232 and
            forced-labour measures that stack on top
          </em>
        </button>
      </div>

      <div className="keyfacts">
        <div className="fact">
          <span className="num">01</span>
          <p>
            <b>Origin decides it, not the shipping address.</b> Something made in Vietnam
            and posted from Ohio is not a U.S.-origin good, and a Canadian return label
            does not make a good Canadian.
          </p>
        </div>
        <div className="fact">
          <span className="num">02</span>
          <p>
            <b>These duties stack.</b> The rate is added on top of the ordinary duty a
            product already owes. Decorative glassware entering the U.S. under 7013.99.90
            carries a 7.2% duty, so a covered shipment owes 57.2%.
          </p>
        </div>
        <div className="fact">
          <span className="num">03</span>
          <p>
            <b>Cheap does not mean exempt.</b> Canada's surtax applies below the duty-free
            thresholds, and the U.S. ended its $800 de minimis exception for commercial
            shipments on 29 August 2025.
          </p>
        </div>
      </div>

      <div className="statgrid">
        <div className="stat">
          <b style={{ color: "var(--us)" }}>{US.counts.section338}</b>
          <span>U.S. tariff lines at 50% under Section 338, since {fmtDate("2026-08-22")}</span>
        </div>
        <div className="stat">
          <b style={{ color: "var(--ca)" }}>{CA.count}</b>
          <span>Canadian tariff items in reply, from {fmtDate(CA.effective)}</span>
        </div>
        <div className="stat">
          <b>$27.6B</b>
          <span>Value Canada is matching dollar for dollar</span>
        </div>
        <div className="stat">
          <b>{caRates[50] || 0}</b>
          <span>
            of Canada's lines at the top 50% rate; {caRates[25] || 0} at 25%,{" "}
            {caRates[15] || 0} at 15%
          </span>
        </div>
      </div>

      <div className="footnote">
        <p>
          <b>This is not customs advice.</b> Descriptions are simplified and the underlying
          lists change often. Classification and entry decisions should go through a
          licensed customs broker.
        </p>
        <p>
          Canada's tariff items and descriptions are illustrative and should be read with
          the Schedule to Canada's Customs Tariff.{" "}
          <a href={CA.source} target="_blank" rel="noopener noreferrer">
            Finance Canada's list
          </a>{" "}
          is authoritative, updated {CA.listUpdated}. U.S. coverage comes from{" "}
          <a href={US.source.chapter99Pdf} target="_blank" rel="noopener noreferrer">
            U.S. note 51, chapter 99 HTSUS
          </a>{" "}
          ({US.source.revision}), reconciled against the live schedule.
        </p>
      </div>
    </div>
  );
}

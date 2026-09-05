import React, { useState } from "react";

/**
 * Triage exists to correct two assumptions before anyone reads a rate, because
 * both of them reverse the answer:
 *   · people think the tariff follows the shipping address, not the origin
 *   · people think a CUSMA certificate exempts them from Section 338
 */
export default function Triage({ onPick }) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(null);
  const [kind, setKind] = useState(null);

  if (step === 0) {
    return (
      <div>
        <h2 style={{ marginBottom: "0.2rem" }}>Which way is it moving?</h2>
        <p className="sub" style={{ marginBottom: "0.9rem" }}>
          What matters is where the goods were made, not where the parcel was posted from.
        </p>
        <button
          className="dirbtn"
          style={{ "--edge": "var(--ca)" }}
          onClick={() => {
            setDir("ca");
            setStep(1);
          }}
        >
          <b>Coming into Canada from the U.S.</b>
          <em>Canada's counter-tariffs may apply</em>
        </button>
        <button
          className="dirbtn"
          style={{ "--edge": "var(--us)" }}
          onClick={() => {
            setDir("us");
            setStep(1);
          }}
        >
          <b>Going into the U.S. from Canada</b>
          <em>U.S. Section 338, Section 232 and other duties may apply</em>
        </button>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div>
        <button className="back" onClick={() => setStep(0)}>
          ← Change direction
        </button>
        <h2 style={{ marginBottom: "0.2rem" }}>Who is bringing it in?</h2>
        <p className="sub" style={{ marginBottom: "0.9rem" }}>
          Personal and commercial shipments follow different rules.
        </p>
        <button
          className="dirbtn"
          onClick={() => {
            setKind("personal");
            setStep(2);
          }}
        >
          <b>It is for me</b>
          <em>A parcel, an online order, something I am bringing back</em>
        </button>
        <button
          className="dirbtn"
          onClick={() => {
            setKind("commercial");
            setStep(2);
          }}
        >
          <b>It is for a business</b>
          <em>Stock, materials, or anything entered commercially</em>
        </button>
      </div>
    );
  }

  const edge = dir === "ca" ? "var(--ca)" : "var(--us)";
  return (
    <div>
      <button className="back" onClick={() => setStep(1)}>
        ← Change who is importing
      </button>

      {kind === "personal" && dir === "ca" && (
        <div className="note" style={{ "--edge": edge }}>
          <b>Being under the duty-free threshold does not help here.</b> The surtax
          applies to shipments that fall below the de minimis thresholds, and it applies
          even to goods that qualify for relief under the Postal Imports Remission Order
          or the Courier Imports Remission Order. A small parcel that would normally owe
          no duty can still owe the counter-tariff.
          <div style={{ marginTop: ".55rem" }}>
            <b>Carrying it yourself is different.</b> Goods that qualify for a
            traveller's personal exemption are not surtaxed. The exemption depends on how
            long you were away, and it is the exemption that matters, not the value of
            the parcel.
          </div>
          <div style={{ marginTop: ".55rem" }}>
            <a
              href="https://www.cbsa-asfc.gc.ca/publications/cn-ad/cn25-10-eng.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              CBSA Customs Notice 25-10
            </a>{" "}
            sets both rules out.
          </div>
        </div>
      )}

      {kind === "personal" && dir === "us" && (
        <div className="note" style={{ "--edge": edge }}>
          <b>The $800 duty-free allowance is gone for commercial shipments.</b> The U.S.
          suspended the de minimis exception on 29 August 2025, so low value on its own no
          longer keeps a shipment out of duty. Whether Section 338 applies still turns on
          the tariff line, not the price.
          <div style={{ marginTop: ".55rem" }}>
            The courier or customs broker makes the final call on how a personal parcel is
            entered. Treat what follows as “is this product on the list”, not as a bill.
          </div>
        </div>
      )}

      {dir === "ca" && (
        <div className="note" style={{ "--edge": edge }}>
          <b>Origin, not shipping address.</b> Canada's counter-tariffs apply to goods that
          qualify to be marked as a good of the U.S. under the CUSMA marking regulations.
          Something made in Vietnam and shipped from a warehouse in Ohio is not a
          U.S.-origin good.
        </div>
      )}

      {dir === "us" && (
        <div className="note" style={{ "--edge": edge }}>
          <b>A CUSMA certificate will not help here.</b> Section 338 applies to covered
          goods regardless of CUSMA origin status, which reverses the usual assumption.
          What decides it is whether the specific tariff line is named in U.S. note 51.
        </div>
      )}

      {kind === "commercial" && (
        <div className="note" style={{ "--edge": edge }}>
          <b>Keep clean entry records.</b> This is the first use of Section 338 in 96 years
          and a Court of International Trade challenge is widely expected. Importers with
          complete records preserve a refund claim if the measure is struck down.
        </div>
      )}

      <button className="dirbtn" style={{ "--edge": edge }} onClick={() => onPick(dir)}>
        <b>Search the {dir === "ca" ? "Canadian" : "U.S."} list</b>
        <em>By product name or HS code</em>
      </button>
    </div>
  );
}

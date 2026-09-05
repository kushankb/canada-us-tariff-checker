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

      {kind === "personal" && (
        <div className="note" style={{ "--edge": edge }}>
          <b>Personal shipments are not always caught.</b> Low-value and casual goods can
          fall under separate rules, and the courier or customs broker makes the final
          call. Treat what follows as “is this product category on the list”, not as a
          bill.
          {dir === "us" && (
            <>
              {" "}
              The U.S. also ended the $800 duty-free de minimis exception for commercial
              shipments on 29 August 2025.
            </>
          )}
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

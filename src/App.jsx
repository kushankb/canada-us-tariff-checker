import React, { useState, useRef, useEffect } from "react";
import Home from "./components/Home.jsx";
import ListView from "./components/ListView.jsx";
import { CA, US, freshness, fmtDate } from "./lib/data.js";

const TABS = [
  ["home", "Start here"],
  ["us", "U.S. tariffs"],
  ["ca", "Canada's tariffs"],
];

export default function App() {
  const [tab, setTab] = useState("home");
  const top = useRef(null);
  const fresh = freshness();

  useEffect(() => {
    top.current?.scrollIntoView({ block: "start" });
  }, [tab]);

  return (
    <div className="wrap" ref={top}>
      <a className="skip" href="#main">
        Skip to content
      </a>

      <header className="masthead">
        <div className="flagline">
          <i className="chip us" />
          <i className="chip ca" />
          <span>Canada–U.S. tariffs · checked {fmtDate(fresh.checkedAt.toISOString())}</span>
        </div>
        <h1>Is my product tariffed?</h1>
        <p className="sub" style={{ marginTop: "0.4rem" }}>
          A plain-language look at what each country is charging the other, and whether the
          thing you are buying or shipping is on a list.
        </p>

        {/* Coverage belongs here, not the footer. A null result reads as
            "not tariffed", so how complete the data is has to be visible
            at the moment someone reads the answer. */}
        <div className="coverage">
          <span className="full">
            Canada <b>{CA.count}</b> of <b>{CA.count}</b> tariff items
          </span>
          <span className="full">
            U.S. Section 338 <b>{US.counts.section338}</b> of <b>{US.counts.section338}</b>{" "}
            lines
          </span>
          <span>
            plus <b>{US.counts.other}</b> scope-level U.S. measures
          </span>
        </div>
      </header>

      {fresh.stale && (
        <div className="stalebar">
          <b>This data is {fresh.ageDays} days old.</b> The lists change often and the
          scrapers have not run since {fmtDate(fresh.checkedAt.toISOString())}. Check the
          official sources linked below before relying on any rate here.
        </div>
      )}

      <nav className="tabs">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            className="tab"
            data-on={tab === k ? "1" : "0"}
            onClick={() => setTab(k)}
          >
            {label}
          </button>
        ))}
      </nav>

      <main id="main">
        {tab === "home" && <Home go={setTab} />}
        {tab === "us" && <ListView side="us" />}
        {tab === "ca" && <ListView side="ca" />}
      </main>

      <footer className="foot">
        <p>
          <b>This is not customs advice.</b> Product descriptions here are simplified and
          the underlying lists change often. Classification and entry decisions should go
          through a licensed customs broker.
        </p>
        <p>
          <b>Canada.</b> The tariff items listed represent U.S. products subject to counter
          tariffs. The included Harmonized System headings and descriptions are for
          illustrative purposes, and the list should be read in conjunction with the
          Schedule to Canada's Customs Tariff.{" "}
          <a href={CA.source} target="_blank" rel="noopener noreferrer">
            Finance Canada's published list
          </a>{" "}
          is the authoritative source, updated {CA.listUpdated}.
        </p>
        <p>
          <b>United States.</b> Section 338 coverage is taken from U.S. note 51 to
          subchapter III of chapter 99 of the{" "}
          <a href={US.source.chapter99Pdf} target="_blank" rel="noopener noreferrer">
            Harmonized Tariff Schedule ({US.source.revision})
          </a>
          , and every code is reconciled against the live schedule before publication.
          Annex codes are 8-digit; entries file at 10 digits.
        </p>
        <p>
          Comparisons between the two countries' lists are only valid at 6 digits. National
          8- and 10-digit codes diverge, so this app never joins them below that level.
        </p>
      </footer>
    </div>
  );
}

import React from "react";
import { CA, US, fmtDate } from "../lib/data.js";

/**
 * The walkthrough that opens the app.
 *
 * Every figure here is a real tariff line from the shipped data, named so it
 * can be checked: toilet paper into Canada at 25% (4818.10.00), beer into the
 * U.S. at 50% over a free ordinary rate (2203.00.00), and glassware where the
 * two stack to 57.2% (7013.99.90).
 *
 * The honest part, and the reason the arithmetic is laid out rather than
 * asserted: duty is charged on the customs value, not the shelf price. A page
 * that says "your $12 pack becomes $15" is guessing at a retailer's markup and
 * at who absorbs the cost. So the worked examples run on a stated import value
 * and say plainly what they do not know.
 */

/* --- illustrations. Inline SVG: no network fetch, and they inherit the
   palette rather than sitting on it as flat stock imagery. --- */

function ToiletRoll() {
  return (
    <svg viewBox="0 0 120 120" className="storyart" role="img" aria-label="A roll of toilet paper">
      <rect x="0" y="0" width="120" height="120" rx="8" fill="var(--ca-soft)" />
      <path d="M28 44h50v46a10 10 0 0 1-10 10H38a10 10 0 0 1-10-10V44Z" fill="#fff" stroke="var(--ca)" strokeWidth="2.5" />
      <ellipse cx="53" cy="44" rx="25" ry="11" fill="#fff" stroke="var(--ca)" strokeWidth="2.5" />
      <ellipse cx="53" cy="44" rx="9" ry="4" fill="var(--ca-soft)" stroke="var(--ca)" strokeWidth="2" />
      <path d="M78 56c10 0 16 6 16 16v26" fill="none" stroke="var(--ca)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M86 98h16l-8 12-8-12Z" fill="var(--ca)" opacity="0.25" />
    </svg>
  );
}

function BeerBottle() {
  return (
    <svg viewBox="0 0 120 120" className="storyart" role="img" aria-label="A bottle of beer">
      <rect x="0" y="0" width="120" height="120" rx="8" fill="var(--us-soft)" />
      <path d="M52 18h16v14c0 6 10 12 10 22v46a8 8 0 0 1-8 8H50a8 8 0 0 1-8-8V54c0-10 10-16 10-22V18Z" fill="#fff" stroke="var(--us)" strokeWidth="2.5" />
      <rect x="50" y="14" width="20" height="7" rx="2" fill="var(--us)" />
      <rect x="44" y="64" width="32" height="26" rx="3" fill="var(--us)" opacity="0.16" stroke="var(--us)" strokeWidth="1.5" />
      <path d="M50 74h20M50 81h14" stroke="var(--us)" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

function Tumbler() {
  return (
    <svg viewBox="0 0 120 120" className="storyart" role="img" aria-label="A drinking glass">
      <rect x="0" y="0" width="120" height="120" rx="8" fill="#f2efe9" />
      <path d="M40 26h40l-5 66a8 8 0 0 1-8 7H53a8 8 0 0 1-8-7L40 26Z" fill="#fff" stroke="var(--r50)" strokeWidth="2.5" />
      <path d="M43 56h34" stroke="var(--r50)" strokeWidth="2" opacity="0.45" />
      <ellipse cx="60" cy="26" rx="20" ry="6" fill="#fff" stroke="var(--r50)" strokeWidth="2.5" />
    </svg>
  );
}

/* A duty split, drawn to scale: the bar lengths are the numbers. */
function DutyBar({ base = 0, added, baseLabel, addedLabel }) {
  const total = base + added;
  return (
    <div className="dutybar">
      <div className="dutybar-track" role="img" aria-label={`${base}% ordinary duty plus ${added}% added`}>
        {base > 0 && (
          <span className="seg base" style={{ width: `${(base / total) * 100}%` }}>
            {base}%
          </span>
        )}
        <span className="seg added" style={{ width: `${(added / total) * 100}%` }}>
          {added}%
        </span>
      </div>
      <div className="dutybar-key">
        {/* No swatch for a segment the bar does not draw. */}
        <span>
          {base > 0 && <i className="k base" />}
          {baseLabel}
        </span>
        <span>
          <i className="k added" /> {addedLabel}
        </span>
      </div>
    </div>
  );
}

export default function Story({ onPick }) {
  return (
    <div className="story">
      <a className="storyskip" href="#pick">
        Skip to the checker
      </a>

      <section className="scene hero">
        <p className="eyebrow">Canada–U.S. tariffs · updated {fmtDate(CA.effective)}</p>
        <h1>
          A 50% tariff. What does that
          <br />
          actually cost anyone?
        </h1>
        <p className="lede">
          Both countries now tax hundreds of ordinary things the other one makes. Here is
          what that looks like on three real tariff lines, before you go and check your
          own.
        </p>
        <p className="scrollcue" aria-hidden="true">Scroll ↓</p>
      </section>

      <section className="scene">
        <div className="scenegrid">
          <div className="sceneart">
            <ToiletRoll />
          </div>
          <div className="scenetext">
            <p className="eyebrow" style={{ color: "var(--ca)" }}>
              01 · Into Canada
            </p>
            <h2>American toilet paper now carries a 25% surtax</h2>
            <p>
              Tariff line <b>4818.10.00</b> is on Finance Canada's counter-tariff list. It
              is the line for household toilet paper, and it is one of {CA.count} items in
              force from {fmtDate(CA.effective)}.
            </p>
            <DutyBar base={0} added={25} baseLabel="Ordinary duty: free" addedLabel="Counter-tariff added" />
            <div className="worked">
              <div>
                <span className="lbl">Importer brings in</span>
                <span>C$10,000 of U.S. toilet paper</span>
              </div>
              <div>
                <span className="lbl">Surtax owed at 25%</span>
                <span>C$2,500</span>
              </div>
              <div>
                <span className="lbl">Cost to land it</span>
                <span>C$12,500</span>
              </div>
            </div>
            <p className="caveat">
              That is charged on the customs value, not the shelf price. Whether it reaches
              the shelf depends on the retailer's markup and who decides to absorb it.
            </p>
          </div>
        </div>
      </section>

      <section className="scene">
        <div className="scenegrid reverse">
          <div className="sceneart">
            <BeerBottle />
          </div>
          <div className="scenetext">
            <p className="eyebrow" style={{ color: "var(--us)" }}>
              02 · Into the United States
            </p>
            <h2>Canadian beer went from free to 50%</h2>
            <p>
              Tariff line <b>2203.00.00</b>, beer made from malt, is named in U.S. note 51.
              Its ordinary duty is <b>Free</b> — so before August it crossed the border
              paying nothing, and now the whole 50% is the charge.
            </p>
            <DutyBar base={0} added={50} baseLabel="Ordinary duty: free" addedLabel="Section 338 added" />
            <div className="worked">
              <div>
                <span className="lbl">Importer brings in</span>
                <span>US$10,000 of Canadian beer</span>
              </div>
              <div>
                <span className="lbl">Duty owed before 22 Aug 2026</span>
                <span>US$0</span>
              </div>
              <div>
                <span className="lbl">Duty owed now</span>
                <span>US$5,000</span>
              </div>
            </div>
            <p className="caveat">
              A CUSMA certificate does not change this. Section 338 turns on whether the
              tariff line is listed, not on where the goods originate.
            </p>
          </div>
        </div>
      </section>

      <section className="scene">
        <div className="scenegrid">
          <div className="sceneart">
            <Tumbler />
          </div>
          <div className="scenetext">
            <p className="eyebrow">03 · And they stack</p>
            <h2>Where there was already a duty, the 50% goes on top</h2>
            <p>
              Drinking glasses under <b>7013.99.90</b> already carried a 7.2% ordinary
              duty. The Section 338 charge does not replace it.
            </p>
            <DutyBar base={7.2} added={50} baseLabel="Ordinary duty 7.2%" addedLabel="Section 338 adds 50%" />
            <p className="bignum">
              57.2<span>% total, before other fees</span>
            </p>
            <p className="caveat">
              This is the single most common mistake in reading a tariff list. The rate you
              look up is added to what the product already owed.
            </p>
          </div>
        </div>
      </section>

      <section className="scene">
        <div className="scenetext narrow">
          <p className="eyebrow">04 · And plenty is not caught at all</p>
          <h2>Socks, tomatoes and mattresses are on neither list</h2>
          <p>
            Coverage is decided line by line, not by mood. Both lists here are complete as
            published, so when a search comes back empty it is an answer rather than a gap
            — and the checker says which of the two it is.
          </p>
          <div className="notcaught">
            {["socks", "tomatoes", "mattresses", "sunglasses", "vitamins", "coffee"].map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="scene pick" id="pick">
        <div className="scenetext narrow">
          <h2>Now check your own product</h2>
          <p>Which way is it moving? That decides which list applies.</p>
          <div className="pickers">
            <button className="picker" style={{ "--edge": "var(--ca)" }} onClick={() => onPick("ca")}>
              <b>Coming into Canada from the U.S.</b>
              <em>
                {CA.count} tariff items at 15%, 25% or 50%, in force from{" "}
                {fmtDate(CA.effective)}
              </em>
            </button>
            <button className="picker" style={{ "--edge": "var(--us)" }} onClick={() => onPick("us")}>
              <b>Going into the U.S. from Canada</b>
              <em>
                Section 338 at 50% on {US.counts.section338} lines, plus Section 232 and
                forced-labour measures
              </em>
            </button>
          </div>

          <div className="footnote">
            <p>
              <b>This is not customs advice.</b> Descriptions are simplified and the lists
              change often. Classification and entry decisions should go through a licensed
              customs broker.
            </p>
            <p>
              Canadian items and descriptions are illustrative and should be read with the
              Schedule to Canada's Customs Tariff.{" "}
              <a href={CA.source} target="_blank" rel="noopener noreferrer">
                Finance Canada's list
              </a>{" "}
              is authoritative, updated {CA.listUpdated}. U.S. coverage and every ordinary
              duty rate quoted above come from{" "}
              <a href={US.source.chapter99Pdf} target="_blank" rel="noopener noreferrer">
                the USITC tariff schedule
              </a>{" "}
              ({US.source.revision}).
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

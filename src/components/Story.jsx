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

function SteelCoil() {
  return (
    <svg viewBox="0 0 120 120" className="storyart" role="img" aria-label="A coil of rolled steel">
      <rect x="0" y="0" width="120" height="120" rx="8" fill="#eeecea" />
      <ellipse cx="46" cy="60" rx="17" ry="30" fill="#fff" stroke="var(--ink)" strokeWidth="2.5" />
      <path d="M46 30h30a17 30 0 0 1 0 60H46" fill="#fff" stroke="var(--ink)" strokeWidth="2.5" />
      <ellipse cx="76" cy="60" rx="17" ry="30" fill="#f6f4f2" stroke="var(--ink)" strokeWidth="2.5" />
      <ellipse cx="76" cy="60" rx="6" ry="11" fill="#e2ddd5" stroke="var(--ink)" strokeWidth="2" />
      <path d="M22 96h76" stroke="var(--ink)" strokeWidth="2" opacity="0.25" strokeLinecap="round" />
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
            <p className="eyebrow" style={{ color: "var(--us)" }}>
              01 · Into the United States
            </p>
            <h2>The roll is American. What it is made of is not.</h2>
            <p>
              Finished toilet paper, tariff line 4818.10, is <b>not</b> on the U.S. list.
              Most of what Americans buy is milled in America. But the stock it is milled
              from largely is not.
            </p>
            <p style={{ marginTop: "0.6rem" }}>
              <b>4803.00.40</b> — toilet and facial tissue stock, towel and napkin stock —
              is named in U.S. note 51. So is <b>4702.00.00</b>, dissolving-grade chemical
              woodpulp. Both crossed the border free of duty before 22 August 2026. Both
              now carry 50%.
            </p>
            <DutyBar base={0} added={50} baseLabel="Ordinary duty: free" addedLabel="Section 338 added" />
            <div className="worked">
              <div>
                <span className="lbl">Mill buys Canadian tissue stock</span>
                <span>US$1,000,000</span>
              </div>
              <div>
                <span className="lbl">Duty owed before 22 Aug 2026</span>
                <span>US$0</span>
              </div>
              <div>
                <span className="lbl">Duty owed now</span>
                <span>US$500,000</span>
              </div>
            </div>
            <p className="context">
              For scale, the Guardian reports the U.S. imported about US$328m of toilet
              paper from Canada in 2024 on World Bank figures, making Canada by far its
              largest supplier, and notes that Procter &amp; Gamble, which owns Charmin,
              said during an earlier round of tariffs that it would have to raise prices.
              Those figures are reported context, not from the tariff data on this site.
            </p>
            <p className="caveat">
              Duty is charged on the customs value of the stock, not on a packet of
              Charmin. How much reaches a shelf depends on how much of the import bill the
              mills and retailers absorb.
            </p>
          </div>
        </div>
      </section>

      <section className="scene">
        <div className="scenegrid reverse">
          <div className="sceneart">
            <SteelCoil />
          </div>
          <div className="scenetext">
            <p className="eyebrow">02 · Both directions at once</p>
            <h2>Steel and aluminum are taxed at 50% each way</h2>
            <p>
              This is the one sector where both countries landed on the same number.
              Canada's list carries <b>272 steel and aluminum lines at 50%</b>, up from
              25%, and the United States charges 50% on steel, aluminum and their
              derivatives under Section 232.
            </p>
            <div className="twoway">
              <div className="way" style={{ "--edge": "var(--ca)" }}>
                <span className="waylabel">U.S. steel entering Canada</span>
                <span className="wayrate">50%</span>
                <span className="waynote">Counter-tariff, 272 lines from 7206 to 7616</span>
              </div>
              <div className="way" style={{ "--edge": "var(--us)" }}>
                <span className="waylabel">Canadian steel entering the U.S.</span>
                <span className="wayrate">50%</span>
                <span className="waynote">Section 232, scope-level, no published code list</span>
              </div>
            </div>
            <p className="caveat">
              Steel is also the clearest example of a carve-out that is not an exemption.
              U.S. note 51(c) excludes steel, aluminum and copper from Section 338 —
              because Section 232 already taxes them. Off one list does not mean untaxed.
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

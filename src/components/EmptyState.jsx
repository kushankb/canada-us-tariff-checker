import React, { useEffect, useState } from "react";
import { loadHistory, fmtDate, US } from "../lib/data.js";
import { expandQuery } from "../lib/search.js";

/**
 * The empty state carries more weight here than anywhere else in the app.
 *
 * "No results" is read as "not tariffed", and that is a money decision. So a
 * miss has to say which kind of miss it is:
 *
 *   · we understood the word and the product is genuinely not listed
 *   · we understood it, and it was listed until a date that has passed
 *   · the product is off Section 338 because another measure covers it
 *   · we did not recognise the word at all, so try a broader one
 */
export default function EmptyState({ query, side, onSearch }) {
  const [history, setHistory] = useState(null);
  const { matched } = expandQuery(query);
  const recognised = matched.length > 0;

  useEffect(() => {
    let live = true;
    if (side === "ca" && query.trim()) {
      loadHistory().then((h) => live && setHistory(h));
    }
    return () => {
      live = false;
    };
  }, [side, query]);

  /* Was it on a superseded Canadian tranche?

     Needles are tried most specific first, across all tranches, before moving
     to the next. Otherwise "orange juice" reports oranges, because a broader
     term matches an earlier row than the phrase the user actually typed. */
  let formerly = null;
  if (side === "ca" && history) {
    const { terms } = expandQuery(query);
    const needles = [query.toLowerCase().trim(), ...terms]
      .filter((t) => t.length >= 3)
      .sort((a, b) => b.length - a.length);

    outer: for (const needle of needles) {
      for (const tranche of history.tranches) {
        const hit = tranche.measures.find((m) =>
          `${m.desc} ${m.heading}`.toLowerCase().includes(needle)
        );
        if (hit) {
          formerly = { tranche, hit };
          break outer;
        }
      }
    }
  }

  /* Is it off Section 338 because a Section 232 action covers it instead? */
  let excludedBy = null;
  if (side === "us") {
    const q = query.toLowerCase().trim();
    excludedBy =
      (US.exclusionCategories || []).find((c) => {
        const words = c.label.toLowerCase().split(/[\s,]+/).filter((w) => w.length > 3);
        return words.some((w) => q.includes(w.replace(/s$/, "")));
      }) || null;
  }

  return (
    <div className="empty">
      {excludedBy ? (
        <>
          <h3>Not under Section 338 — a different measure covers it</h3>
          <p>
            {excludedBy.label} are carved out of Section 338 by U.S. note 51(c), because
            they are already caught by {excludedBy.authority}. That is an exclusion from
            one duty, not an exemption from all of them.
          </p>
          <p>
            Search{" "}
            <button className="linkbtn" onClick={() => onSearch(excludedBy.label.split(",")[0])}>
              {excludedBy.label.split(",")[0].toLowerCase()}
            </button>{" "}
            to see the measure that does apply.
          </p>
        </>
      ) : formerly ? (
        <>
          <h3>Not on the current list — it was until {fmtDate(formerly.tranche.to)}</h3>
          <p>
            Something matching “{query}” was on a counter-tariff list that has since been
            replaced, for example {formerly.hit.code} at {formerly.hit.rate}% —{" "}
            {formerly.hit.desc.slice(0, 70)}
            {formerly.hit.desc.length > 70 ? "…" : ""}. It is not on the list in force
            now.
          </p>
          <p>
            Canada removed counter-tariffs from a large block of goods on 1 September 2025.
            If you are looking at an older entry or an invoice from before that date, the
            rate then is not the rate now.
          </p>
        </>
      ) : recognised ? (
        <>
          <h3>Not on this list</h3>
          <p>
            We recognise “{query}” and nothing matching it appears on the{" "}
            {side === "ca" ? "Canadian counter-tariff" : "U.S. Section 338"} list. That is
            a real answer, not a gap in the data — this list is complete as published.
          </p>
          <p>
            It can still owe the ordinary duty for its tariff line, and other measures may
            apply. Check the other side of the border on the tab above.
          </p>
        </>
      ) : (
        <>
          <h3>Nothing matched that</h3>
          <p>We could not map “{query}” onto anything in the tariff schedule. Try:</p>
          <ul>
            <li>a broader word — “cheese” rather than a brand, “jacket” rather than “parka”</li>
            <li>what the thing is made of — “steel shelving”, “plastic tableware”</li>
            <li>the first four digits of an HS code, if you have one</li>
          </ul>
          <p>
            A word we do not know is a gap in our vocabulary, not proof the product is
            untariffed. Do not read this as a clear result.
          </p>
        </>
      )}
    </div>
  );
}

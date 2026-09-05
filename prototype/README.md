# Prototype (superseded)

`tariff-checker.jsx` is the original single-file prototype, kept for reference.
It inlines a 63-row sample of the Canadian list and 19 category-level U.S.
entries.

**Do not run it.** Its data is a partial sample, which is exactly the failure
mode the shipped app is built to avoid: a null result reads as "not tariffed"
when it means "not in the sample."

The working app is in `../src`, reading the complete generated data in
`../src/data`.

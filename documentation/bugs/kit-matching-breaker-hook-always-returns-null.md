# Engine: Rielle "Kit" Peddler's AIMatchingBreakerInstalled always returns null

**Source:** code inspection while documenting the Runner AI (no debug log)
**Reproduction:** none yet: found by reading the code at `be61a78`, 2026-09-25; writing a failing test is the first acceptance criterion.

## Summary
Kit (`sets/systemupdate2021.js`, card 31026) makes the first ICE encountered
each turn gain Code Gate. Its `AIMatchingBreakerInstalled(iceCard)` hook is
meant to report an installed Decoder as matching the outermost ICE, but it
compares the ICE's index with `server.length - 1`. A server object has no
`length`, so the comparison is always unequal and the hook always returns
null. Runner-side callers of this hook therefore miss the match. Corp security
planning is not affected in the same way: `ai_corp.js` independently computes
Kit's effective Code Gate subtype with `_effectiveIceSubtypes()` and matches an
installed Decoder against it.

## Evidence
```js
if (server.ice.indexOf(iceCard) !== server.length-1) return null;
```

## Root cause
- [Inferred] It must identify the first ICE that would actually be encountered,
  using the same route-aware rule as `AIModifyIceAI`, rather than reading the
  nonexistent `server.length`.

## Proposed fix
Share or reproduce the route-aware first-encounter check used by
`AIModifyIceAI`. Usually this is the outermost installed ICE, but when an
outer ICE remains unrezzed and an inner ICE is encountered first, the inner
ICE must receive Kit's Code Gate effect.

## Acceptance criteria
- [ ] A failing test shows the hook returns an installed Decoder for the first
  non-Code-Gate ICE that would be encountered when Kit's ability is unused.
- [ ] The test passes after the fix and has moved into `tests/`; it covers the
  ordinary outermost case, an inner first encounter behind an unrezzed outer
  ICE, an ICE that is not first (null), and a used ability (null).
- [ ] `node tests/run-all-tests.js` passes.

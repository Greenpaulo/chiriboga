# Engine: Rielle "Kit" Peddler's AIMatchingBreakerInstalled always returns null

**Source:** code inspection while documenting the Runner AI (no debug log)
**Reproduction:** none yet: found by reading the code at `be61a78`, 2026-09-25; writing a failing test is the first acceptance criterion.

## Summary
Kit (`sets/systemupdate2021.js`, card 31026) makes the first ICE encountered
each turn gain Code Gate. Its `AIMatchingBreakerInstalled(iceCard)` hook is
meant to report an installed Decoder as matching the outermost ICE, but it
compares the ICE's index with `server.length - 1`. A server object has no
`length`, so the comparison is always unequal and the hook always returns
null. Both AIs therefore ignore Kit's ability when judging whether a breaker
matches: the Corp's security evaluation and the Runner's run planning.

## Evidence
```js
if (server.ice.indexOf(iceCard) !== server.length-1) return null;
```

## Root cause
- [Inferred] It should compare with `server.ice.length - 1` (the outermost ICE).

## Proposed fix
Compare with `server.ice.length - 1`, and confirm against the engine that the
last element of `server.ice` is the outermost ICE.

## Acceptance criteria
- [ ] A failing test shows the hook returns an installed Decoder for the outermost non-Code-Gate ICE when Kit's ability is unused.
- [ ] The test passes after the fix and has moved into `tests/`; it also covers a non-outermost ICE (null) and a used ability (null).
- [ ] `node tests/run-all-tests.js` passes.

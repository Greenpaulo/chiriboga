# Engine: Rielle "Kit" Peddler's AIMatchingBreakerInstalled always returns null

## Resolution

Implemented from `f2054ee`.

This is an objective, ungated correction: Kit's printed ability and the
existing route simulation provide the invariant for which ICE gains Code Gate;
there is no strategic choice to tune. A card-local `_AIFirstIceToEncounter`
helper now supplies that same answer to `AIModifyIceAI` and
`AIMatchingBreakerInstalled`, replacing the invalid `server.length` check and
covering the rezzed inner ICE behind an unrezzed outer ICE.

When Corp security passes `effectiveSubTypes`, Kit's identity hook now defers
to the Corp evaluator's ordinary breaker matching. This preserves the ticket's
documented separation between Corp and Runner matching and avoids requiring a
live `runner.AI` during Corp planning.

The unchanged pending assertions moved to
`tests/kit-matching-breaker-hook-always-returns-null.test.js`; they cover both
route shapes, a later ICE, a spent ability, subtype restoration, and the Corp
consumer. The focused test, all 138 Corp security cases, and the full 40-file
suite pass. Hook behavior is documented in [AI card hooks](../../ai.md#42-special--trojan-breakers)
and [Runner AI architecture](../../runner-ai/architecture.md#runcalculator).

**Source:** code inspection while documenting the Runner AI (no debug log)
**Reproduction:** `tests/pending/kit-matching-breaker-hook-always-returns-null.test.js` (fails at `f2054ee`, 2026-10-02) — moved unchanged to `tests/kit-matching-breaker-hook-always-returns-null.test.js`; `node tests/kit-matching-breaker-hook-always-returns-null.test.js` passes

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
- [Verified] `server.length` is undefined, so even the outermost ICE fails the
  hook's position check and returns null — the pending reproduction above.
- [Inferred] It must identify the first ICE that would actually be encountered,
  using the same route-aware rule as `AIModifyIceAI`, rather than reading the
  nonexistent `server.length`.

## Proposed fix
Share or reproduce the route-aware first-encounter check used by
`AIModifyIceAI`. Usually this is the outermost installed ICE, but when an
outer ICE remains unrezzed and an inner ICE is encountered first, the inner
ICE must receive Kit's Code Gate effect.

## Acceptance gate
N/A — deterministic fix (principle 4): Kit's printed ability makes the first
ICE encountered each turn gain Code Gate, so matching must use the same
route-aware first-encounter invariant as `AIModifyIceAI`.

## Acceptance criteria
- [x] A failing test shows the hook returns an installed Decoder for the first
  non-Code-Gate ICE that would be encountered when Kit's ability is unused.
- [x] The test passes after the fix and has moved into `tests/`; it covers the
  ordinary outermost case, an inner first encounter behind an unrezzed outer
  ICE, an ICE that is not first (null), and a used ability (null).
- [x] The shared route-aware hook behaviour is documented in
  `documentation/ai.md` and `documentation/runner-ai/architecture.md`.
- [x] `node tests/run-all-tests.js` passes.

## Post-merge closure

2026-10-08: moved to `done/` after [PR #12](https://github.com/Greenpaulo/chiriboga/pull/12) merged.

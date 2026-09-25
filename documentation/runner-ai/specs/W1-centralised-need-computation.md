# W1 Centralised need computation

**Roadmap item:** W1 · **Depends on:** W0 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/runner-ai/principles.md`, `documentation/runner-ai/specs/hand-keep-design.md`

## Goal
Introduce `_runnerNeeds()` as a pure computation of what the Runner currently
needs, without changing any keep or discard outcome yet.

## Current behaviour
Economy and draw needs are computed ad hoc in the main decision loop
(`prioritiseEconomy`, `_currentOverDraw()`, `_maxOverDraw()`), and lockout
checks using `_getCachedCost(server)` live inside individual cards'
`AIWorthKeeping`. See [architecture: keep and discard decisions](../architecture.md#keep-and-discard-decisions).

## Design
- Generalise the existing `prioritiseEconomy` and overdraw checks into reusable
  `needEconomy` and `needDraw` values.
- Add `lockedOutServers` using `_getCachedCost(server) == Infinity` per server,
  the signal already used inside individual cards' `AIWorthKeeping`.
- Wire no consumer yet: this item only proves the computation is correct and
  side-effect-free.

## Safety and information boundary
Needs use only information the Runner may know. Computing them must not mutate
credits, the Grip, installed cards or the run calculator's cached state.

## Test scenarios
1. `needEconomy` matches the existing `prioritiseEconomy` value for every fixture.
2. `needDraw` matches the existing overdraw check.
3. `lockedOutServers` identifies a server with no affordable, matching breaker
   and excludes one that has one.
4. Computing needs does not mutate credits, the Grip, installed cards or the
   run calculator's cached state.

## Acceptance gate
`_runnerNeeds()` can be computed at any decision point with no observable side
effects, and matches the ad hoc checks it will replace.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] The side's `architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.

# D2 Injectable randomness for the Runner AI

**Roadmap item:** D2 · **Depends on:** none · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/runner-ai/principles.md`
**Verified against code:** 58f3a4d (2026-09-25)

## Resolution

Implemented from `58f3a4d`.

- `RunnerAI` gets `this._random = Math.random` (constructor) and
  `_randomIndex(n)` (floor of `_random() * n`, clamped to `0..n-1`). The
  potential jitter uses `this._random()`, the "no decision made" fallback
  uses `this._randomIndex(optionList.length)` instead of `RandomRange`, and
  the two Runner card AI hooks in `sets/systemupdate2021.js` (the random
  card pair pick and the ICE-choice jitter) use `runner.AI._randomIndex()` /
  `runner.AI._random()`. With the default source, behaviour is unchanged.
- Departures from the spec, as planned: four sites instead of one, and no
  jitter cache, because the jitter already rolls once per server per decision
  (the new test checks this).
- New `tests/runner-ai-randomness.test.js`. It loads the **real engine files
  headlessly** (browser globals stubbed: jQuery, PIXI, document, timers,
  `cardRenderer`), builds a board with the real `CorpTestField`/
  `RunnerTestField`, and runs real Runner command decisions through
  `EnumeratePhase()` and `_computeChoice()` with global `Math.random` made to
  throw. It checks: the same seed gives the same decision and run target;
  seeds alone decide the HQ/R&D tie on that board (both targets occur across
  six seeds); one roll per server per decision; `_randomIndex` bounds; and a
  ratchet that fails on `Math.random`, `RandomRange` or `Shuffle` in the
  `RunnerAI` class or in any Runner card's `AI*` hook. Without the fix the test
  fails at the jitter (`ai_runner.js`, `_internalChoiceDetermination`).
- **For F4:** the real engine loads and runs AI decisions headlessly with
  only browser globals stubbed. The test's setup (about 40 lines) is a
  starting point for `scripts/ai-batch.js`; the main loop (`Main()` in
  `init.js`, `window.setTimeout` in `command.js`) was not exercised.
- Docs: `documentation/runner-ai/architecture.md`
  ([run selection](../../runner-ai/architecture.md#run-selection-and-the-run-calculator))
  describes the seam and drops the "cannot be seeded" known limit. No hook
  contract changed, so `documentation/ai.md` is unchanged.
- `node tests/run-all-tests.js`: 35 test files passed.

## Implementation plan

Proposed at `58f3a4d`, 2026-09-25. **Approved 2026-09-25.**

- **Validation:** the goal holds, but the spec undercounted the sites and
  over-specified the jitter. Policy randomness is in four places, not one:
  the potential jitter and the "no decision made" `RandomRange` fallback in
  `_internalChoiceDetermination()`, plus two card AI hooks in
  `sets/systemupdate2021.js` (a random card pick and an ICE-choice jitter).
  The jitter already rolls once per server per decision, because
  `serverList` is rebuilt once per `_internalChoiceDetermination()` call, so
  no new cache is needed (spec updated before raising).
- **Approach:** the constructor sets `this._random = Math.random`, and a new
  `_randomIndex(n)` returns `Math.floor(this._random() * n)`, clamped to
  `0..n-1`. The jitter uses `this._random()`, the fallback uses
  `this._randomIndex(optionList.length)`, and the two hooks use
  `runner.AI._random()` / `runner.AI._randomIndex()`. With the default,
  behaviour is unchanged: the same distribution from the same global source.
  Rejected: patching `Math.random` globally, because it would also seed engine
  shuffles, which is F4's job.
- **Tests:** a new `tests/runner-ai-randomness.test.js`:
  1. A ratchet: no `Math.random` or `RandomRange` in the `RunnerAI` class, or
     in Runner AI hooks in playable sets.
  2. A `RunnerAI` is built in a `vm` context with the engine loaded, as
     `tests/corp-decision-fixtures.test.js` does. On a small board with a seeded
     `_random`, one command decision is run twice and must give identical
     potentials and the same choice; global `Math.random` is made to throw.
  3. The fallback returns `_randomIndex` of a seeded source.
  4. One roll per server per decision, counted by a counting `_random`.
- **Risk:** no decision changes with the default. The main risk is test 2:
  no test has run a Runner decision before, and the run calculator may need
  engine functions the Corp fixtures don't stub. If it needs many new stubs,
  I fall back to calling the potential step directly and record that in the
  Resolution. That also tells F4 how much stubbing a headless game needs.
- **Docs:** `documentation/runner-ai/architecture.md` (run selection:
  randomness through `_random`), no `ai.md` change (no hook contract changes),
  roadmap D2 to `in-progress` (done), then to code-review.

## Goal

Give the Runner AI an injectable, seedable randomness source, as the Corp AI
has with `CorpAI._random`, so its decisions are reproducible in tests and
seeded simulations.

## Current behaviour

Runner AI policy draws from global randomness in four places:

- Run selection adds jitter to each server's potential with `Math.random()`
  in `_internalChoiceDetermination()`. `serverList` and the potentials are
  rebuilt once per call, and `_computeChoice()` calls it once per decision, so
  each server already gets one roll per decision.
- The "no decision made" fallback at the end of
  `_internalChoiceDetermination()` returns `RandomRange(0, n - 1)`, and
  `RandomRange()` (`utility.js`) calls `Math.random`.
- Two card AI hooks in `sets/systemupdate2021.js` also use it: one picks cards
  at random with `RandomRange` when no pair shares a title or cost, and one
  adds `0.1 * Math.random()` jitter when choosing between pieces of ICE.

No test constructs a `RunnerAI` or runs one of its decisions.
See [architecture: run selection and the run calculator](../../runner-ai/architecture.md#run-selection-and-the-run-calculator).

## Design

- Add a `_random` property to the Runner AI, defaulting to `Math.random`.
- Route all Runner AI policy randomness through it, including the two card
  AI hooks (through `runner.AI`), with a helper for random indices so no
  policy code calls `RandomRange`.
- The server-potential jitter already has a one-decision lifetime (see
  Current behaviour); keep it that way and cover it with a test rather than
  adding a cache.

## Safety and information boundary

Engine and gameplay randomness are unchanged.

## Test scenarios

1. With a seeded `_random`, identical boards produce identical run choices.
2. Global `Math.random` is not called by Runner AI policy after `_random` is
   injected.
3. Repeated potential evaluation within one decision uses one jitter roll per
   server.

## Acceptance gate

Runner AI policy has no direct calls to global randomness, and seeded runs are
reproducible.

## Acceptance criteria

- [x] Every test scenario above is covered by a deterministic test.
- [x] New or changed card-facing hooks are documented in `documentation/ai.md`. (None: no hook contract changed.)
- [x] The side's `architecture.md` describes the new behaviour.
- [x] `node tests/run-all-tests.js` passes.

## Code review — 2026-09-25

**Verdict:** Changes required
**Reviewed:** `58f3a4d...97b0dd3`

### Findings

1. **Blocking** — `sets/systemupdate2021.js`, Punitive Counterstrike (31078) `runner.AI.preferred.IncreaseStrengthChoice`: calls `RandomRange(0, cwkCount + expectedDmg - runner.grip.length + 5)` directly instead of `runner.AI._randomIndex(...)`. This is Runner AI policy (invoked via `ai_runner.js:1335`), so it violates the ticket's acceptance gate ("no direct calls to global randomness") and the "same seed, same decision" test scenario. Evidence: `grep -n "RandomRange" sets/systemupdate2021.js` at line 6338; `ai_runner.js:1335` confirms it's on the Runner AI decision path. Required change: route through `runner.AI._randomIndex()`, and widen the new test's ratchet to catch dynamically-assigned `runner.AI.preferred.*` closures on non-Runner-owned cards, not just statically-named `AI*` keys on Runner-owned cards.
2. **Note** — `documentation/runner-ai/architecture.md`: the removed "known limit" ("cannot be seeded") is not yet accurate given finding 1; restore or soften it once the missed site is fixed.
3. **Note** — `sets/systemgateway.js:4661` (Ballista `AIWouldTrigger`) and `sets/elevation.js:8235` (Touch-ups) still call `Math.random()`/`RandomRange` directly in Corp AI hooks, bypassing `CorpAI._random`. Out of scope for D2, but worth a backlog ticket for Corp AI seeding parity.

### Checks performed

- `node scripts/ticket.js check`: WARN (no reproduction path noted) / FAIL (2 pre-existing, unrelated image-asset failures — confirmed present at base commit `58f3a4d` too)
- `node tests/runner-ai-randomness.test.js`: 5/5 checks pass
- Full-repo grep of `Math.random`/`RandomRange` across `sets/*.js`, cross-checked each hit's owning function and card `player` field
- Traced `IncreaseStrengthChoice` call site in `ai_runner.js` to confirm it's on the Runner AI decision path

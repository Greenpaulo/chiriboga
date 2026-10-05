# F9 AI work budget and fair timing

**Roadmap item:** F9 · **Depends on:** F4 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/ai-batch-harness.md`, [F6](../../backlog/done/F6-headless-ai-performance.md)
**Verified against code:** 5b8952f (2026-10-02)

## Goal
Stop AI slowdowns from accumulating unnoticed across tickets. Wall-clock
latency cannot do this: the two halves of a gate may be timed hours apart on
a differently loaded machine, and on 2026-10-02 two sets of identical games
differed by about 3% on every latency metric. This item adds a deterministic
measure of how much work each AI decision does, guards it in every gate and
tracks it across baselines, and adds a fair wall-clock comparison for the
items that need real timing.

## Current behaviour
F4 records `decisionLatencyMs` per side (mean, p95, max) from telemetry around
`CorpAI._choiceInner()` and the Runner's `_computeChoice()`. `ai-planning.md`
forbids latency as a gate guard because `gate` may reuse a cached baseline.
Nothing else measures speed, so a change that doubles the AI's work passes
every gate. F6 measured its gains by counting engine calls (`AllCards()`,
`InstalledCards()`, `CheckCallback()`) under profiling, by hand.

## Design
- **Work counters (`aiWork`).** In the headless harness only, wrap a small set
  of engine primitives that dominate AI cost, starting with F6's
  `AllCards()`, `InstalledCards()` and `CheckCallback()` plus run-calculator
  path evaluations, and count calls made while an AI decision is being
  computed. Telemetry attributes each decision's counts to its side. Metrics:
  `aiWork.corp.perDecision`, `aiWork.corp.p95`, the same for `runner`, and
  `aiWork.corp.perGame`. Counting changes no decision, no random draw and no
  `logHash`. Confirm the chosen primitives with a profile before fixing the
  list; a primitive whose count does not track wall time is dropped.
- **Standard guard.** Every F4 gate guards `aiWork.corp.perDecision` (and the
  Runner equivalent for Runner items) at a 5% increase, unless the item states
  a reason for a larger one. Because the counts are deterministic, any
  increase is real; the tolerance sets how much extra work a change may buy.
- **Creep tracking.** Each committed baseline records the work metrics.
  `node scripts/ai-batch.js --compare <older> <newer>` already compares two
  baselines; a short section in `ai-batch-harness.md` explains reading the
  work rows as creep since the older baseline. A rise of more than 20% over
  the oldest committed baseline of the same pool prompts a speed item.
- **Fair timing (`gate --fresh`).** Plays both halves in one run, alternating
  baseline and candidate game by game on the same worker processes, never
  reusing a cache. Load then falls on both halves equally, so a latency
  guard becomes meaningful. Used by performance items, and by any item whose
  work guard fails and that argues its real cost is acceptable.

## Safety and information boundary
Counters observe calls only; they must not change return values, call order
or the random streams. They exist only in the headless harness, never in the
browser game.

## Test scenarios
1. Counting on and off gives identical `logHash` and AI-stream draw counts
   for the same seeds.
2. The same seed produces the same work counts on two runs.
3. A test option that adds a known number of extra primitive calls per Corp
   decision raises `aiWork.corp.perDecision` by that amount, and the work
   guard fails it.
4. `gate --fresh` plays both halves, alternates them, reuses no cached report,
   and its latency comparison of an option against itself has an interval
   containing zero.

## Acceptance gate
N/A — deterministic fix (principle 4): measurement only; with counters on,
every decision, random draw and `logHash` is identical to counters off.

## Things to consider
- Which primitives to count is a judgement; F6's profiles are the starting
  evidence. Too few miss new expensive paths; too many slow the harness.
- Adding the work guard to the standard guards changes the gate template and
  every not-yet-run gate; `reground-spec` adds it on pickup.
- A real speed-up lowers the counts; the guard direction is lower-is-better.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] `aiWork` metrics appear in reports and comparisons with a lower-is-better direction.
- [ ] The committed baseline is regenerated with work metrics; its games' `logHash` values are unchanged.
- [ ] `ai-planning.md` "Writing a gate" adds the work guard to the standard guards and describes `--fresh`.
- [ ] `ai-batch-harness.md` explains the work metrics, creep tracking and `--fresh`.
- [ ] The side's `architecture.md` describes the counters.
- [ ] `node tests/run-all-tests.js` passes.

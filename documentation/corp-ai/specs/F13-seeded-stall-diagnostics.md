# F13 Seeded stall diagnostics and failed-batch reporting

**Roadmap item:** F13 · **Depends on:** F4 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`, `documentation/ai-batch-harness.md`, [F12 evidence](../measurements/F12-2306f82-control-calibration.json)
**Verified against code:** 2306f82 (2026-10-13)

## Goal

Diagnose and repair the deterministic BTL/Kit seed-257 stall found during F12
control calibration, and make reports containing no successful games printable.
Keep this work separate from passive measurement and consumer gate tuning.

## Current behaviour

- [Verified] On the F12 working tree (engine/AI policy unchanged from 2306f82),
  BTL/Kit seed 257 stops at 17 turns, Corp 2–6 Runner, with
  `stalled: no main-loop step for 10 s after: Null command`. Observer off/on
  probes have identical `logHash` 5ca72f317fb9 and `decisionHash`
  a2abc578f89b8de85fcfb978daf7de81899affd8. The full second calibration cohort
  contains the same failure; first-cohort seeds 1–200 are all successful.
- [Verified] The public replay ends during a Corp turn after two advancement
  placements; the preceding Runner turn included Creative Commission and an
  Overclock run accessing Clearinghouse. Root cause is not established; do
  not assume the card mentioned last caused the stall.
- [Verified] A failed-only batch writes its JSON report, then `printSummary()`
  throws `Cannot read properties of undefined (reading 'toFixed')` because
  its pooled aggregate has no successful-game metrics.
- Probe commands and records are retained in the linked F12 evidence. Raw
  reports/replay are under `.ai-batch-cache/f12-2306f82-validated/`.

## Design

Replay with `node scripts/ai-batch.js replay --pairs btl-kit --seeds 257` and
locate the final command/phase/callback mismatch. Compare earlier resolved
stall tickets before choosing a fix; identical error text is not proof of an
identical cause. Create a focused pending reproduction for the identified
invariant, then repair general command legality/callback progression. Handle
empty successful aggregates explicitly in summary printing while preserving
failed reports and nonzero exit status. Do not drop the failed seed or replace
its missing values with success metrics. Re-ground before implementation.

## Safety and information boundary

Do not change ranking heuristics to avoid this seed. No hidden-card reads,
policy tuning, collector coverage changes or deadline inflation. A strategic
preference uncovered during diagnosis must be split into a separately gated
ticket. No root-cause claim or repair is adopted by this diagnostic spec.

## Test scenarios

1. A focused legal-command/callback reproduction fails before repair and
   passes with its assertions unchanged afterward.
2. BTL/Kit seed 257 completes without a null command or stalled callback.
3. All-failed reports print failure summaries without accessing missing metrics;
   partial failures preserve successful metrics, failure evidence and exit status.
4. The original failed observation-off/on traces remain recorded; repair checks
   cover related prompts/cards identified during diagnosis rather than one title.

## Acceptance gate

N/A — deterministic fix (principle 4): executable legal commands and callback
progression, and faithful printing of missing/failed data. Reclassify once the
cause is known if the proposed repair changes a strategic preference; such a
change requires its own frozen gate rather than a seed-specific expectation.

## Acceptance criteria

- [ ] Root cause is independently verified and the focused pending reproduction
      passes unchanged after repair and moves into the green suite.
- [ ] Seed 257 completes; related command/callback cases have regression coverage.
- [ ] All-failed and partial-failed batches print usable summaries and retain
      truthful missing metrics, saved reports and nonzero failure status.
- [ ] Relevant architecture/harness documentation describes delivered behavior.
- [ ] `node tests/run-all-tests.js` passes.

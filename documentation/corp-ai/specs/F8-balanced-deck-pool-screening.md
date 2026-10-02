# F8 Balanced deck-pool screening

**Roadmap item:** F8 · **Depends on:** F4 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`, `documentation/ai-batch-harness.md`
**Verified against code:** f795a63 (2026-10-02)

## Goal
Choose the F4 deck pool from measured results instead of by hand. The owner's
request is that the harness be used to find deck pairs that do not skew wins
towards either the Corp or the Runner. A very lopsided pair adds games to every
gate while barely letting its win rate move, and it can hide a change's effect.
This item defines a screening procedure, a selection rule and a re-screening
policy, then applies them once to produce a new pool version.

## Current behaviour
F4's pool, `tests/fixtures/ai-batch/deck-pool.json` (`core-v1`), is seven pairs
chosen by hand: four duels, the Gateway tutorial pair, and two Core Battle Box
pairs with Zwicky and LEO Glacier. The reactive items R1.1, R1.2 and R2 are
judged on those two Corp decks. `node scripts/ai-batch.js --pool <file>`
already screens any candidate pool and reports each pair's Corp win rate with
a bootstrap 95% interval. Candidate precons are listed in the F4 ticket's
"Deck pool" section. Only cards in the pool's trusted sets (`sets` in the
pool file) are eligible.

## Design
- **Screening run.** Write a candidate pool file of every eligible pair (all
  cards in the trusted sets and defined). Run it at 200 or more seeds per pair
  and keep the report.
- **Selection rule (to be decided here, numbers are first guesses).** Keep a
  pair whose Corp win-rate interval lies inside [0.35, 0.65]. Drop pairs with
  failed games. Still include the decks that later gated items name (Zwicky
  and LEO Glacier for R1.x and R2) even if lopsided, and say so in the pool
  note. Cover each faction where possible.
- **Interpretation.** AI-vs-AI win rate mixes deck balance with the two AIs'
  relative strength. The selection therefore targets "informative for gates
  with the current AIs", not "balanced for humans". Record the AI commit the
  screen was run on.
- **Re-screening policy.** Every pool change resets all baselines, so
  re-screen only at named milestones (for example after a batch of gated
  options is switched on), not after every change. Write the policy into
  `ai-batch-harness.md`.
- **Output.** A new pool version (`core-v2`) with a note recording the screen's
  command, commit and per-pair intervals, plus a new committed baseline.

## Safety and information boundary
Screening changes no AI code and no decision. It only selects inputs for
later gates.

## Test scenarios
1. The new pool passes F4's pool test (trusted sets, defined cards, unique ids,
   the required decks present).
2. Every pair in the new pool has a recorded screening interval that satisfies
   the selection rule, or is listed as a required exception.

## Acceptance gate
N/A — deterministic fix (principle 4): the pool is selected by a stated rule
applied to a recorded screening report. No AI decision changes.

## Things to consider
- A pair can be balanced only because both AIs play it badly. Look at game
  length and points as well as win rate.
- The Runner and Corp AIs improve at different rates, so the same pair will
  drift. That is the reason for re-screening only at milestones.
- More pairs means more games per gate; at about 2 s per game, ten pairs at 200
  seeds is still under half an hour per gate.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] The screening report's command, commit and per-pair intervals are recorded in the pool note and the Resolution.
- [ ] The selection rule and re-screening policy are written into `documentation/ai-batch-harness.md`.
- [ ] A new baseline for the new pool is committed under `tests/fixtures/ai-batch/baselines/`.
- [ ] `node tests/run-all-tests.js` passes.

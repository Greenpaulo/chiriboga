# Engine: Detente's HQ access steals through a private path that skips steal costs, prevention and steal tracking

**Outcome:** open
**Source log:** none — found by code inspection during Downfall batch 11 (2026-10-23)
**Reproduction:** none — not yet written; writing it is the first acceptance criterion

## Summary
Detente (`cardSet[35018]`, Elevation) lets either player trigger "the Runner
may access 1 card in HQ at random". Its `resolveDetenteAccess` builds its own
steal/trash/continue choice and, on steal, moves the agenda straight to the
Runner's score area instead of using the engine's steal flow. Any additional
steal cost is therefore never paid — SDS Drone Deployment (26056, trash 1
program), credit/click steal costs — and the Runner AI is forced to steal even
when a cost should give it the option to decline. Cards that respond to a steal
through `intended.steal`, such as Divested Trust (26055), cannot respond, and
steal prevention (`responsePreventableSteal`) is skipped. Downfall makes these
costs and responses playable, so this path now produces illegal steals.

## Evidence
`sets/elevation.js`, `cardSet[35018].resolveDetenteAccess` at `42aa3f2`:
- It calls `CheckSteal()` to offer "Steal", but never reads `StealCost()`.
- "Continue" is omitted for an agenda that can be stolen, so a costed steal
  cannot be declined; the Runner AI always keeps only "steal".
- The steal branch does `MoveCard(action.card, runner.scoreArea)` and then
  `TriggeredResponsePhase(playerTurn, "responseOnStolen", ...)`.

The engine path (`phases.runAccessingCard.Resolve.steal` in `phase.js` →
`Steal()` in `mechanics.js`) instead:
- pays `StealCost` credits and clicks, then `PayStealCostPrograms`;
- sets `intended.steal` and opens `responsePreventableSteal`;
- calls `ResolveAccess()`, records `agendaStolenLocations` and the
  `agendaStolen` public posture event, and clears `intended.steal` after
  `responseOnStolen`.

## Reproduction
To write (pending test under `tests/pending/`): Runner has Detente with two hosted
cards and no installed program; HQ holds only SDS Drone Deployment. Using
Detente's ability, the expectations are:
- with no program installed, "Steal" is not offered;
- with one program installed, stealing trashes it;
- a second scenario with Divested Trust scored and a stolen agenda: the Corp is
  offered the forfeit.

## Root cause
- [Inferred] `resolveDetenteAccess` duplicates a subset of the access/steal
  flow instead of calling the shared one, so every steal rule added since
  (steal costs, `intended.steal`, posture events) is missing from it.
- [Inferred] Trash also bypasses parts of the shared flow (`TrashAccessedCard`),
  but costs are paid there; check it while fixing.

## Proposed fix
Route Detente's single random HQ access through the shared access machinery:
set `accessingCard` and resolve steal with the same steal-cost payment and
`Steal()` call as `phases.runAccessingCard.Resolve.steal`. Ideally extract
that steal step into one helper (for example `StealAccessedCard()`) that both
callers use, so future steal rules cannot drift again. Offer "Continue"
whenever the steal has a cost, matching the main access phase's `n`
enumeration. Detente is used outside a run, so check that `Steal()` and
`ResolveAccess()` tolerate `attackedServer` being null (the stolen-location
string defaults to "remote"; it should be HQ here).

Rejected: adding `StealCost` payment inline in Detente — it would fix SDS but
still miss `intended.steal`, prevention and posture tracking.

## Acceptance gate
N/A — deterministic fix (principle 4): the Comprehensive Rules for additional
steal costs and steal responses.

## Acceptance criteria
- [ ] A pending reproduction covering SDS's program cost and Divested Trust's
      response through Detente is written, fails, then passes and moves into
      the green suite, expectation unchanged.
- [ ] Detente steals pay credit, click and program steal costs; a costed steal
      can be declined by human and AI.
- [ ] `responsePreventableSteal` and `intended.steal` consumers fire for a
      Detente steal.
- [ ] Existing Detente tests still pass.
- [ ] `node tests/run-all-tests.js` passes.

## Out of scope / related
- Runner AI valuation of whether to pay a steal cost (Downfall batch 11
  optimisation queue).
- Other card-specific access paths may have the same duplication; search
  for `MoveCard(.*runner.scoreArea` outside `Steal()` when fixing.

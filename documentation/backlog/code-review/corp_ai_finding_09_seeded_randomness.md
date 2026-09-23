# Corp AI finding 9: Randomness bypasses the injectable `_random`

**Source:** `documentation/backlog/corp_ai_review_findings.md`, item 9.
**File:** `ai_corp.js` — `Shuffle(assetDestinations)` (~3383) and the purge `RandomRange` (~5250); `this._random = Math.random` is set at ~5562. Line numbers drift; search by function name.
**Belongs in:** Bug ticket for the in-place mutation, under `documentation/bugs/`. Shared infrastructure → Foundations doc F1: injectable, seedable randomness (`documentation/corp-ai/roadmaps/corp_ai_foundations_roadmap.md`).
**Suggested order:** Step 1 of 5 (F1 rides with the harness, finding 12) for the seeding half; Step 2 of 5 for the in-place mutation bug.
**Depends on:** Nothing. Enables findings 3, 11 and 12 (reproducible seeded runs).
**Status:** Implemented on 23 September 2026; ready for code review.

## Validation and resolution

The asset-destination finding was confirmed. `_rankedInstallOptions()` passed its strongest-first `emptyProtectedRemotes` array directly to the engine's in-place `Shuffle`, which both changed the caller-owned ranking and used global `Math.random`. Repeated install ranking could therefore consume new random tie-breaks during one `Choice`.

The purge half was stale by the time this ticket was implemented. Finding 3 had already replaced the random `RandomRange` purge heuristic with deterministic `_ordinaryPurgeOutcome()` modeling. No random purge call remains, so this ticket does not alter that policy.

The implemented fix is deliberately local to Corp policy rather than changing the engine-wide `Shuffle` contract:

- `_shuffleCopy()` performs Fisher-Yates over a copy and consumes only `CorpAI._random`;
- `_assetDestinationOrder()` caches an order for each distinct destination list during one `Choice`;
- `_rankedInstallOptions()` reuses its standard and create-new-remote destination orders across all assets in one ranking pass;
- `Choice()` creates and exception-safely clears the decision-scoped random state;
- the new shared foundations roadmap defines `_random` as the only Corp-policy RNG seam while leaving gameplay randomness under engine ownership.

The engine-wide `utility.js` `Shuffle` remains unchanged because its documented in-place behavior is used by gameplay code outside the Corp AI.

Regression coverage in `tests/corp-server-security.test.js` verifies equal seeded streams produce equal orders, inputs are unchanged, injected randomness is used even when global `Math.random` throws, and repeated destination evaluation within one `Choice` consumes only one shuffle. The full `node tests/run-all-tests.js` run passes, including `corp-decision-fixtures.test.js` and `decision-snapshots.test.js` (21 test files).

---

## Problem

- Both `Shuffle(assetDestinations)` and the purge `RandomRange` use global `Math.random`, so seeded runs are not reproducible.
- `Shuffle` mutates in place. `assetDestinations` can be the same array as `emptyProtectedRemotes`, which is documented as strongest-first. Only its length is used afterwards, so this is latent.
- `_rankedInstallOptions()` runs several times per click, and each run reshuffles, so the same decision can see different tie-breaks.

## Proposed fix

- Use `this._random` (the injectable RNG) instead of global `Math.random` in both places.
- Shuffle a copy rather than mutating the input array.
- Roll the asset-destination tie-break once per decision, not once per `_rankedInstallOptions()` call.

## Tests / acceptance criteria

- Two runs with the same seed produce the same decisions and the same asset-destination order.
- `emptyProtectedRemotes` (and any caller-owned array) is unchanged after `Shuffle`.
- Stubbing `Math.random` no longer changes AI decisions; stubbing `this._random` does.

## Foundations doc F1

Document `this._random` as the single injectable RNG seam, so future randomness (and the harness in finding 12) goes through it. Item 9 is listed as F1 in the "Suggested foundations doc" section of the findings file.

# Corp AI finding 9: Randomness bypasses the injectable `_random`

**Source:** `documentation/backlog/corp_ai_review_findings.md`, item 9.
**File:** `ai_corp.js` — `Shuffle(assetDestinations)` (~3383) and the purge `RandomRange` (~5250); `this._random = Math.random` is set at ~5562. Line numbers drift; search by function name.
**Belongs in:** Bug ticket for the in-place mutation, under `documentation/bugs/`. Shared infrastructure → Foundations doc F1: injectable, seedable randomness (`documentation/corp-ai/roadmaps/corp_ai_foundations_roadmap.md`).
**Suggested order:** Step 1 of 5 (F1 rides with the harness, finding 12) for the seeding half; Step 2 of 5 for the in-place mutation bug.
**Depends on:** Nothing. Enables findings 3, 11 and 12 (reproducible seeded runs).

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

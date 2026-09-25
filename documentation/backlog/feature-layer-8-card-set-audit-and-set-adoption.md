# L8.7 Layer 8 card hook audit

**Roadmap item:** L8.7 · **Depends on:** none · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** `documentation/corp-ai/principles.md`

## Goal
Make sure every relevant access-punishment trap and tag-punishment card in the scoped sets declares the Layer 8 AI hooks, so baiting and tag-and-bag deterrence work from hooks alone and never from card titles.

## Current behaviour
Facedown access-punishing cards expose `AIPunishesAccess(server)`, which `_calculateBaitFrequency()` and `_shouldBaitServer()` consume; `_tagPunishmentDeterrence()` consumes `AITagPunishment` for a bounded protection-score benefit when the Runner is tagged. Urtica Cipher (`systemgateway.js`) and Snare! (`systemupdate2021.js`) declare `AIPunishesAccess`; no relevant access-punishing card in `elevation.js` was updated, and `vantagepoint.js` has not been audited. See [architecture: baits, bluffs and deterrence](../corp-ai/architecture.md#baits-bluffs-and-deterrence).

## Design
- **Access punishment (`AIPunishesAccess`):** verify facedown ambush cards (for example Urtica Cipher, Snare!, Project Junebug) declare `AIPunishesAccess(server)` with accurate severity values.
- **Tag punishment (`AITagPunishment`):** verify operations and assets that punish tags declare `AITagPunishment`.
- **Documentation:** make sure signatures and return semantics for `AIPunishesAccess` and `AITagPunishment` are fully documented in `documentation/ai.md`.

## Safety and information boundary
- `AIPunishesAccess` is a planning weight for bait frequency, not expected damage; do not repurpose it as a damage estimate.
- Hooks must be safe to evaluate outside a run and must not inspect hidden Runner cards.

## Test scenarios
1. Each card found by the audit to punish access returns a non-zero `AIPunishesAccess` severity when it can fire, and zero when disabled or unaffordable.
2. Each card found by the audit to punish tags is recognised by `_tagPunishmentDeterrence()` through `AITagPunishment` when the Runner is tagged and the card is affordable.

## Acceptance gate
Every card in the scoped sets with an access-punishment or tag-punishment mechanic exposes its hook, and all existing Layer 8 regressions pass unchanged.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
- [ ] No card titles are hardcoded in `ai_corp.js` for baiting or tag deterrence.
- [ ] `documentation/ai.md` reflects the current `AIPunishesAccess` and `AITagPunishment` schemas.

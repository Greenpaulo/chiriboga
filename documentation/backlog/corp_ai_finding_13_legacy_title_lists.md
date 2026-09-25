# P1 Retire legacy card-title special cases

**Roadmap item:** P1 · **Depends on:** F3, I2 · **Sets:** the sets containing the listed cards
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`

## Goal
Replace the card-title comparisons and `_copyOfCardExistsIn("...")` calls that remain in `ai_corp.js` with declarative card hooks, so a new-set card with the relevant hook needs no `ai_corp.js` edit (review finding 13). This ticket is the single checklist for the migration; tick rows off here as they are migrated or deleted.

## Current behaviour
About 25 title comparisons and 14 `_copyOfCardExistsIn("...")` calls remain in `ai_corp.js`, covering economy and draw cards, rez timing, kill combos and fast-advance; new-set cards do nothing there unless someone edits `ai_corp.js`. The earlier ticket `hardcoded-card-titles-still-in-aI-corp-logic.md` (original kept in `documentation/corp-ai/legacy/backlog-tickets/`) is merged here: its examples (the `Phase_PostAction` rez list and the Neurospike/Punitive Counterstrike damage lookup) are already rows in the inventory below. See [architecture: foundations](../corp-ai/architecture.md#foundations).

## Design
Migrate each row to the suggested hook, or delete it where the owning code is removed. Search by function name; line numbers are approximate.

| Done | Function | Titles | Suggested replacement |
|---|---|---|---|
| [ ] | `_economyCards` (~2909) | Celebrity Gift, Subliminal Messaging, Government Subsidy, Hedge Fund, Hansei Review, Marilyn Campaign, Regolith Mining License, Nico Campaign, PAD Campaign, Predictive Planogram | New `AIEconomyCard`, already mentioned in a code comment and in `documentation/backlog/deckbuilder-economy-draw-classification-backlog.md` |
| [ ] | `_bestMainPhaseEconomyOption` (~2945, ~3092) | Oaktown Renovation; Spin Doctor, Sprint, Daily Business Show, Predictive Planogram (draw list) | New draw-card hook alongside `AIEmergencyDraw` |
| [ ] | `_sufficientEconomy` (~3211) | 13-title reserve table | `AIReserveCredits` (review finding 8) |
| [ ] | `_iceWorthRezzing` (~3713) | Snare! | `AIReserveCredits` (review finding 8) |
| [ ] | `_potentialDamageOnBreach` (~857) | Jinteki: Personal Evolution, Urtica Cipher, House of Knives, Snare!, Hokusai Grid | New `AIAccessDamage(server)`, separate from `AIPunishesAccess`, which is documented as a planning weight and not expected damage |
| [ ] | `Phase_Movement` / `Phase_EOT` (~3991-4047) | Spin Doctor; EOT rez list: Marilyn Campaign, Nico Campaign, PAD Campaign, Clearinghouse, Daily Business Show, Corporate Town | New `AIRezTiming` ("eot", "postAction", "ifDuplicate"), beside `AIWouldRezBeforeScore` |
| [ ] | `Phase_PostAction` (~4078) | SanSan City Grid, Regolith Mining License, Ronin, Reversed Accounts | `AIRezTiming` |
| [ ] | `_potentialOperationDamageDirections` / `ThisTurn` (~4284-4410) | Neurospike, Punitive Counterstrike, Biotic Labor, Archived Memories | Extend `AIDamageOperation` |
| [ ] | `_potentialAdvancementDirections` (~4528-4648) | Weyland: Built to Last, Oaktown Renovation, Seamless Launch, Psychographics, Trick of Light, Biotic Labor | Extend `AIFastAdvance` |
| [ ] | `_useWhenTaggedCard` (~5050) | Retribution, Predictive Planogram | Existing `AITagPunishment` for Retribution; a hook for Planogram |
| [ ] | `Phase_Main` (~5198-5399) | Punitive Counterstrike, Neurospike, Public Trail, Archived Memories; Clot (review finding 3); Orbital Superiority, Haas-Bioroid: Precision Design, Offworld Office, Hostile Takeover, Biotic Labor | `AIWouldPlay` / `AIFastAdvance`, and review finding 3 for Clot |
| [ ] | `_advancementLimit` (~638) | SanSan City Grid | Check whether the engine's `AdvancementRequirement(card)` already includes the modifier. If so, delete the case instead of migrating it. |
| [ ] | `_cardProtectionValue` (~1380) | Ice Wall | Declarative value hook |
| [ ] | `_emptyProtectedRemotes` (~2732) | Trick of Light | Hook on the operation |
| [ ] | `_iceIsDisabled` (~16) | Femme Fatale | Runner-card hook |
| [ ] | `_iceInstallScore` (~134) | Palisade | Delete with Install Phase 2. The function is unused. |
| [ ] | `_iceWorthRezzing` (~3865) | Inside Job | Runner-event hook |
| [ ] | `_iceWorthRezzing` (~3891-3899) | Cell Portal, Chum | Inside a commented-out block, so delete or migrate |
| [ ] | `_iceInstallOptions` (~3501) and `_bestNonAgendaTutorOption` (~815) | Snare! | `AIPunishesAccess` / `AIReserveCredits` |

## Safety and information boundary
- A replacement hook must not widen what the Corp can see: hooks read public state and Corp-known information only.
- `AIPunishesAccess` is a planning weight, not expected damage; access damage needs its own hook (`AIAccessDamage`).

## Test scenarios
1. Each migrated row keeps the Corp's decision unchanged for the cards it previously named, now driven by the hook.
2. A new-set card declaring the relevant hook is picked up with no `ai_corp.js` edit.

## Acceptance gate
Every inventory row is either migrated to a hook or marked deleted, and all existing decision fixtures and snapshots pass unchanged.

## Things to consider
- Rows owned by an install phase are migrated inside that phase; the tail of this task is "delete rows, don't migrate them" where a phase already removes the code (for example `_iceInstallScore` with Install Phase 2).
- Some rows depend on hooks introduced by other work: review findings 3 (Clot) and 8 (`AIReserveCredits`), and F3. Migrate those rows once the hooks exist.
- `documentation/backlog/deckbuilder-economy-draw-classification-backlog.md` covers overlapping title/ID hardcoding in deckbuilder role classification. Keep it in sync when `AIEconomyCard` lands.
- This is a big, cross-cutting migration; the original suggestion was to do it after Install Phase 2 and the evaluator fixes.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] The Resolution lists the cards updated in each set in scope and confirms none were missed.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
- [ ] Every row in the inventory is ticked as migrated or deleted.
- [ ] No new title comparisons are added to `ai_corp.js`.
- [ ] A test or lint note flags new `_copyOfCardExistsIn("...")` usage where a hook exists.

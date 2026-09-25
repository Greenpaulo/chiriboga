# Corp AI finding 13: Card-title lists still in `Phase_Main` and the economy helpers

**Source:** `documentation/backlog/corp_ai_review_findings.md`, item 13.
**File:** `ai_corp.js` (roughly 25 title comparisons and 14 `_copyOfCardExistsIn("...")` calls). Line numbers drift; search by function name.
**Belongs in:** Install roadmap, new `## Appendix A: Legacy Title Special Cases`, appended at the end of `documentation/corp-ai/roadmaps/corp_ai_install_decision_roadmap.md`. Tick rows off as each phase migrates them.
**Suggested order:** Step 5 of 5 — big, cross-cutting migration; do it after Install Phase 2 and the evaluator fixes.
**Depends on:** Findings 3, 8 and 11 (some rows are replaced by the hooks those findings introduce). The tail of this task is "delete rows, don't migrate them" where a phase already removes the code.

---

## Problem

Both roadmaps say "prefer hooks over titles", but about 25 title comparisons and 14 `_copyOfCardExistsIn("...")` calls remain. The lists cover economy and draw cards, rez timing, kill combos, and fast-advance. New-set cards do nothing there unless someone edits `ai_corp.js`.

## Task

- Append `## Appendix A: Legacy Title Special Cases` to the install roadmap with the inventory below.
- Migrate each row to the suggested hook in the phase that owns it, or delete it where the owning phase removes the code.
- Tick rows off as each phase migrates them; the appendix is the single checklist so nothing is lost between phases.

## Inventory (line numbers approximate)

| Function | Titles | Suggested replacement |
|---|---|---|
| `_economyCards` (~2909) | Celebrity Gift, Subliminal Messaging, Government Subsidy, Hedge Fund, Hansei Review, Marilyn Campaign, Regolith Mining License, Nico Campaign, PAD Campaign, Predictive Planogram | New `AIEconomyCard`, already mentioned in a code comment and in `documentation/backlog/deckbuilder-economy-draw-classification-backlog.md` |
| `_bestMainPhaseEconomyOption` (~2945, ~3092) | Oaktown Renovation; Spin Doctor, Sprint, Daily Business Show, Predictive Planogram (draw list) | New draw-card hook alongside `AIEmergencyDraw` |
| `_sufficientEconomy` (~3211) | 13-title reserve table | `AIReserveCredits` (finding 8) |
| `_iceWorthRezzing` (~3713) | Snare! | `AIReserveCredits` (finding 8) |
| `_potentialDamageOnBreach` (~857) | Jinteki: Personal Evolution, Urtica Cipher, House of Knives, Snare!, Hokusai Grid | New `AIAccessDamage(server)`, separate from `AIPunishesAccess`, which is documented as a planning weight and not expected damage |
| `Phase_Movement` / `Phase_EOT` (~3991-4047) | Spin Doctor; EOT rez list: Marilyn Campaign, Nico Campaign, PAD Campaign, Clearinghouse, Daily Business Show, Corporate Town | New `AIRezTiming` ("eot", "postAction", "ifDuplicate"), beside `AIWouldRezBeforeScore` |
| `Phase_PostAction` (~4078) | SanSan City Grid, Regolith Mining License, Ronin, Reversed Accounts | `AIRezTiming` |
| `_potentialOperationDamageDirections` / `ThisTurn` (~4284-4410) | Neurospike, Punitive Counterstrike, Biotic Labor, Archived Memories | Extend `AIDamageOperation` |
| `_potentialAdvancementDirections` (~4528-4648) | Weyland: Built to Last, Oaktown Renovation, Seamless Launch, Psychographics, Trick of Light, Biotic Labor | Extend `AIFastAdvance` |
| `_useWhenTaggedCard` (~5050) | Retribution, Predictive Planogram | Existing `AITagPunishment` for Retribution; a hook for Planogram |
| `Phase_Main` (~5198-5399) | Punitive Counterstrike, Neurospike, Public Trail, Archived Memories; Clot (finding 3); Orbital Superiority, Haas-Bioroid: Precision Design, Offworld Office, Hostile Takeover, Biotic Labor | `AIWouldPlay` / `AIFastAdvance`, and finding 3 for Clot |
| `_advancementLimit` (~638) | SanSan City Grid | Check whether the engine's `AdvancementRequirement(card)` already includes the modifier. If so, delete the case instead of migrating it. |
| `_cardProtectionValue` (~1380) | Ice Wall | Declarative value hook |
| `_emptyProtectedRemotes` (~2732) | Trick of Light | Hook on the operation |
| `_iceIsDisabled` (~16) | Femme Fatale | Runner-card hook |
| `_iceInstallScore` (~134) | Palisade | Delete with Install Phase 2. The function is unused. |
| `_iceWorthRezzing` (~3865) | Inside Job | Runner-event hook |
| `_iceWorthRezzing` (~3891-3899) | Cell Portal, Chum | Inside a commented-out block, so delete or migrate |
| `_iceInstallOptions` (~3501) and `_bestNonAgendaTutorOption` (~815) | Snare! | `AIPunishesAccess` / `AIReserveCredits` |

## Related backlog

`documentation/backlog/hardcoded-card-titles-still-in-aI-corp-logic.md` and `documentation/backlog/deckbuilder-economy-draw-classification-backlog.md` cover overlapping title/ID hardcoding (deckbuilder role classification). Keep them in sync when `AIEconomyCard` lands.

## Acceptance criteria

- Appendix A exists in the install roadmap and every row is either migrated to a hook or marked deleted.
- No new title comparisons are added to `ai_corp.js`; a new-set card with the relevant hook needs no `ai_corp.js` edit.
- A test or lint note flags new `_copyOfCardExistsIn("...")` usage where a hook exists.

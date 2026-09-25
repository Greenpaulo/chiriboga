# P1 Retire legacy card-title special cases

**Roadmap item:** P1 · **Depends on:** none · **Sets:** systemgateway, systemupdate2021 (every title in the inventory is defined in one of these)
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`
**Verified against code:** 376f32c (2026-09-25)

## Goal
Replace the card-title literals left in `ai_corp.js` (title comparisons,
title lists and `_copyOfCardExistsIn("…")` / `_copiesOfCardIn("…")` lookups)
with declarative card hooks, so that a new-set card with the right hook needs
no `ai_corp.js` edit (review finding 13). This ticket is the single checklist
for the migration. Rows owned by an install item are migrated inside that
item, and P1 migrates the rest.

## Current behaviour
`tests/corp-ai-card-titles.test.js` measures the debt and ratchets it. It
extracts every string literal in `ai_corp.js`, ignoring comments, that equals
a card title. Titles come from `carddata/carddata.json` (the metadata
`scripts/card-status.js` uses) plus the `title:` fields in `sets/*.js`. Each
use is keyed as `<method>: <title>` and compared with the `LEGACY_TITLES`
allowlist:
- a key not on the allowlist fails the test;
- a listed key that no longer occurs is named in the one-line summary, so the
  entry can be deleted and the row ticked here.

At `376f32c` there are **64 allowlisted method/title pairs**: 43 distinct
titles in 19 methods, 72 literal occurrences (run
`VERBOSE=1 node tests/corp-ai-card-titles.test.js` for the lines).

Corrections to the inventory this ticket previously carried, which was copied
from an older revision:
- The `_sufficientEconomy` 13-title reserve table is gone (review finding 8
  replaced it with `AIReserveCredits`). There is no Snare! check in
  `_iceWorthRezzing` and no Clot check anywhere.
- Snare! is checked in `_bestRecurToHQOption` and `_rankedInstallOptions`,
  and in `_potentialDamageOnBreach`.
- `_iceWorthRezzing` has no Snare! check; it still names Inside Job.
- `Phase_Main` also names Tomorrow's Headline (the Biotic Labor
  fast-advance combo check).
- Economy hooks already exist, so a new `AIEconomyCard` hook is not needed:
  - `AIEconomyCard` (boolean; Regolith Mining License in systemgateway,
    Anthill Excavation Contract in elevation) is read only by
    `_openingHandEconomyCard()` for the mulligan;
  - `AIEconomyPlay` (number) already feeds `_economyCards()`, after its
    title list, for Corp operations in HQ. It is declared by Caveat Emptor
    and realloc() in vantagepoint; the Runner event Sell Out uses it on the
    Runner side.

See [architecture: foundations](../corp-ai/architecture.md#foundations).

## Design
Each row is migrated to the listed hook, or deleted where its code goes. The
**Owner** column says where the work happens:
- **I1:** a special-case install band. I1's unified candidate model keeps it
  as an explicitly legacy-marked band, and it is removed when a hook-driven
  band replaces it.
- **I2:** an ICE-selection title.
- **I5:** an economy or asset-value title.
- **P1:** everything else. These rows need nothing from F3 or any I item.

When a row is done, delete its entries from `LEGACY_TITLES` and tick it here.

| Done | Method | Titles | Owner | Replacement |
|---|---|---|---|---|
| [ ] | `_rankedInstallOptions` | Snare! | I1 | Legacy-marked "specific case" band in I1; later an ambush-install hook (I5) |
| [ ] | `_emptyProtectedRemotes` | Trick of Light | I1 | Legacy-marked band in I1 (keep an advanced obsolete bluff's remote occupied); later a hook on the operation |
| [ ] | `_iceInstallScore` | Palisade | I2 | Deleted with the function (F2 row 9 deletes it as dead code; I2 replaces ICE selection) |
| [ ] | `_economyCards` | Celebrity Gift, Subliminal Messaging, Government Subsidy, Hedge Fund, Hansei Review, Predictive Planogram | I5 | Existing `AIEconomyPlay` (operations). Keep each card's condition, such as Subliminal Messaging's once per turn and Hansei Review's non-agenda requirement, in its own `AIWouldPlay` |
| [ ] | `_economyCards` | Marilyn Campaign, Regolith Mining License, Nico Campaign, PAD Campaign | I5 | Asset economy value in I5 (not `AIEconomyPlay`, which is for operations) |
| [ ] | `_bestMainPhaseEconomyOption` | Oaktown Renovation | I5 | Advance-for-credits hook on the agenda |
| [ ] | `_bestMainPhaseEconomyOption` | Spin Doctor, Sprint, Daily Business Show, Predictive Planogram | I5 | Draw-for-economy hook alongside `AIEmergencyDraw` |
| [ ] | `_iceIsDisabled` | Femme Fatale | P1 | Runner-card hook: this program disables the chosen ICE |
| [ ] | `_advancementLimit` | SanSan City Grid | P1 | First check whether the engine's `AdvancementRequirement()` already applies SanSan. If so, delete the case |
| [ ] | `_bestRecurToHQOption` | Snare! | P1 | `AIPunishesAccess` on the recursion target |
| [ ] | `_potentialDamageOnBreach` | Jinteki: Personal Evolution, Urtica Cipher, House of Knives, Snare!, Hokusai Grid | P1 | New `AIAccessDamage(server)`, separate from `AIPunishesAccess`, which is a planning weight rather than expected damage |
| [ ] | `_cardProtectionValue` | Ice Wall | P1 | Declarative protection-value hook (advancement-scaled strength) |
| [ ] | `_iceWorthRezzing` | Inside Job | P1 | Runner-event hook (bypasses the first ICE) |
| [ ] | `Phase_Movement` | Spin Doctor | P1 | New `AIRezTiming` (for example `"approach"`, `"eot"`, `"postAction"`, `"ifDuplicate"`), beside `AIWouldRezBeforeScore` |
| [ ] | `Phase_EOT` | Marilyn Campaign, Nico Campaign, PAD Campaign, Clearinghouse, Daily Business Show, Corporate Town; Spin Doctor (rez if duplicate) | P1 | `AIRezTiming` |
| [ ] | `Phase_PostAction` | SanSan City Grid, Regolith Mining License, Ronin, Reversed Accounts | P1 | `AIRezTiming` |
| [ ] | `_potentialOperationDamageDirections`, `_potentialOperationDamageThisTurn` | Neurospike, Punitive Counterstrike, Biotic Labor, Archived Memories | P1 | Extend `AIDamageOperation` |
| [ ] | `_potentialAdvancementDirections` | Weyland Consortium: Built to Last, Oaktown Renovation, Seamless Launch, Psychographics, Trick of Light, Biotic Labor | P1 | Extend `AIFastAdvance` |
| [ ] | `_useWhenTaggedCard` | Retribution, Predictive Planogram | P1 | Existing `AITagPunishment` for Retribution; a when-tagged play hook for Planogram |
| [ ] | `Phase_Main` | Punitive Counterstrike, Neurospike, Public Trail, Archived Memories (play-now list); Orbital Superiority, Haas-Bioroid: Precision Design, Offworld Office, Hostile Takeover, Tomorrow's Headline, Biotic Labor (fast-advance combo) | P1 | `AIWouldPlay` / `AIDamageOperation` for the play-now list; `AIFastAdvance` plus a score-combo hook for the fast-advance block |
| [ ] | `_iceWorthRezzing` (commented-out block) | Cell Portal, Chum | P1 | Delete the dead comment. The test ignores comments, so it is not counted |

Rows owned by I1, I2 and I5 are ticked when those items land. P1 is complete
when its own rows are done. The remaining I-owned entries stay in the
allowlist, and the ratchet keeps them visible.

## Safety and information boundary
- A replacement hook must not widen what the Corp can see. Hooks read public
  state and Corp-known information only.
- `AIPunishesAccess` is a planning weight, not expected damage. Access damage
  needs its own hook (`AIAccessDamage`).

## Test scenarios
1. Each migrated row leaves the Corp's decision unchanged for the cards it
   previously named, now driven by the hook.
2. A new-set card that declares the relevant hook is picked up with no
   `ai_corp.js` edit.
3. `tests/corp-ai-card-titles.test.js` fails when a new title literal is
   added to `ai_corp.js`, and its summary names allowlisted pairs that are no
   longer present.

## Acceptance gate
Behaviour-identical migration. Decision snapshots are identical to the
recorded baseline except for listed, justified deltas, and all green corp
decision fixtures pass unchanged.

## Things to consider
- F3 is not a dependency: P1 adds hooks and removes titles, and the cache
  neither provides nor needs a hook.
- `documentation/backlog/deckbuilder-economy-draw-classification-backlog.md`
  covers overlapping title and id hardcoding in deckbuilder role
  classification. Keep it in step when the economy rows move to
  `AIEconomyPlay`.
- `ai_runner.js` has its own title special cases. They are Runner principle
  debt, and this test does not scan them.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] Decision snapshots are identical to the recorded baseline except for listed, justified deltas.
- [ ] Every P1-owned row is ticked as migrated or deleted, and its entries are removed from `LEGACY_TITLES` in `tests/corp-ai-card-titles.test.js`.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] The Resolution lists the cards updated in each set in scope and confirms none were missed.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.

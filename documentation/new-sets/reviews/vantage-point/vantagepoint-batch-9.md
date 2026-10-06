# Vantage Point batch 9 independent review

- Date: 2026-10-06.
- Reviewer: Codex, independent batch reviewer in the coordinated full-set audit.
- Exact IDs: 36041, 36042, 36043, 36044, 36045.
- Verdict: **Changes required**.
- Reviewed commit: `bd733d65f3bb9aa104083edb335f7a137e94d3c3` (saved review WIP; production source unchanged from `45833a14c83fef2f9ce71506d344460181445021`).
- Worktree: `/private/tmp/chiriboga-vantagepoint-set-review`. Initial status contained an untracked images symlink; review probes/documents subsequently changed. No production or existing-test edits were made by this reviewer.
- Source/test/probe identity: [SHA-256 manifest](probes/vantagepoint-batches-5-9.sha256).
- Reproduction: `node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-batches-5-9.js`, 39 current-behavior scenarios pass on Node 20.19.0. These assertions preserve defects as observed; they are not repair tests.
- Shared full regression, integration/deck checks and headless smoke: use the coordinator's isolated-worktree results in [the set review](vantagepoint-set-review.md). The earlier main-worktree green run is not substituted for that revalidation.

The probe loads actual card definitions, both AI classes and RunCalculator. It reuses the public-board adapters from `corp-server-security.test.js`, with actual `CheckInstall`, `CheckPlay`, `CheckActionClicks`, `CheckSteal`, `FullCheckPlay`, play/steal click costs and install-option builders. Remote servers have no `cards` field. Move/draw/damage and deferred UI decisions are isolated adapters; they do not constitute browser or complete-engine playthroughs. Actual selectors/planners are not stubbed. Existing integration assertions were read and run as mechanic evidence, not accepted as proof of strategy.

## Per-card evidence

| Card | Strategic role and actual consumers | Contrasting evidence | Verdict |
|---|---|---|---|
| 36041 Lionsmane | Damage tax with pay/jack alternatives; actual ICE pathfinder and Runner subroutine selector | Complete real routes exist with adequate grip and disappear with insufficient damage allowance. Real `SelectChoice` follows planned survivable damage instead of jacking out. Integration checks pay affordance, damage and jack-out rules. | Pass within tested architecture |
| 36042 Vicsek | Scale punishment with tags, then tag and self-trash; real ICE pathfinder and live subroutine resolver | Tagged/untagged fixed-board routes contrasted. Two consecutive Vicsek ICE reveal model predicts no damage from an initially untagged Runner, while real resolutions produce one damage and three total tags. | Changes required: B9-1 |
| 36043 Cultivate | Selective draw/filtering and next-draw ordering; actual inline forced choices and Corp operation consumer | Existing integration covers staged trash/HQ/order and keeps AI choices hidden. In a scored-this-turn, playable lethal Neurospike board, inline ELO filter forces trashing that win instead of adding it to HQ. | Changes required: B9-2 |
| 36044 Unleash | Tag-funded free rez and immediate subroutine; actual play legality, target/subroutine selectors and rez continuation | Actual `FullCheckPlay` accepts tagged board, no-tags state declines. Five tags / three grip / zero credits: target selector prefers nonlethal Lionsmane over Vicsek's lethal four damage after tag payment. Existing continuation tests verify on-rez sequencing and free rez. | Changes required: B9-3 |
| 36045 The Red Room | Finite cross-server ETR reserve; actual `_globalETRUses`, live ability policy and Corp paid-window command | Real opposing/live policies agree on one useful use for a winning agenda breach, decline when breach cannot win, against its own HQ and without counters. Actual Corp movement selector chooses trigger. Existing placement/once-per-turn tests pass. Lotus Haze's illegal relocation is recorded in batch 8. | Pass for its own tested hooks and legal installation; cross-batch B8-2 still needs repair |

## Supported findings

### B9-1 — Vicsek's X is fixed before earlier encounters add tags

**Location:** `sets/vantagepoint.js:3604–3611`; `runcalculator.js:1133–1155`.

Two rezzed Vicsek ICE protect a server, and the Runner starts untagged. The actual RunCalculator precomputes both ICE models from current `runner.tags=0`, accepting a zero-damage complete route. Resolving the outer Vicsek gives one tag. The inner Vicsek's first subroutine therefore does one net damage and adds one tag; its second adds another tag, for three tags total. The preserved probe calls the actual card resolutions and checks that mismatch. A low-grip Runner can die on a route modelled as harmless.

**Repair criterion:** express X from the branch's accumulated tags at that encounter, not the initial global value. Validate an earlier tagging ICE, two Vicsek copies, broken tagging subroutines, tag prevention and baseline already-tagged states. Keep the evaluation read-only and synchronize Corp public security modelling where it uses this model.

### B9-2 — Cultivate discards an available immediate win

**Location:** `sets/vantagepoint.js:3707–3726`.

The Corp scored two printed agenda points this turn; Runner has one grip card. Revealed cards include Neurospike (ELO 1678, this-turn damage 2) and Anoetic Void (1911). After Cultivate resolves, Corp has the remaining click and 3 credits to play Neurospike; actual `FullCheckPlay` accepts that follow-up. The ELO sorter forces Neurospike to be trashed, losing a guaranteed flatline. Choosing Anoetic Void to trash and Neurospike for HQ wins immediately. Hidden R&D order is legitimately revealed by this effect; the problem is outcome valuation.

**Repair criterion:** preserve/add an immediately playable winning card before generic ELO sorting, account for follow-up costs/clicks and prevention, and avoid needless agenda flooding. Contrast lethal/nonlethal Neurospike, insufficient follow-up resources, safe economy/breaker-independent alternatives and empty/short R&D handling.

### B9-3 — Unleash chooses printed threat over an immediate flatline

**Location:** `sets/vantagepoint.js:3764–3778`, `:3831–3859`.

Runner has five tags and three grip cards, no installed prevention. Corp can legally play Unleash with zero credits. Installed unrezzed Lionsmane and Vicsek are available. Removing the tag leaves four: Vicsek's first subroutine does four net damage and wins. The text scorer treats `X net damage` as one, and target ranking adds printed rez cost, choosing Lionsmane; its chosen first subroutine deals only two damage. The actual play legality and both target/subroutine choice filters are exercised.

**Repair criterion:** model outcomes with post-cost tags and available prevention; an immediate win outranks rez savings or generic subroutine score. Test this board, already rezzed/illegal targets, useful defensive free rez, zero-tag decline and a justified optional-subroutine decline.

## Additional safety observation

Cultivate and Knowledge Seeker use similar ELO-plus-agenda ordering. Their effects reveal different groups and occur in different timing contexts, so a shared helper must receive the relevant current breach and follow-up budget rather than blindly sharing one ordering policy. Lionsmane's model/menu branch order matched the exercised real selector; no separate payment-choice defect was demonstrated.

## Verification and limits

Focused commands rerun in the isolated worktree with `/Users/paulbingham/.nvm/versions/node/v20.19.0/bin/node`:

- `tests/vantagepoint-integration.test.js`: pass.
- `tests/forfeit-restriction.test.js`: pass.
- `tests/play-and-steal-cost.test.js`: pass.
- `tests/subroutine-visual.test.js`: 76 ICE checked, pass.
- `tests/corp-install-destination.test.js`: pass.
- `tests/corp-server-security.test.js`: 145 cases pass.
- `tests/mycoweb-rez-discount.test.js`: 5 cases pass.
- `documentation/new-sets/reviews/vantage-point/probes/vantagepoint-batches-5-9.js`: 39 scenarios pass as current behavior.

All allocated cards were inspected against printed metadata, implementation notes, hook contracts, engine consumers and relevant AI architecture. Public-board decisions and legitimate revealed-R&D choices were traced; no new hidden-information violation was demonstrated. Existing generic architecture limitations are not waived by this report. Scenario coverage is bounded, not proof of optimal strategy or every interaction. No browser playthrough was performed by this reviewer; manual coverage belongs to the set report. Repairs require green strategic tests for the specific findings, focused mechanics checks, the full suite, and independent re-review. The coordinator owns tracker/backlog changes.

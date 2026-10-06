# Vantage Point batch 3 independent review

**Verdict: Changes required.** Exact IDs: 36009–36016. Implementation was Complete at review start; this review does not equate that status with readiness.

Reviewed 2026-10-06 by Codex independent batch reviewer. Snapshot commit: `45833a14c83fef2f9ce71506d344460181445021`. At review start the worktree contained documentation edits to the tracker, backlog and operator guide, plus the new set-review skill and history archive. Production source and existing tests were unchanged; reviews/probes created by the reviewers are additional untracked artifacts. No implementation or playability edits were made.

Source, test and probe SHA-256 hashes are in [the manifest](probes/vantagepoint-early-review.sha256). Shared code consumers are included: a later consumer change invalidates relevant passing evidence even if card definitions stay unchanged. This report establishes no passing evidence for subsequently changed code.

The review read the printed metadata via `batch-brief.js`, implementation notes, every allocated definition, actual engine trigger dispatch and Runner/Corp consumers, and relevant shared/Runner principles, architecture and hook contracts. The probes load the real engine/AI with browser rendering globals replaced by inert objects. Decisions are not stubbed. The Kompromat probe captures the UI decision callback and calls the real resolution; this is resolution evidence, not a complete gameplay playthrough.

## Per-card audit

| ID | Strategic role and actual consumers | Evidence and verdict |
|---|---|---|
| 36009 Vic | Click/credit draw and tag removal; legal ability → Runner draw-trigger branch/`AIWouldTrigger`. | Real CommandChoice selects Vic ability at 1 and 10 credits on small grip. Integration covers once-per-turn/reset/payment. Missing tagged, no-credit, full-grip and urgent-win action competition. **Evidence incomplete.** |
| 36010 Kompromat | Successful run either derezzes ice or grants bad publicity; run event selection and Corp inline derez-cost policy. | Real bad-publicity resolution throws undefined helper. **Defect C3-1.** Corp fixed rezCost≤3 preference lacks security/remaining-credit contrasts. |
| 36011 Sell Out | Sacrifice resource for net 3 credits/draw; `FullCheckPlay`/`_wastefulToPlay`/preferred-target consumer. | Real `_wastefulToPlay` with legal installed resource throws due wrong hook signature. **Defect C3-2.** Even corrected signature needs depleted/valuable resource alternatives. |
| 36012 Tailgate | Discounted HQ multiaccess; `PlayCost`, `AIAdditionalAccess`, HQ-value/run-event selection → breach. | Dedicated regression reproduces actual no-argument success contract and passes. Integration checks discount and own-run tracking. No real HQ multiaccess winning-steal versus expensive/no-value/Crisium decline scenarios. **Evidence incomplete.** |
| 36013 Borrowed Goods | MU at tag cost; install preference/keep MU check → automatic tag. | Actual last-click zero-pool command with MU need chooses gain, not unsafe installation; integration tag branches pass. Other draw-first smoke states are inconclusive. Need tagged/untagged tag-liability and urgent program install contrasts. **Evidence incomplete.** |
| 36014 Rotary | Optional tag for central extra access; Runner breach choice and additional-access models, Corp trash ability exposed via `corpAbilities`. | Actual SelectChoice chooses use=true or false solely by seed on identical zero-click board. **Necessary strategy gap C3-3.** Integration tests unconditional extra-access model and legal Corp ability, not both AI decisions. |
| 36015 Baker | Archives route redirect to HQ/R&D for stealth; `AIRunAbilityExtraPotential`/`AIRedirectsRun` → route planning; inline destination maximum cached potential. | Source verifies prospective run-only source context restored in finally; integration passes stealth payment/redirect hooks. Missing real run choice/decline/single-credit alternative and option to retain desirable Archives breach rather than forced redirect. **Evidence incomplete.** |
| 36016 Underdome Irregulars | End-action draw/tag removal conditional on rez; draw-install selector and remembered public rez history. | Actual last-click, 1-credit, no-rez command installs the resource, then its end-phase branch must trash it. **Defect C3-4.** No useful rez-state/maximum-hand-size/draw-versus-tag-removal competing outcome scenario. |

## Supported findings

### C3-1 — 36010 reward branch crashes

`sets/vantagepoint.js:930` calls nonexistent `AddBadPublicity`. Full-engine run-end choice resolution on a successful run without rezzed ice throws `ReferenceError`. `BadPublicity` is the supported engine helper (`mechanics.js:1590`); the integration test's fake `AddBadPublicity` conceals the failure. Repair and verify prevention, completion and remove-from-game sequencing through the real phase flow for both derez and bad-publicity branches.

### C3-2 — 36011 preferred-choice contract crashes Runner decisions

`sets/vantagepoint.js:980` declares `AIPreferredPlayChoice(card, choices)` although documented/current consumers pass `choices` as the sole argument (`ai_runner.js:175`, `2450`, `2827`). A legal installed Underdome makes Sell Out playable; the real `_wastefulToPlay(sellOut, sellOut.Enumerate())` consumer throws reading `choices.length`. Repair to the current contract and exercise full CommandChoice/select/resolution, including decline if sacrificing a necessary resource outweighs economy/draw.

### C3-3 — 36014 optional tag has no strategic decision consumer

On the identical central-breach board with zero clicks and an untagged Runner, the real `SelectChoice` selects take-tag with seed 0 and decline with seed 0.99. `AITriggerWhenCan` on this card is a Corp action consumer flag, not a Runner optional-breach preference. The card returns both choices without preference and the Runner selector falls through to random choice. Both extra-access hooks always claim +1 access independently of this random decision. This is a demonstrated missing necessary capability, not a claim that a tag is always wrong.

Repair criterion: make central bonus valuation and actual optional choice consistent; choose useful access, decline when tag liability is prohibitive (remaining clicks/credits, tagged resource threat, kill), and honour game-winning access. Demonstrate these through real selector/planner states and Corp Rotary-trash versus immediate tactics.

### C3-4 — 36016 wastes the last click and credit on guaranteed self-trash

Full-engine `CommandChoice(['install','gain'])`, with one remaining click, one credit, Underdome in grip, no ice rezzed this turn and no intervening run possible, chooses install. `AIDrawInstall()` at `sets/vantagepoint.js:1384` always returns 1. At action-phase end the false `iceRezzedThisTurn` branch at `1374` trashes it, producing no benefit; gaining a credit strictly dominates. The reproduction has no trash-trigger synergy.

Repair criterion: real command decline in the no-rez last-click case; useful install after a remembered ice rez; reasoned install before an achievable rez opportunity, plus tag/draw choice and overdraw costs.

## Verification

Node `v20.19.0` matches `.nvmrc`. Commands executed:

- `node scripts/batch-brief.js 3` for the allocated batch: metadata/ranges inspected.
- `node tests/vantagepoint-integration.test.js`: passed. Most early-card assertions invoke card hooks with supplied arguments and mock engine helpers; this does not cover the defects below.
- `node tests/credit-pool-lock.test.js`: passed.
- `node tests/tailgate-hq-access-not-granted.test.js`: passed.
- `node tests/vantagepoint-batch13.test.js`: passed, including current Corsair restricted-payment modelling.
- `node documentation/new-sets/reviews/probes/vantagepoint-batches-1-4.cjs`: passed all current-behavior observations, reproducing reported defects. These assertions deliberately describe current bad behavior; they are not repair acceptance tests.
- `node documentation/new-sets/reviews/probes/vantagepoint-early-command-coverage.cjs`: 40 real command decisions completed without an uncaught error. This is a broad smoke probe, not sufficient contrasting strategy acceptance.
- `git diff --check`: passed during review.

The coordinator's immutable-snapshot full run is recorded in [the set review](vantagepoint-set-review.md): `node tests/run-all-tests.js`, 50 test files passed, including Corp decision fixtures and decision snapshots. Shared syntax/integration/eternal/deckbuild/identity checks passed. Known-red pending tests were excluded from that green result. Separately, the existing pending Corsair/Lampades reproduction was examined and fails all four cases because it expects a removed `AIRunPoolCreditOffset` hook; it is not evidence that the current restricted-credit repair failed.

No browser/manual game was performed by this reviewer. Headless probes do not establish rendering, click flow or full-match performance. For every card marked “Evidence incomplete,” re-review needs real selector/planner useful-action and decline states, scarce resources/competing actions and decisive outcomes where applicable. Existing hook-level integration assertions remain supplements.

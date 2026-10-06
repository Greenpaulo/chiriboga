# Vantage Point batch 6 independent review

- Date: 2026-10-06.
- Reviewer: Codex, independent batch reviewer in the coordinated full-set audit.
- Exact IDs: 36026, 36027, 36028, 36029, 36030.
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
| 36026 Méliès City Luxury Line | 5/3 scoring agenda, score-click income, additional steal click; score/access engine and Runner route planner | Actual `CheckSteal` rejects zero clicks and accepts one; actual calculator nevertheless returns a complete zero-click route to a known Luxury Line. On-score click gain and access payment are covered by existing focused tests. | Changes required: B6-1 |
| 36027 Synchrocyclotron | Make first Double efficient; real Corp install ranking, click-cost modifier, paid rez opportunities | Real install ranking holds without a Double, installs with one, rejects unaffordable rez setup. Real post-action selector declines affordable rez with one click remaining, despite discounted Retirement Plan becoming legally playable. | Changes required: B6-2 |
| 36028 Ansel 2.0 | Program destruction, recursion disruption, install tempo and ETR; real ICE pathfinder and two-click breaker model | Actual complete run with no killer is possible with two clicks, impossible with one; scarce credits do not fabricate a breaker. Existing integration covers two chosen breaks, trash/removal and optional HQ/Archives install sequencing. Corp target ELO heuristics were inspected rather than endorsed as optimal. | Pass within tested path/selector architecture; target-policy improvement remains optional unless a tactical counterexample is demonstrated |
| 36029 Reverb | Cheap discounted two-ETR barrier; dynamic `RezCost`, real run pathfinder, Corp protection | Without a breaker the real calculator rejects passage; with Corroder it needs 2 credits and rejects 1. Existing integration checks discounted rez cost counts other unrezzed ICE, no self-discount. | Pass within tested architecture |
| 36030 Sleipnir | Draw/recursion while defending; inline Corp choices consumed by real `CorpAI.Choice`, ICE model | Real selector draws from nonempty R&D and declines empty R&D. It draws into full HQ and declines to shuffle the only winning HQ agenda when Archives is empty. Integration covers draw/shuffle mechanics and ETR. | Changes required: B6-3 |

## Supported findings

### B6-1 — Additional steal clicks never enter the Runner's approach budget

**Location:** `sets/vantagepoint.js:2093`; `checks.js:420`; `utility.js:3505`; `runcalculator.js:950–1088`.

A known Luxury Line is the agenda in an otherwise open remote. The Runner has zero clicks remaining after starting a run. The actual calculator returns a complete route using zero clicks, while actual `CheckSteal` rejects stealing because the printed extra click is unavailable. With one click, stealing is legal. The access engine is correct; prospective planning is incomplete.

**Impact/repair criterion:** account for visible additional steal costs in run/approach budgets and distinguish reaching the server from gaining its agenda reward. Confirm zero/one clicks, other click-taxing ICE and game-winning steals. Unknown agendas must not be read to estimate hidden tolls.

### B6-2 — Synchrocyclotron has installation support but no useful rez consumer

**Location:** `sets/vantagepoint.js:2104–2165`; `ai_corp.js:5313–5342`, `:7097–7105`.

Synchrocyclotron is installed unrezzed; the Corp has 4 credits and one remaining click, Retirement Plan in HQ, and Reverb in Archives. In the real post-action paid opportunity, `Choice(['rez','n'])` declines. Its rez is affordable. Once it is rezzed, the actual click-cost modifier reduces Retirement Plan to one click and actual `FullCheckPlay` accepts its Archives install. The card declares neither a generic rez policy nor the older situational rez contract, and is absent from the fixed post-action/EOT lists.

**Impact/repair criterion:** add a card-agnostic rez policy consumed before useful Double windows expire, comparing the 3-credit setup against available alternatives and follow-up installation cost. Test last-click value, already-used discount, unaffordable setup and no useful Double. Do not add a title to the AI's fixed lists.

### B6-3 — Sleipnir will not remove an immediately losing HQ agenda

**Location:** `sets/vantagepoint.js:2463–2475`.

Runner has 5 points and is running HQ; HQ contains only a stealable 2-point agenda, Archives is empty, and Sleipnir's final ETR is broken/otherwise answered. Its optional shuffle selector considers only Archives cards and chooses decline. Shuffling the agenda into R&D leaves the imminent HQ breach without that winning agenda. Actual `CorpAI.Choice` consumes the decline preference. The reproduction also shows drawing into a full HQ, which is a weaker hand-space concern rather than the decisive defect.

**Repair criterion:** compare HQ evacuation/padding and Archives recovery with the actual server under threat, immediate loss, deck/hand clocks and useful declines. Test this game-saving shuffle plus useful Archives recovery and holding a strategically needed HQ card.

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

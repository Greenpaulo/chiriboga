# Vantage Point batch 7 independent review

- Date: 2026-10-06.
- Reviewer: Codex, independent batch reviewer in the coordinated full-set audit.
- Exact IDs: 36031, 36032, 36033, 36034, 36035.
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
| 36031 Vertigo | Deny steals/trashes after a no-click pass; pass-response engine and remaining-click ICE modelling | Existing mechanics apply restriction with zero clicks and clean up at run end; real pathfinder breaks its click-loss subroutine with Gordian Blade and accepts a zero-click complete route, omitting the still-mandatory pass restriction. | Changes required: B7-1 |
| 36032 Caveat Emptor | Credit income versus opponent action tempo; inline mode selector, declared Corp economy consumer | Real mode selects credit gain and grants a click at Runner 5 points; actual run calculation shows this opens two Ansel defenses that the denial branch keeps closed. At 6 points selector correctly denies a click. | Changes required: B7-2 |
| 36033 realloc() | Convert rezzed defense into money; real pair enumeration and `_cardProtectionValue`, economy declaration | Actual protection scorer declines cheap Vertigo pairs, permits high printed-cost Ansel pair; fewer than two targets cannot play. Existing integration checks printed-cost payouts and derez. No stronger harmful allocation counterexample was demonstrated. | Pass within current economy/protection architecture |
| 36034 Retirement Plan | Recur and install useful Corp board cards; actual legal Archives options and `_bestInstallOption` | Real install consumer declines empty Archives, chooses actual legal Reverb destination with sufficient credits/clicks. Synchrocyclotron probe verifies actual one-click legality under discount. Integration rejects operations/upgrades and follows normal install costs. | Pass within current install architecture |
| 36035 Perfect Recall | Spend finite counters to deny a revealed title; defensive installation/rez and inline paid selection | Actual selector offers irrelevant HQ agenda protection while Runner attacks empty Archives; counter exhaustion declines. Real Corp command declines affordable rez before an otherwise game-winning agenda breach. | Changes required: B7-3 and B7-4 |

## Supported findings

### B7-1 — Breaking Vertigo's subroutine incorrectly removes its pass tax from planning

**Location:** `sets/vantagepoint.js:2513–2554`; `runcalculator.js:511–585`.

Vertigo is rezzed, Runner has zero clicks left and Gordian Blade can break its one subroutine. The actual calculator returns a complete route containing that break and no serious restriction. Gameplay still triggers the unconditional on-pass check and forbids stealing/trashing for the rest of the run. The current serious effect is attached to the subroutine, so breaking that subroutine deletes an independent mandatory effect. This can waste the last run on a known winning agenda.

**Repair criterion:** model the pass condition regardless of whether the click-loss subroutine fired, broke or was bypassed as rules require. Contrast zero clicks with a remaining click, broken/unbroken subroutines, and other earlier click losses. Preserve turn/run cleanup and public-information boundaries.

### B7-2 — Match point is incorrectly reduced to six agenda points

**Location:** `sets/vantagepoint.js:2584–2599`.

Runner at 5 points can win on a 2-pointer. A valuable remote protected by two Ansel 2.0 ICE, with no sentry breaker available, requires four remaining clicks for their paid breaks. The larger-credit mode grants a fifth allotted click: after starting the run four remain, and actual calculation finds a complete route. The denial mode leaves only two after starting and rejects passage. The selector still grants the click because its safety check is only `points >= pointsToWin - 1`. The extra four credits do not stop this click-only route.

**Repair criterion:** compare meaningful next-turn breach/kill/score outcomes rather than a one-point threshold. Preserve useful larger-income states, but deny the enabling click on this two-pointer board. Include additional-action dependence and actual Corp defense affordability.

### B7-3 — Perfect Recall is not rezzed at the defensive opportunity it needs

**Location:** `sets/vantagepoint.js:2816–2827`; `ai_corp.js:5205–5252`.

A ready-to-steal Lotus Haze is in a remote; Runner has 5 points, and HQ contains another Lotus Haze to reveal. Perfect Recall is installed unrezzed, with no counters yet; Corp can afford its 1-credit rez. Actual `_runnerMayWinIfServerBreached` recognizes the loss, but movement `Choice(['rez','n'])` declines. Rezzing would supply a power counter and permit revealing the HQ copy to protect the remote agenda. Its before-score rez hook does not supply this run-defense consumer.

**Repair criterion:** declare and consume a defensive rez policy at the appropriate paid window, considering usable counters, available HQ titles, imminent access and reserve priorities. Demonstrate preventing this winning steal, no-HQ-match decline and affordable/unaffordable states.

### B7-4 — A scarce counter can be spent on a title absent from the attacked server

**Location:** `sets/vantagepoint.js:2764–2788`; generic approaching/movement trigger defaults at `ai_corp.js:5197–5201` and `:5253–5257`.

Runner attacks Archives with no cards/root targets; HQ contains an agenda and Perfect Recall has counters. The selector returns the HQ agenda solely because agenda type adds a positive score, even though no copy can be accessed. The generic paid-window consumer triggers any available ability. This spends finite protection with no effect on the current breach, making later useful defense worse. Zero counters correctly suppresses the ability.

**Repair criterion:** restrict choices to copies actually at risk (using fair uncertainty for R&D), recognize existing title protection, and preserve counters when no benefit exists. Contrast useful HQ/remote protection with empty Archives, an unrelated remote and duplicate activation.

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

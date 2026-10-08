# Vantage Point batch 5 independent review

- Date: 2026-10-06.
- Reviewer: Codex, independent batch reviewer in the coordinated full-set audit.
- Exact IDs: 36021, 36022, 36023, 36024, 36025.
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
| 36021 Touchstone | Event-funded run credits; Runner economy installation, worth-keeping and `AIRunPoolCreditOffset` | Real `CommandChoice` clicks for a credit with affordable Touchstone in grip; numeric economy hook is ignored. Integration checks first event while inactive, turn reset and run-only credit use. | Changes required: B5-1 |
| 36022 Read-Write Share | Selective grip cycling and delayed recursion; generic Runner installation/keep path, inline hosting selector | Real keep scorer retains the sole Buzzsaw; hosting selector forces that lower-ELO essential breaker over Mutual Favor/Conduit. Low-grip state declines. Real command path installs when rich and holds when poor. Mechanics tests cover facedown/non-installed hosting and shuffle cleanup. | Changes required: B5-2 |
| 36023 Sipa | Redistribute ICE after a full outer break; `_iceComparisonScore`, public threat/potential consumer, preferred-option selector | Beneficial lower weighted-score swap and justified decline run through real scoring; real `SelectChoice` consumes decline preference. Counterexample moves Ansel into valuable HQ because its original Archives potential is low. Rich/poor installation contrasted. | Changes required: B5-3 |
| 36024 Stowaway | Reward repeated successful runs; real hosted install choices and `AIPreferredInstallChoice`, run extra potential | Actual calculator opens a one-Reverb central with Corroder while three Ansel ICE are unreachable with the remaining click budget. Host selector chooses the latter because it has more ICE. Empty host list declines; rich/poor installation contrasted. Integration checks reward follows host server and pays only on success there. | Changes required: B5-4 |
| 36025 Word on the Street | Fast-advance tax or economy payout on older scores; generic installation/keep consumer and mandatory score engine | Rich Runner installs, poor Runner holds through real command selection. Integration distinguishes newly installed versus older agenda scoring; forfeit suite checks filtering and direct-resolution guard. Mandatory on-score effects require no optional activation policy. | Pass within the tested architecture; prospective Corp fast-advance point budgeting remains set-wide follow-up coverage |

## Supported findings

### B5-1 — Touchstone's economy declaration is never consumed

**Location:** `sets/vantagepoint.js:1782`; `ai_runner.js:1449` and `:2724`; documented function contract at `documentation/ai.md:566`.

Touchstone declares `AIEconomyInstall: 2`, while all Runner consumers require a function. With 5 credits, 4 clicks, Touchstone in grip and legal install/gain commands, the real selector chooses gain. It does not register this as the documented priority economy installation. Generic rich/overdraw installation can eventually install it, which does not repair the missing economy consumer.

**Impact/repair criterion:** use the actual hook contract, with event availability/payback and affordability evidence. Confirm useful installation versus hold, duplicate rejection and run-credit budgeting through real command selection; documentation must describe the final policy.

### B5-2 — Forced ELO hosting overrides preservation of the only decoder

**Location:** `sets/vantagepoint.js:1809–1823`; `ai_runner.js:902–946`.

Read-Write Share has space and grip contains Buzzsaw (1615 ELO), Mutual Favor (1745) and Conduit (1767), with no installed decoder. The real keep scorer retains Buzzsaw as an essential breaker. The optional hosting selector nevertheless returns only Buzzsaw, removing the ability to decline or host another card. Hosting makes it unavailable until the program is trashed, cards are shuffled, and the breaker is drawn again. When a code-gate scoring server requires that only available answer, this is a material loss of access rather than cosmetic card preference. A single-card grip correctly declines.

**Repair criterion:** preserve urgently useful/essential cards and compare useful alternatives; permit justified decline. Demonstrate a realistic urgent decoder board, safe surplus-card cycling, scarce MU/grip, and purposeful recovery of hosted cards via the real selectors.

### B5-3 — Sipa evaluates the target at its old server, rather than the swap outcome

**Location:** `sets/vantagepoint.js:1923–1937`; `ai_runner.js:397`.

Fully broken Reverb protects HQ, which has cached public potential 3; installed Corroder matches it. Ansel 2.0 protects Archives, with potential 0.1, and no killer is installed. Ansel's original weighted score is lower despite its greater threat. Sipa chooses it, relocating the unanswerable sentry to the valuable HQ and placing the easy barrier in Archives. Comparing the two original scores is not equivalent to evaluating their new destinations.

**Repair criterion:** assess both servers after the legal swap with public information and available breakers/clicks, and decline this worsening exchange. Preserve a genuinely useful swap, same-server position cases, no mutation leakage and the fully broken/outermost/once-per-turn conditions.

### B5-4 — Stowaway installs on an unreachable server over an immediately useful host

**Location:** `sets/vantagepoint.js:1990–2006`; Runner hosted install consumer at `ai_runner.js:2771`.

With Corroder and 13 credits, the real calculator opens HQ protected by Reverb with one remaining run click; three Ansel 2.0 ICE cannot be crossed without a killer at that click budget. Given hosts on both servers, Stowaway chooses the three-ICE remote solely because its ICE count is larger. That spends an install click/MU while its repeatable 2-credit reward is available on the reachable central instead.

**Repair criterion:** rank hosts using reachable, desirable successful runs and expected reward opportunity, including near-term clocks and memory. Test the reproduced locked versus reachable board, movement of the host, and a justified no-install state.

## Evidence limits and optional follow-up

Word on the Street's score-area tax changes prospective winning scores; the current generic Corp scoring model reads printed agenda points when identifying wins. This report does not prove a specific harmful command from that interaction and does not reopen 36025 on speculation. Add prospective scoring-budget coverage during set-wide repairs. The confirmed batch defects already prevent approval.

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

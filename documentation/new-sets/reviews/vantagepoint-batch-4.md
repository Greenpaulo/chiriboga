# Vantage Point batch 4 independent review

**Verdict: Changes required.** Exact IDs: 36017–36020. Implementation was Complete at review start; this review does not equate that status with readiness.

Reviewed 2026-10-06 by Codex independent batch reviewer. Snapshot commit: `45833a14c83fef2f9ce71506d344460181445021`. At review start the worktree contained documentation edits to the tracker, backlog and operator guide, plus the new set-review skill and history archive. Production source and existing tests were unchanged; reviews/probes created by the reviewers are additional untracked artifacts. No implementation or playability edits were made.

Source, test and probe SHA-256 hashes are in [the manifest](probes/vantagepoint-early-review.sha256). Shared code consumers are included: a later consumer change invalidates relevant passing evidence even if card definitions stay unchanged. This report establishes no passing evidence for subsequently changed code.

The review read the printed metadata via `batch-brief.js`, implementation notes, every allocated definition, actual engine trigger dispatch and Runner/Corp consumers, and relevant shared/Runner principles, architecture and hook contracts. The probes load the real engine/AI with browser rendering globals replaced by inert objects. Decisions are not stubbed. The Kompromat probe captures the UI decision callback and calls the real resolution; this is resolution evidence, not a complete gameplay playthrough.

## Per-card audit

| ID | Strategic role and actual consumers | Evidence and verdict |
|---|---|---|
| 36017 Hiram | Hardware install/trash knowledge of R&D top → Runner known-top potential and run-before-draw policy. | Integration tests knowledge flag and unrelated trash decline; inspected actual `knownToRunner` potential consumer at `ai_runner.js:1929`. No real agenda-top priority and worthless-top decline/change-after-draw comparisons or human reveal verification. **Evidence incomplete.** |
| 36018 Aircheck | Four hosted credits/locked pool run event and optional second remote; credit checks/payments, run-event hypothetical budgeting and run-end cleanup queue. | Credit-lock suite and mechanics integration pass. Actual follow-up response forces a positive cached-potential remote with zero event credits without recalculating affordable route. This is an observed unguarded policy, not yet a proved game-losing state. **Evidence incomplete.** |
| 36019 Beta Build | Temporary cost-free non-virus tutor and run; `AIIcebreakerTutor` → bonus-breaker run planning; preferred program/server and install cleanup. | Inspected real tutor consumer and corrected local-array use; integration confirms restrictions/shuffle/install/uninstall/return hooks. No actual tutor selection finds urgent answer over high-ELO other type, insufficient MU/credits decline, or temporary-only return cost. **Evidence incomplete.** |
| 36020 Methuselah | Hardware fuel to run-only stealth economy; discard-worth consumer and cached-cost response; hosted-credit offset/installation. | Integration tests valid fuel and credits. Declared numeric economy-install hook has no consumer. **Necessary capability gap C4-1.** Fuel decisions/installation follow-up budgets need actual opposing route/value contrasts. |

## Supported finding

### C4-1 — 36020 economy-install hook has the wrong type and is ignored

`sets/vantagepoint.js:1727` defines `AIEconomyInstall: 2`, but both current Runner priority-economy preplanning (`ai_runner.js:1449`) and actual economy-install selection (`2724`) check `typeof ... == 'function'` before invoking it. The documented contract is `AIEconomyInstall()` (`documentation/ai.md:566`). There is no numeric fallback. Thus the explicitly declared economy-install priority never participates in either consumer; generic installation or preparation paths may still install the console, so this is not a claim that the card is never installed.

Repair criterion: conform to the real hook contract, decide useful fuel/credit installation priority using the full install cost and future fuel costs, and exercise actual CommandChoice states that install for a justified route/economy opportunity and decline for absent/unaffordable/necessary-hardware fuel.

## Remaining strategy/rules evidence

Aircheck's second-run forced maximum potential needs affordable-route and lethal-ice decline scenarios under the remaining hosted-credit budget, plus cross-event run cleanup against other run-end effects. Beta Build needs a real temporary tutor run selector, not only its hook returns. Hiram needs knowledge-boundary and real run choice tests following a hardware-triggered look, and human-facing reveal evidence. Methuselah needs hardware discard versus required install (including its console cost) and stealth-credit sharing with Corsair/Lampades.

## Verification

Node `v20.19.0` matches `.nvmrc`. Commands executed:

- `node scripts/batch-brief.js 4` for the allocated batch: metadata/ranges inspected.
- `node tests/vantagepoint-integration.test.js`: passed. Most early-card assertions invoke card hooks with supplied arguments and mock engine helpers; this does not cover the defects below.
- `node tests/credit-pool-lock.test.js`: passed.
- `node tests/tailgate-hq-access-not-granted.test.js`: passed.
- `node tests/vantagepoint-batch13.test.js`: passed, including current Corsair restricted-payment modelling.
- `node documentation/new-sets/reviews/probes/vantagepoint-batches-1-4.cjs`: passed all current-behavior observations, reproducing reported defects. These assertions deliberately describe current bad behavior; they are not repair acceptance tests.
- `node documentation/new-sets/reviews/probes/vantagepoint-early-command-coverage.cjs`: 40 real command decisions completed without an uncaught error. This is a broad smoke probe, not sufficient contrasting strategy acceptance.
- `git diff --check`: passed during review.

The coordinator's immutable-snapshot full run is recorded in [the set review](vantagepoint-set-review.md): `node tests/run-all-tests.js`, 50 test files passed, including Corp decision fixtures and decision snapshots. Shared syntax/integration/eternal/deckbuild/identity checks passed. Known-red pending tests were excluded from that green result. Separately, the existing pending Corsair/Lampades reproduction was examined and fails all four cases because it expects a removed `AIRunPoolCreditOffset` hook; it is not evidence that the current restricted-credit repair failed.

No browser/manual game was performed by this reviewer. Headless probes do not establish rendering, click flow or full-match performance. For every card marked “Evidence incomplete,” re-review needs real selector/planner useful-action and decline states, scarce resources/competing actions and decisive outcomes where applicable. Existing hook-level integration assertions remain supplements.

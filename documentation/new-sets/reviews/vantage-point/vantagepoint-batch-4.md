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


## Additional audit on the isolated review snapshot

Continued on 2026-10-06 in `/private/tmp/chiriboga-vantagepoint-set-review`, saved WIP commit `bd733d65f3bb9aa104083edb335f7a137e94d3c3`. Production source and existing focused tests were revalidated against the original manifest; the original code snapshot remains unchanged. The dirty worktree contains review artifacts from independent reviewers and an image-directory symlink for verification. No production/test changes were made. Current source/probe hashes are in [the continuation manifest](probes/vantagepoint-early-revalidation.sha256).

The following evidence updates the initial audit table above. Run `/Users/paulbingham/.nvm/versions/node/v20.19.0/bin/node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-early-strategy.cjs` for the preserved real planner/selector contrasts (18 observations), with `VERBOSE=1` only for scenario diagnostics. The initial observations probe and 40-command smoke were rerun under that same pinned binary. Integration, batch13, credit-lock and Tailgate regression tests passed again. Shared full-suite and smoke revalidation is coordinator-owned and recorded in the set report; this reviewer makes no browser-playthrough claim.

| ID | Added real-path evidence | Current card assessment |
|---|---|---|
| 36017 | Hiram's legitimate look makes the actual R&D potential positive and chooses run for a known agenda; for known Seamless Launch potential becomes zero and it chooses gain. The existing `PlayerCanLook` consumer permits `knownToRunner`; no hidden-card content was supplied to the planner before the look. | Knowledge-to-strategy consumer **supported**; browser disclosure and post-draw knowledge invalidation remain broader readiness limits. |
| 36018 | Real credit-lock suite passes normal cases, but a real route-consumer exception after the temporary mutation leaves the live credit pool 15→1. Positive-potential follow-up remains forced without a fresh affordable-route check. Shared Paywall/fund defect is separately reproduced by the coordinator. | **Changes required:** C4-3 and the set-level bad-publicity-fund finding. Secondary-run risk contrasts remain limited. |
| 36019 | Actual play choice without tutor `nextPrefs` selects different programs/servers by seed. Last-click, 4-credit state with stack Cleaver and a remembered game-winning HQ agenda chooses gain, although a correctly budgeted real route succeeds. | **Changes required:** C4-2 and C4-4. |
| 36020 | Actual selected fuel discards redundant Borrowed Goods and preserves useful Tailor when funds suffice. The real console command can still install through generic paths despite its ignored numeric economy hook. | **Changes required:** C4-1; the issue is the missing economy consumer, not a claim that installation never occurs. Useful/decline fuel paths are now supported. |

### C4-2 — 36019 drops the tutor's planned program and server

`ai_runner.js:2348` returns a tutor play preference containing only `cardToPlay`, explicitly omitting `nextPrefs`. Beta Build's separately defined `AIPreferredPlayChoice` is not consumed on this path. In the preserved full-engine selector probe, with HQ the planned server and both Buzzsaw and Cleaver legal stack targets, actual `SelectChoice` in `Playing Beta Build` selects Buzzsaw/HQ with seed 0, but Cleaver/Archives with seed .99. This breaks the planner's chosen answer/route; the selector is not stubbed.

Repair criterion: carry the selected legal program/host/server through to the actual event resolution, or invoke an actual choice consumer that reconstructs the same plan safely. Test an urgent needed breaker against another legal program and a competing server, plus illegal/changed-target fallback. Do not accept hook-return tests alone.

### C4-3 — 36018 hypothetical pool mutation leaks after a route exception

Aircheck's `AIRunEventModify` (`sets/vantagepoint.js:1544`) temporarily changes `runner.creditPool` to its printed play cost. `_commonRunCalculationChecksAsync` calls Restore only after awaiting the real run calculator (`ai_runner.js:1123–1127`); it has no `finally` safeguard. The probe injects a throwing getter on the public strength of a rezzed Ice Wall, retaining the actual route consumer. After the expected route exception, the live pool remains 1 rather than its original 15, and restore state remains on the event.

This is controlled exception-safety evidence, not a claim that this artificial strength getter occurs in ordinary gameplay. Shared principle 6 requires hypothetical changes to restore on exceptions. Repair criterion: guarded `finally` restoration of pool, card scratch state, hypothetical bonus breaker and calculator runEvent on both successful and throwing routes, with meaningful exception-path regression.

### C4-4 — 36019 is modelled as needing extra tutor-preparation clicks

The generic tutor budget at `ai_runner.js:1090–1093` subtracts the tutor play cost and two additional setup clicks in addition to the initiating-run click. Beta Build's printed resolution already installs the program ignoring costs and starts the run with the same one-click event. The continuation probe gives the Runner 6 agenda points, one remaining click, 4 credits, Beta Build in Grip, Cleaver in Stack and Ice Wall on HQ; the one HQ card is a publicly remembered Superconducting Hub. Actual CommandChoice chooses gain. A real run calculation with the correct one-click/three-credit event budget and bonus Cleaver returns a complete one-credit-break route, yielding a game-winning access.

Repair criterion: a run-initiating tutor must be budgeted as its real combined action, preserve temporary installation/return semantics, select the winning route on the last click, and decline when the combined play/break budget or MU is insufficient. Keep ordinary non-run tutor planning correct.

### Set-level cross-batch finding — Aircheck, Paywall and bad-publicity fund

See [the coordinator's real-helper reproduction](probes/vantagepoint-bad-publicity-fund.js) and [set review](vantagepoint-set-review.md). The fund is spendable outside the ordinary pool; the current shared `Credits`/`LoseCredits` helpers treat it as ordinary loseable credits, including under Aircheck's lock and on Corp credit-loss paths. This affects 36018 with 36052 and existing playable effects. The batch credit-lock test passing does not cover the corrected primary-rule expectation. Repair/re-review must retain the real helper and cross-batch paths.

## Verification

Node `v20.19.0` matches `.nvmrc`. Commands executed:

- `node scripts/batch-brief.js 4` for the allocated batch: metadata/ranges inspected.
- `node tests/vantagepoint-integration.test.js`: passed. Most early-card assertions invoke card hooks with supplied arguments and mock engine helpers; this does not cover the defects below.
- `node tests/credit-pool-lock.test.js`: passed.
- `node tests/tailgate-hq-access-not-granted.test.js`: passed.
- `node tests/vantagepoint-batch13.test.js`: passed, including current Corsair restricted-payment modelling.
- `node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-batches-1-4.cjs`: passed all current-behavior observations, reproducing reported defects. These assertions deliberately describe current bad behavior; they are not repair acceptance tests.
- `node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-early-command-coverage.cjs`: 40 real command decisions completed without an uncaught error. This is a broad smoke probe, not sufficient contrasting strategy acceptance.
- `git diff --check`: passed during review.

The coordinator's immutable-snapshot full run is recorded in [the set review](vantagepoint-set-review.md): `node tests/run-all-tests.js`, 50 test files passed, including Corp decision fixtures and decision snapshots. Shared syntax/integration/eternal/deckbuild/identity checks passed. Known-red pending tests were excluded from that green result. Separately, the existing pending Corsair/Lampades reproduction was examined and fails all four cases because it expects a removed `AIRunPoolCreditOffset` hook; it is not evidence that the current restricted-credit repair failed.

No browser/manual game was performed by this reviewer. Headless probes do not establish rendering, click flow or full-match performance. For every card marked “Evidence incomplete,” re-review needs real selector/planner useful-action and decline states, scarce resources/competing actions and decisive outcomes where applicable. Existing hook-level integration assertions remain supplements.

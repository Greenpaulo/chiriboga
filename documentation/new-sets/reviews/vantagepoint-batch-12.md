# Vantage Point batch 12 review

**Verdict: Changes required.** Exact IDs: `36056–36060`; original queue status Complete.

Date: 2026-10-06. Reviewer: independent Codex reviewer `/root/review_batches_10_13`.
Reviewed commit: `45833a14c83fef2f9ce71506d344460181445021` (Node `v20.19.0`, matching `.nvmrc`).
At review start the tracker, operator guide and backlog had documentation edits; the set-review skill and history were untracked. Other reviewers wrote disjoint review artifacts concurrently. Production and existing test files were not edited. Review artifacts were recovered to the isolated `/private/tmp/chiriboga-vantagepoint-set-review` worktree after the main checkout changed branch; all further review work used that isolated snapshot. [SHA-256 manifest](probes/vantagepoint-batches-10-13.sha256.txt) identifies reviewed definitions, consumers, documentation, metadata, tests and the preserved probe.

Scope: current definitions, printed metadata, rules/timing/cleanup and both sides' relevant strategic consumers. Implementation notes were treated as claims. This is sampled contrasting decision evidence, not exhaustive combinations or browser playthroughs.

## Per-card evidence

| ID / card | Role and actual consumers | Contrasting evidence and outcome | Verdict |
|---|---|---|---|
| 36056 Sacrifice Zone Expansion | Public advance economy/scoring; `_potentialAdvancementDirections`, `_bestMainPhaseEconomyOption`, live damage selection, `AIRunSuccessfulDamage` in RC. | Actual search counts first advance income once, reuses it next turn, rejects overadvance and compares gain click. Actual option selector preserves essential scoring counter/completed score, uses surplus, prioritizes empty-Grip flatline. Independent Crash Space probe demonstrates incorrect damage type in RC. | Changes required. |
| 36057 Luana Campos | Economy and publicity suppression; real protected-remote installation ranking, generic rez command/card selection and start-turn option selector. | Actual selectors install behind available ICE and rez when funded with publicity and >1 R&D card; decline no publicity or unsafe final draw. Real Uninstall interrupt waits for BadPublicity responses and returns hosted counters before movement. | Supported in sampled useful/decline/resource and cleanup paths. |
| 36058 Event Horizon | Finite paid ETR plus payment/rig threat; actual Corp paid trigger selectors and public security/Runner finite continuations. | Saves a winning agenda/final-click non-winning prize at final movement, declines earlier/empty/repeatable window. Actual RC prices second traversal, exhausted credits/clicks, consumed ICE omission, multiple finite stops, routes through passed ICE and read-only overlays. Live subroutine choices match stable `srChoice` branches. | Supported in sampled trigger, payment and finite-route paths. |
| 36059 Flywheel | Encounter economy/draw with zero ETR; actual Corp subroutine option selector and RC economics. | Real option selector draws with room and >1 R&D card; declines last mandatory-draw card and HQ overflow. Mandatory credit occurs before optional draw. Actual ICE model remains non-stopping. | Supported in sampled draw/decline states and valuation. |
| 36060 Tocsin | Expensive ICE or HQ expend defender setup; real ability discovery, Corp command/card selection, ordered searches and run model. | Actual selectors expend for affordable new stopping barriers/sentries, decline last click/unsafe or empty deck/unaffordable follow-up/already affordable HQ ICE, and choose immediate winning advancement before setup. Real search prefers stopping over high-ELO economy ICE. Actual RC drains two pool credits and models two ETRs. | Supported in sampled competing action, budgets and choices; shared pool-loss repair must retain live/model agreement. |

## Supported defect: 36056's meat damage is modelled as net damage

Location: `runcalculator.js:968`, consumer of `sets/vantagepoint.js:4677` (`AIRunSuccessfulDamage`). Existing `documentation/ai.md` explicitly calls net damage a generic representation of this meat damage; the now-supported public meat prevention makes that representation observably wrong.

Reproduction: the preserved probe installs a public unused Sacrifice Zone Expansion with one advancement counter on a different server. The Runner has an empty Grip and an installed active Crash Space with three public meat prevention. Running open HQ can survive by preventing the printed one meat damage. The actual `RunCalculator.Calculate` returns no complete routes. Setting only the agenda's used flag yields routes, isolating its successful-run damage as the blocker.

Expected: preserve the meat damage type through the public successful-run effect and consume the actual available meat prevention once; no net prevention should apply. The live card already resolves `Damage("meat", 1, true)` correctly. Impact: Runner refuses safely survivable, potentially winning runs, and later mixed/repeated prevention budgets can be wrong. The scalar hook cannot distinguish types; a documented typed contract or equivalent supported typed consumer is needed rather than replacing all successful-run damage blindly.

Acceptance: real RC contrasting no-prevention/lethal, public-prevention/survivable, exhausted prevention and mixed successful-run/encounter/credit-spend damage paths, with unchanged real counters/cards. Retain independent-of-breach-replacement and own-server exemptions. Update the hook documentation and inspect every consumer/card that uses the successful-run damage contract.

## Evidence limits

Event Horizon's finite rerun model intentionally assumes ordinary reruns with the current rig and does not simulate intervening installs/draws. This is documented existing architecture, not a claim of optimal strategy. Sampled public resource checks do not cover every optional forfeit or hosted-card interaction. No browser overlay or human playthrough was performed by this reviewer.

## Verification

Locally run on Node 20.19.0, all passing:

- `node tests/vantagepoint-integration.test.js`
- `node tests/vantagepoint-batch11-engine.test.js`
- `node tests/vantagepoint-batch12.test.js`
- `node tests/vantagepoint-batch13.test.js`
- `node documentation/new-sets/reviews/probes/vantagepoint-batches-10-13.js`

The coordinator ran `node tests/run-all-tests.js` on this immutable production snapshot: all 50 files passed, including Corp decision fixtures and decision snapshots, excluding known-red pending reproductions. Shared syntax/integration/format/deck verification also passed; see [set review](vantagepoint-set-review.md) for the exact commands and results. A green suite is not evidence that the set is free of independently demonstrated defects.

# Vantage Point batch 13 review

**Verdict: Pass for the sampled batch strategic/rules audit.** Exact IDs: `36061–36066`; original queue status Complete. This does not establish set-wide readiness: the set report retains other batch defects and manual/integration evidence limits.

Date: 2026-10-06. Reviewer: independent Codex reviewer `/root/review_batches_10_13`.
Reviewed commit: `45833a14c83fef2f9ce71506d344460181445021` (Node `v20.19.0`, matching `.nvmrc`).
At review start the tracker, operator guide and backlog had documentation edits; the set-review skill and history were untracked. Other reviewers wrote disjoint review artifacts concurrently. Production and existing test files were not edited. Review artifacts were recovered to the isolated `/private/tmp/chiriboga-vantagepoint-set-review` worktree after the main checkout changed branch; all further review work used that isolated snapshot. [SHA-256 manifest](probes/vantagepoint-batches-10-13.sha256.txt) identifies reviewed definitions, consumers, documentation, metadata, tests and the preserved probe.

Scope: current definitions, printed metadata, rules/timing/cleanup and both sides' relevant strategic consumers. Implementation notes were treated as claims. This is sampled contrasting decision evidence, not exhaustive combinations or browser playthroughs.

## Per-card evidence

| ID / card | Role and actual consumers | Contrasting evidence and outcome | Verdict |
|---|---|---|---|
| 36061 Myōshu | Expiring point purchase; `AIImmediateWin`, actual main-phase command/card selection and ordinary reserve-aware opportunity play. | Actual selector spends final ten credits for immediate win; buys nonwinning points in eligible window when reserves allow; declines same-turn installed score, expired window, insufficient credits and committed unrezzed defense reserve. Score-area resolution yields two points. | Pass. |
| 36062 Reanimation Protocol | Discounted defensive recursion; actual main command/card/target selection, `_choices` resource enumeration and preferred current protection server. | Real selector recurs stopping archived ICE for exposed HQ and consumes the chosen target/server; declines cheaper stopping HQ install. Combined install/rez discount callbacks charge one install credit against ten and leave nine for rez; insufficient funds omitted, mandatory rez noncancelable and non-Liability publicity conditional. Additional-forfeit choices are checked in code. | Pass in sampled selection/cost/continuation states. Full installation UI is headless scaffolding, not browser evidence. |
| 36063 Vulture Fund | Seven-net-credit burst with publicity downside; actual main economy selector and card execution. | Real selector chooses funded Vulture, observes seven initial-credit requirement, and prefers available clean Hedge Fund. Resolution adds fourteen after cost and triggers publicity. Main tactics still precede economy. | Pass in sampled economy alternatives. |
| 36064 Flagship | Central multi-access and successful-run suppression; actual upgrade placement/rez selectors, access enumeration, Corp public threat and Runner multi-access consumers. | Real selectors rez against public HQ multi-access and decline unaffordable case; active/inactive public threat and Runner extra-access values differ. Access limits include root cards, exclude itself, survive access-trash and clear at cleanup; blanked/unrezzed effects inactive. Installation forbids Archives/remotes. | Pass in sampled legal/access and public planning states. |
| 36065 Shackleton Grid | Once-per-turn outside-credit punishment; actual source-aware payments, Corp damage/rez/install selectors and opposing public security/Runner RC. | Real payment can use pool to avoid punishment or outside source to pay actual damage response. Same-board opposing planners contrast ordinary pool route with mandatory restricted stealth, lethal/survivable damage, consumed provider counters, funded hidden ICE, public one-shot Crash Space, finite repeated defenses and spare click preparation; guards throw on hidden Grip identities and snapshots show no board/cache mutation. Actual selectors hold unaffordable/used/empty-source rez and place Region behind useful paid defense, respecting Region exclusion. | Pass; particularly strong current consumer evidence. |
| 36066 Let Them Dream | Agenda staging/rescue and owner-sensitive points; actual Corp search/card/destination selector, `AgendaPointsForCard`, central breach loss model. | Real selector tutors fast winning agenda to HQ with staging click, hides slower flooded-HQ agenda without click, rescues exposed Archives to bottom; declines useless search. HQ/Archives must find agenda when present, only R&D failed search shuffles. Moving same object between score areas changes 1/2 points without mutating printed metadata; breach-loss probability respects the Runner's one-point value. | Pass. |

## Independent assessment

The repaired restricted-payment path is not supported only by hook return assertions. Current tests drive opposing planner consumers on the same board and demonstrate scarcity, prevention exhaustion, finite stop traversal and information-boundary safety. Existing clean-economy and ordinary-breaker alternatives are included. No necessary unconnected batch-13 consumer or reproducible bad strategic choice was found in the examined states.

The probe did not introduce production title cases or calibrated constants. Existing test simplifications (rendering, phase progression, move/trash callbacks) are explicitly headless mechanics scaffolding; they do not replace the reviewed strategy consumers. The set's shared pool-loss defect can affect Vulture/Reanimation's resulting bad-publicity funding and other printed credit-loss interactions: that engine-wide repair must revalidate this passing report against changed hashes/consumers.

## Evidence limits and revalidation

This Pass applies to the manifest snapshot and sampled states, not every possible combination. Reanimation's complete human installation flow, optional forfeit UI and subroutine overlays were not browser-tested here. These manual set-wide checks remain with the coordinator. A subsequent payment, access, installed-card activity, owner-points or security-consumer change invalidates automatic reuse of this report and requires targeted revalidation. In particular re-run opposing funding/prevention/finite-route tests after fixing the set-wide bad-publicity pool abstraction.

## Verification

Locally run on Node 20.19.0, all passing:

- `node tests/vantagepoint-integration.test.js`
- `node tests/vantagepoint-batch11-engine.test.js`
- `node tests/vantagepoint-batch12.test.js`
- `node tests/vantagepoint-batch13.test.js`
- `node documentation/new-sets/reviews/probes/vantagepoint-batches-10-13.js`

The coordinator ran `node tests/run-all-tests.js` on this immutable production snapshot: all 50 files passed, including Corp decision fixtures and decision snapshots, excluding known-red pending reproductions. Shared syntax/integration/format/deck verification also passed; see [set review](vantagepoint-set-review.md) for the exact commands and results. A green suite is not evidence that the set is free of independently demonstrated defects.

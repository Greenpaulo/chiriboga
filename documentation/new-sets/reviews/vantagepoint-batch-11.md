# Vantage Point batch 11 review

**Verdict: Changes required.** Exact IDs: `36051–36055`; original queue status Complete.

Date: 2026-10-06. Reviewer: independent Codex reviewer `/root/review_batches_10_13`.
Reviewed commit: `45833a14c83fef2f9ce71506d344460181445021` (Node `v20.19.0`, matching `.nvmrc`).
At review start the tracker, operator guide and backlog had documentation edits; the set-review skill and history were untracked. Other reviewers wrote disjoint review artifacts concurrently. Production and existing test files were not edited. Review artifacts were recovered to the isolated `/private/tmp/chiriboga-vantagepoint-set-review` worktree after the main checkout changed branch; all further review work used that isolated snapshot. [SHA-256 manifest](probes/vantagepoint-batches-10-13.sha256.txt) identifies reviewed definitions, consumers, documentation, metadata, tests and the preserved probe.

Scope: current definitions, printed metadata, rules/timing/cleanup and both sides' relevant strategic consumers. Implementation notes were treated as claims. This is sampled contrasting decision evidence, not exhaustive combinations or browser playthroughs.

## Per-card evidence

| ID / card | Role and actual consumers | Contrasting evidence and outcome | Verdict |
|---|---|---|---|
| 36051 Lethe | Returning rig threat plus recursion; Runner full-break/bypass tag effects in RC `Directions`; Corp `_bestTrashOption` target preference. | Integration checks own/other break, last-break guard, resets, recursion top/bottom and legal target return. Shared engine test exercises full break, partial break, prior actual break, already-used encounter, bypass and no double charge; real Bypass waits for responses before encounter-end. Independent real Corp selectors put a non-agenda on top, bury an agenda, decline empty Archives, and choose Mayfly versus Crash Space according to public compatible-ICE threats; empty rig creates no return choice. | Supported in sampled actual recursion/return selectors and route consumers; shared route tests also contain a simplified ICE model. |
| 36052 Paywall | Cheap pool drain plus payment/ETR; encounter response, RC encounter effects and live cached-route preference. | Integration checks loss at zero, payment availability and choices. Independent set probe demonstrates runtime bad-publicity loss differs from the printed pool loss and RC prediction. | Changes required: shared credit-loss defect, detailed in set report. |
| 36053 Flood the Market | Two-click fast advancement scaling with protected occupied remotes; `_potentialAdvancementDirections` and `_potentialAdvancement`. | Actual advancement search selects three counters at 3 credits/2 clicks; rejects 1 click and 2 credits; already-paid resolving operation does not pay twice. Integration verifies target filtering/counts and preferred target. | Supported in sampled actual planning paths. |
| 36054 Scapegoat | Runner-selected publicity removal or Corp-selected rig shuffle; actual Runner/Corp option preferences. | Existing tests compare high printed cost with cheap targets. Independent real Runner selector sacrifices its only Mayfly, while actual RC proves the alternative preserves a funded winning breach. | Changes required: printed install cost overrides critical rig value. |
| 36055 Hype Machine | Discounted one-shot advancement; installed upgrade planning, generic rez command/card selectors. | Real search tests discount versus six-credit rez, paid/unpaid costs, same-server restrictions, consumed once, inactive/disabled and read-only state. Real command/card selectors bank free rez at EOT/post-action; decline gratuitous paid rez, already-rezzed and no-window cases. | Supported in sampled resource/timing and planning paths. |

## Supported defect: 36054 sacrifices a critical cheap breaker

Location: `sets/vantagepoint.js:4468–4476` (Runner inline mode preference). Probe: [preserved review probe](probes/vantagepoint-batches-10-13.js), Scapegoat section.

State: Corp has two bad publicity; Runner has five ordinary credits, its sole installed Mayfly (printed install cost 1), no replacement breaker in Grip/Stack, five agenda points, and an imminent fully advanced faceup Sacrifice Zone Expansion behind rezzed Palisade in a remote. Scapegoat resolves during the Corp turn. The actual Runner `_computeChoice` consumes the inline preference and chooses shuffle, giving the Corp the right to shuffle its sole installed card, Mayfly.

The alternative removes the two bad publicity but preserves the breaker. The actual RC finds a complete funded route through the remote Palisade (three pumps and one break, within five ordinary credits); after removing Mayfly it finds no complete route even with the two bad-publicity credits. The printed cheap install cost therefore disguises the only answer to an immediately scoreable winning target.

Expected: preserve the breaker when removal makes the urgent winning breach impossible and removing publicity still funds it. Impact: a strategically dominant alternative is rejected, violating tactical safety. Acceptance: value current public installed-card roles and affected route access rather than only maximum printed install cost; exercise the real mode selector, Corp threat target, useful publicity-preservation state, no-target state and a scarce-funded-route comparison. Do not fit a Mayfly title special case.

## Supported defect: 36052 loses bad-publicity credits instead of pool credits

The coordinator's full-engine Paywall/Aircheck cross-batch probe and primary rules citation are in [set review](vantagepoint-set-review.md). Paywall calls `LoseCredits(runner, 1)` at `sets/vantagepoint.js:4374`; `mechanics.js` currently consumes temporary bad-publicity credits before the pool. RC's `loseCredits` models ordinary pool loss. Thus the implementation notes' claim that Paywall loses main-pool credits is false in funded runs. Re-review Paywall payment affordability after repairing the shared loss and pool abstractions; do not repair only this card.

## Evidence limits

Lethe's optional choices now have independent real-consumer contrasts in the preserved probe in addition to mechanics/simplified RC branch assertions. The target ranking is the existing shared heuristic based on public install investment, counters and compatible ICE; this review does not claim optimal valuation for every run state. Flood/Hype planner probes are actual search consumers with headless legality scaffolding; they establish budget/one-shot behavior but do not claim browser playthroughs. The full-engine credit-loss reproduction is [the coordinator's bad-publicity fund probe](probes/vantagepoint-bad-publicity-fund.js).

## Verification

Locally run on Node 20.19.0, all passing:

- `node tests/vantagepoint-integration.test.js`
- `node tests/vantagepoint-batch11-engine.test.js`
- `node tests/vantagepoint-batch12.test.js`
- `node tests/vantagepoint-batch13.test.js`
- `node documentation/new-sets/reviews/probes/vantagepoint-batches-10-13.js`

The coordinator ran `node tests/run-all-tests.js` on this immutable production snapshot: all 50 files passed, including Corp decision fixtures and decision snapshots, excluding known-red pending reproductions. Shared syntax/integration/format/deck verification also passed; see [set review](vantagepoint-set-review.md) for the exact commands and results. A green suite is not evidence that the set is free of independently demonstrated defects.

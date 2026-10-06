# Vantage Point batch 10 review

**Verdict: Changes required.** Exact IDs: `36046–36050`; original queue status Complete.

Date: 2026-10-06. Reviewer: independent Codex reviewer `/root/review_batches_10_13`.
Reviewed commit: `45833a14c83fef2f9ce71506d344460181445021` (Node `v20.19.0`, matching `.nvmrc`).
At review start the tracker, operator guide and backlog had documentation edits; the set-review skill and history were untracked. Other reviewers wrote disjoint review artifacts concurrently. Production and existing test files were not edited. Review artifacts were recovered to the isolated `/private/tmp/chiriboga-vantagepoint-set-review` worktree after the main checkout changed branch; all further review work used that isolated snapshot. [SHA-256 manifest](probes/vantagepoint-batches-10-13.sha256.txt) identifies reviewed definitions, consumers, documentation, metadata, tests and the preserved probe.

Scope: current definitions, printed metadata, rules/timing/cleanup and both sides' relevant strategic consumers. Implementation notes were treated as claims. This is sampled contrasting decision evidence, not exhaustive combinations or browser playthroughs.

## Per-card evidence

| ID / card | Role and actual consumers | Contrasting evidence and outcome | Verdict |
|---|---|---|---|
| 36046 Editorial Division | Bad-publicity tutor; response enumeration calls real `_bestNonAgendaTutorOption`, then Corp option selection. | Preserved probe selects an affordable Vulture Fund over unusable Archives recursion; one-card R&D declines. Integration checks subtype/agenda exclusion, once-per-turn guard, both resets, reveal/move and shuffle/continuation. Only deck membership, public resources and Corp-owned information used. | Supported in sampled tutor states. Duplicate targets and a tutor competing with an urgent score still lack independent scenarios. |
| 36047 Witch Hunt | Ordinary agenda install/advance/score valuation; mandatory score/steal bad publicity and delayed tags. | Integration verifies own score versus other agenda score, stealing, removing existing tags then giving three, and turn reset. Independent actual main-phase selector advances its protected three-counter Witch Hunt for an immediate win ahead of gaining a credit; actual engine score enumeration and Corp selector score at four counters. Unfunded advance is absent from the legal menu. | Supported in sampled mandatory timing, winning scoring and resource states. |
| 36048 Magistrate Revontulet | Ongoing additional steal cost and score credit loss; placement hook protects a non-scoring remote. | Integration checks 3-credit modifier, uniqueness, nonnegative score loss and remote choice. Independent real `CorpAI.Choice` skips an affordable useful rez in EOT, post-action and final R&D movement. | Changes required: missing rez consumer. |
| 36049 Nihilo Agent | Timed tag/publicity source, power-limited three cycles; placement and discard-end rez. | Independent real command/card selection chooses its legal Corp 3.2 rez, prioritizes a useful Luana economy rez with only one credit at Runner EOT, and cannot rez Nihilo after that credit is exhausted. Integration checks rez-specific three counters, tag/publicity removal, discard tag then publicity responses before counter removal and final trash. | Supported in sampled activation, competing economy and scarce-credit states. |
| 36050 Grubber | Two paid ETR barriers; `AIImplementIce` feeds RC, and real Runner selection consumes its calculated path. | Independent complete six-credit route pays; calculated incomplete zero-credit route selects the sole ETR option. Integration verifies central-only rez publicity and unavailable payment menu. | Supported in sampled routes; fresh bad-publicity-loss rules are tracked in the set report. |

## Supported defect: 36048 has no useful rez policy

Location: `sets/vantagepoint.js:4090`, `ai_corp.js:5183`, `ai_corp.js:5210`, `ai_corp.js:5256`, `ai_corp.js:5313`, `ai_corp.js:7097`.

Reproduction: the preserved probe installs an unrezzed Magistrate in HQ's root, with the Corp on 15 credits. It calls the actual Corp command selector with legal `['rez', 'n']` options at Runner EOT, post-action, and final movement toward R&D. In the last state a zero-credit Runner on five points can steal a two-point R&D agenda if Magistrate remains unrezzed. All three decisions choose `n`.

Expected: select and fund the two-credit rez when its public additional steal cost prevents a game-losing steal; allow justified declines when unaffordable or strategically unhelpful. Its cost modifier is global, so the card need not be in the attacked server.

Cause: Magistrate declares installation hooks only. The generic opportunistic rez selector requires `AIRezWhenCan`; approaching/movement consumers require `RezUsability`/`AIWouldTrigger`; the EOT/post-action lists omit Magistrate. Installing it does not establish an execution path for either printed effect.

Impact: the Corp can install and protect an asset it never activates, including foregoing an immediate defensive save. Acceptance: add a documented card-agnostic timing/valuation hook through actual legal command and card selectors, including the above off-server saving state, no-credit decline, and a competing rez budget. Re-review placement and post-score income denial as well.

## Evidence limits

Witch Hunt's mandatory delayed tags use ordinary agenda strategy within the existing architecture; the review exercises the immediate winning scoring alternative and legal funding, without claiming optimal long-term tag-combo planning. Nihilo's competing economy rez is exercised through the real generic selector. These are current consumer evidence alongside the mandatory-effect assertions. No hidden opponent identities were inspected in the preserved probes.

## Verification

Locally run on Node 20.19.0, all passing:

- `node tests/vantagepoint-integration.test.js`
- `node tests/vantagepoint-batch11-engine.test.js`
- `node tests/vantagepoint-batch12.test.js`
- `node tests/vantagepoint-batch13.test.js`
- `node documentation/new-sets/reviews/probes/vantagepoint-batches-10-13.js`

The coordinator ran `node tests/run-all-tests.js` on this immutable production snapshot: all 50 files passed, including Corp decision fixtures and decision snapshots, excluding known-red pending reproductions. Shared syntax/integration/format/deck verification also passed; see [set review](vantagepoint-set-review.md) for the exact commands and results. A green suite is not evidence that the set is free of independently demonstrated defects.

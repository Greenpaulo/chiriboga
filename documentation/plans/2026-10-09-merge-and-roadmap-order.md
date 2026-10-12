# Merge and roadmap order (2026-10-09)

A working plan for the branches open on 2026-10-09 and the Corp AI install
track that follows. It is a snapshot: once these branches merge, trust
`node scripts/roadmap.js next` and the roadmaps over this file.

## 1. Merge order

Status reconciled against GitHub on 2026-10-11 and updated from the owner’s
confirmation on 2026-10-12: PRs #40 and #42 are merged and L9.0 is done.
Rows marked merged are complete; the remaining PR is #43, targeting `main`.
The original ordering is retained below for context. Do not merge
`scratch/l7-1-failure-analysis`.

| # | Branch | Commit | What it is | Before merging |
|---|---|---|---|---|
| 1 | `bug/agenda-bluff-probability-tracks-runner-grip-size` | `40eec12` | Removes the Grip-size term from bluff probability | Merged (PR #35); bug ticket moved to done |
| 2 | `roadmap/D3-close-runner-information-leaks` | `197f1c2` | Runner AI information-boundary fixes | Merged (PR #36); D3 ticket moved to done |
| 3 | `roadmap/feature-layer-7-1-consequence-calibration` | `840a19e` | L7.1: gate failed, option removed; keeps `_breachConsequence()`, hook fixes, collectors. Also moves F3 to done | Merged (PR #37); L7.1 ticket moved to done (failed option removed) |
| 4 | `roadmap/L7.1.1-failure-analysis` | `19d76e4` | Why L7.1 failed; I2 spec updated with the lesson; L7.1.1 parked (doc only). Based on #3 | Merged (PR #39); L7.1.1 remains parked |
| 5 | `roadmap/I0-baseline-capture-and-telemetry` | `eddf683` | I0: install telemetry, collectors, F4 baseline | Merged (PR #34); I0 ticket moved to done |
| 6 | `roadmap/I1-unified-install-candidate-model` | `2db37e7` | I1: install candidate records, no choice changes. Based on #5 | Merged (PR #38); I1 ticket moved to done |
| 7 | `roadmap/L9.0-lockout-honesty-spec` | PR #40 | L9.0, L9.0.1 and L9.1 specs; I2 depends on L9.0 and L9.1; CodeRabbit fix to L9.0.1 scenario 1 (doc only) | Merged (PR #40); spec changes also included in #42 |
| 7a | `roadmap/L9.0-lockout-honesty` | PR #42 | L9.0 implemented (observation only, done). Contains #5 and #7 | Merged (PR #42); L9.0 is done |
| 8 | `roadmap/feature-layer-8-4-bounded-posture-epochs` | `aaa8f65` | L8.4 `postureEpochs` option, default on | Ready to merge (PR #43), targeting `main`: code review passed per owner; revised full gate passed; ticket moved to done. Correlation 0.229 ≤ baseline 0.329; all performance guards and epoch hard checks passed |
| 9 | `docs/merge-and-roadmap-order` | — | This file | Merged (PR #41) |

The merged Scrounge fix (PR #32) also still had its ticket in code-review;
it has now been moved to done. All six ticket moves used
`node scripts/ticket.js move <ticket> done`, updating roadmap links and
removing cleared generated blockers. L7.1 is complete with its failed option
removed, not adopted. L9.0 is done following the merge of PR #42.

**L8.4 update (2026-10-12).** The owner confirmed code review passed. The
1,400-paired-game run changed 320 games, with no failed games. L8.4's approved
correlation requirement is measured candidate no worse than measured baseline,
replacing its absolute ceiling: 0.229 [0.163, 0.307] versus
0.329 [0.253, 0.413], PASS. Both epoch hard checks were zero and all three
performance guards passed. `postureEpochs` now defaults to on; an explicit
`false` retains lifetime caching. The ticket is in
`documentation/backlog/done/feature-layer-8-4-bounded-posture-epochs.md`.
PR #43 still needs merging; this update does not record it as merged.
Absolute deception thresholds and their consistency across L8.2/L8.5/I9 remain
separate roadmap work involving ICE allocation (I2) and remote roles (I3).

**Line endings.** `ai_corp.js` mixes CRLF and LF. Before committing a change
to it, compare `git diff --stat` with `git diff --ignore-cr-at-eol --stat`;
they must match.

## 2. What the 2026-10-09 findings changed

- **L7.1 failed for a different reason than expected.** The weighting raised
  HQ's protection score, and that score is also the bar a remote must clear to
  count as a scoring server, so the Corp scored in remotes less and the Runner
  stole more from R&D late. Weighting only the ICE-target ranking was neutral.
  Details: the "Failure analysis" section of
  `documentation/corp-ai/specs/L7.1.1-horizon-aware-central-consequence.md`
  (branch #4).
- **L7.1.1's horizon idea is not supported** by that evidence; it is parked
  (branch #4). I2's spec and the install design note now keep
  `consequenceWeight` inside I2's ranking, with HQ and R&D unweighted.
- **The security evaluator is sound but over-reports lockouts.** Provisional
  figures suggest about nine in ten "secure" verdicts mean only "no matching
  breaker is installed yet", and bioroid click-breaks are not modelled.
  Provisional breach rates were 8% for servers judged secure (insecure: 23%).
  The evaluation artefact, code revision and sample-selection method for these
  figures are not recorded here; verify them before relying on the figures for
  roadmap sequencing. I2 would mostly be measuring these false lockouts, so
  L9.0 comes first.

## 3. Roadmap order after the merges

| Step | Item | Gate | Why this order |
|---|---|---|---|
| 1 | ~~Update the I2 spec with the L7.1 findings; park L7.1.1~~ | Doc only | Merged in PR #39; L7.1.1 remains parked |
| 2 | ~~L9.0 Lockout honesty~~ — done (PR #42 merged) | None (observation only) | Adds an honest verdict next to today's, plus the `securityCalibration` collector. No decision changes. Supplies I2's honest fields; L9.1 is also required |
| 3 | **L9.1** Unpriceable breakers (L9 limit 1) | None | Required before I2: an installed matching breaker with an unknown price must not create false lockout or break-cost values. Split L9's priority slice into its own item |
| 4 | **I2** ICE selection by marginal security | F4 | Depends on I1, F2, F4, L7.1, L9.0, L9.1. Reads the honest fields behind its own option |
| 5 | **L9.0.1** Adopt honest lockout | F4 | Lets existing scoring, rez and protection decisions use the honest verdict. Can run in parallel with I2; gate them separately |
| 6 | I3 onward | Per spec | Root suitability, agenda commitment, assets, upgrades, then the short-horizon planner |

I2 depends on L9.1 in both the roadmap and its spec (included in PR #42). L9.0's
honest fields alone do not correct unpriceable installed breakers; I2 must
wait for L9.1's correction before scoring candidates.

Not yet an item: the evaluator's Runner credit ceiling appears too low
(provisional: 19 of 115 sampled breaches of "secure" servers). The evaluation
artefact, code revision and sample-selection method for this count are not
recorded here. Verify the count and confirm the cause before raising an item.

## 4. Other open decisions

- Vantage Point stays out of the F4 deck pool until its set review passes
  (PR #28).
- After these branches merge: one PR to normalise `ai_corp.js` line endings and
  add `.gitattributes`.
- Prune the stale `bisect-*`, `bench-*`, tmp and agent worktrees (about 50).
  The worktrees for this session's branches are detached, so they no longer
  block `git checkout`.

## 5. Next: L9.1 with the Sang Kancil and Principia bug

Not started. Do them together on one branch: in the playable sets, Sang Kancil
and Principia are the only breakers the evaluator cannot price, so fixing
them first makes L9.1's snapshot deltas easy to attribute.

1. Branch from `main`: PR #42 has merged and L9.0 is done, satisfying
   L9.1’s L9.0 dependency.
2. Bug first: `documentation/bugs/sang-kancil-and-principia-priced-as-unbreakable.md`
   (implement-ticket). Write its pending reproduction, then give both cards a
   real `AIImplementBreaker` and delete the dead `AIImplementIcebreaker` (and its
   `LEGACY_UNDOCUMENTED` entry). Check printed install cost and strength against
   card data; the comment headers disagree with the objects.
3. Then L9.1: re-ground and raise (`node scripts/roadmap.js raise L9.1`), then
   implement-ticket. Spec: `documentation/corp-ai/specs/L9.1-unpriceable-breakers.md`.
   Its Current behaviour item 4 notes that L9.0's honest path has the same gap:
   an unpriced matching breaker yields `honestLockout`.
4. Reuse L9.0's hook: `AIBreakCost` (`documentation/ai.md` §5.3) is read on ICE
   today; L9.1 extends it to Runner breakers. Do not add a second hook.
5. Line endings: editing tools may rewrite `ai_corp.js` to LF. Check that
   `git diff --stat` matches `git diff --ignore-cr-at-eol --stat` after every
   edit.
6. Known gap left open by L9.0: Bumi 1.0 has no Runner-side
   `AIImplementBreaker`, so the Runner AI cannot click-break it. Recorded in the
   L9.0 ticket; not part of L9.1.

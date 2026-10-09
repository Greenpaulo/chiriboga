# Merge and roadmap order (2026-10-09)

A working plan for the branches open on 2026-10-09 and the Corp AI install
track that follows. It is a snapshot: once these branches merge, trust
`node scripts/roadmap.js next` and the roadmaps over this file.

## 1. Merge order

All branches are local commits; none is merged into `main`. Push and open a
PR for each in this order. Do not merge `scratch/l7-1-failure-analysis`.

| # | Branch | Commit | What it is | Before merging |
|---|---|---|---|---|
| 1 | `bug/agenda-bluff-probability-tracks-runner-grip-size` | `40eec12` | Removes the Grip-size term from bluff probability | Already pushed |
| 2 | `roadmap/D3-close-runner-information-leaks` | `197f1c2` | Runner AI information-boundary fixes | Already pushed |
| 3 | `roadmap/feature-layer-7-1-consequence-calibration` | `840a19e` | L7.1: gate failed, option removed; keeps `_breachConsequence()`, hook fixes, collectors. Also moves F3 to done | — |
| 4 | `roadmap/L7.1.1-failure-analysis` | `19d76e4` | Why L7.1 failed; I2 spec updated with the lesson; L7.1.1 parked (doc only). Based on #3 | Merge after #3 |
| 5 | `roadmap/I0-baseline-capture-and-telemetry` | `eddf683` | I0: install telemetry, collectors, F4 baseline | Expect `ai_corp.js` conflicts with #3 |
| 6 | `roadmap/I1-unified-install-candidate-model` | `2db37e7` | I1: install candidate records, no choice changes. Based on #5 | Rebase onto `main` after #5 merges |
| 7 | `roadmap/L9.0-lockout-honesty-spec` | `ec24d09` | L9.0 and L9.0.1 specs; I2 now depends on L9.0 (doc only) | Small conflicts with #4 and #6 in `roadmap.md` and the I2 spec's header |
| 8 | `roadmap/feature-layer-8-4-bounded-posture-epochs` | `aaa8f65` | L8.4 `postureEpochs` option, default off | Run its full F4 gate after #1 merges. The `--quick` run failed the bluff-correlation ceiling (0.342 vs 0.10), which is driven by ICE count; the ceiling may need revisiting |
| 9 | `docs/merge-and-roadmap-order` | — | This file | Any time |

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
- **The security evaluator is sound but over-reports lockouts.** About nine in
  ten "secure" verdicts mean only "no matching breaker is installed yet", and
  bioroid click-breaks are not modelled. Servers judged secure were still
  breached 8% of the time (insecure: 23%). I2 would mostly be measuring these
  false lockouts, so L9.0 comes first.

## 3. Roadmap order after the merges

| Step | Item | Gate | Why this order |
|---|---|---|---|
| 1 | ~~Update the I2 spec with the L7.1 findings; park L7.1.1~~ | Doc only | Done on branch #4 |
| 2 | **L9.0** Lockout honesty | None (observation only) | Adds an honest verdict next to today's, plus the `securityCalibration` collector. No decision changes. Unblocks I2 |
| 3 | **L9.1** Unpriceable breakers (L9 limit 1) | None | Optional before I2: Sang Kancil and Principia are the same kind of false lockout. Split L9's priority slice into its own item |
| 4 | **I2** ICE selection by marginal security | F4 | Depends on I1, F2, F4, L7.1, L9.0. Reads the honest fields behind its own option |
| 5 | **L9.0.1** Adopt honest lockout | F4 | Lets existing scoring, rez and protection decisions use the honest verdict. Can run in parallel with I2; gate them separately |
| 6 | I3 onward | Per spec | Root suitability, agenda commitment, assets, upgrades, then the short-horizon planner |

Not yet an item: the evaluator's Runner credit ceiling appears too low (19 of
115 sampled breaches of "secure" servers). Confirm the cause before raising
one.

## 4. Other open decisions

- Vantage Point stays out of the F4 deck pool until its set review passes
  (PR #28).
- After these branches merge: one PR to normalise `ai_corp.js` line endings and
  add `.gitattributes`.
- Prune the stale `bisect-*`, `bench-*`, tmp and agent worktrees (about 50).
  The worktrees for this session's branches are detached, so they no longer
  block `git checkout`.

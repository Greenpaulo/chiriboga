# Retrospective validation of the pre-gating AI stack

This runbook is for the one-time validation of AI work that was written before
the project required "plays better" changes to ship behind default-off options.
Follow it only after Corp roadmap item **F4** (the seeded batch harness) is
`done`. The project owner runs the long seeded-game commands in a terminal;
the agent prepares those commands, checks the reports and records the result.

This is a **legacy aggregate audit**, not retroactive proof that every commit
helped. Normal gates compare one option off and on in the same revision. These
comparisons cross historical revisions, so a pass accepts a bundle and a fail
identifies a range that needs investigation.

## State to preserve

Do not move `main`, `23Sept-fixes` or `24Sept-fixes` forward until their next
behavior-bearing layer has been accepted. Finish F4 from the consolidated
`25Sept-fixes` tip. Tags, rather than movable branch names, are the permanent
experimental references.

The intended endpoints at the time this plan was written are:

| ID | Ref to preserve | Commit | Purpose |
|---|---|---|---|
| H0 | `legacy-baseline-initial` | `625b008ccfc0113d29a2d358d3a40e2377699bd7` | First working imported version (`initial commit`) |
| H1 | `legacy-stack-main` | `6281d7e3382e4aa503f42bcef07b6513ccbfa3b1` | Last current `main` commit |
| H2 | `legacy-stack-23sept` | `1361c37c4c85e5dc01bb0d24d5c8a3d14c8ce803` | `23Sept-fixes` tip |
| H3 | `legacy-stack-24sept` | `f8aa2a5b4cf6722ac0d080af12302bb2bfbc07c4` | `24Sept-fixes` tip |
| H4 | `legacy-stack-25sept` | `94fa67af5def9ad37acfd8fb3984b8ebc27476fe` | Original `25Sept-fixes` tip; tag already created |
| H5 | `legacy-stack-final-pre-f4` | `f2db971387c1c9c301cfd89ff49860deab643483` | Consolidated tip after the 28 September stack, D2, Tailgate and the default-off hosted-Trojan change |

H0 is the first commit on `main`'s first-parent history. The repository also
contains the separate root `97dfdfa` ("Initial clean commit"), merged later;
do not silently substitute it for H0. Before running games, the agent must
verify that H0 starts a game with the selected common decks. If it does not,
stop and ask the owner to approve the earliest compatible working commit.

Before adding further commits to `25Sept-fixes`, the owner creates and pushes
any missing tags. The agent prints the exact commands but does not move or
replace an existing tag. It verifies every tag with `git rev-parse <tag>^{}`
and records the resolved SHAs in the results.

The unfinished Windows-compatibility branch is outside this audit. It changes
repository portability and tests, not gameplay or AI policy, so it does not
create another seeded-game endpoint.

## What is compared

The behavior-bearing comparisons are run in order:

1. **A: H0 → H1** — the initial working version against the accumulated work
   on `main`.
2. **B: H1 → H2** — the 23 September AI/fix bundle.
3. **C: H2 → H3** — the 24 September card, hook and fix bundle.
4. **Z: H0 → H5** — final end-to-end health check of the whole legacy stack.

H3 → H4 and H4 → H5 are not improvement gates. They primarily contain
tooling, deterministic fixes, seeded-randomness plumbing and the gate system;
the hosted-Trojan policy in H5 defaults to off. Check these ranges with the
full regression suite, decision snapshots and their ticket-specific tests.
Run a seeded no-regression comparison only if the agent's diff audit finds an
enabled AI-policy change not explained by a deterministic correctness fix.

Comparison Z cannot rescue a failed A, B or C: improvements in a later layer
must not hide a regression in an earlier one. It is a final system-health
check after the adjacent comparisons have passed or been remediated.

## Roles

### Agent

The agent:

1. verifies F4 is `done`, reads its final CLI/help and runs the full regression
   suite;
2. resolves all endpoint tags and audits each comparison's diff, separating
   Corp policy, Runner policy, rules fixes, new cards and instrumentation;
3. prepares compatible worktrees or source directories without rewriting the
   tagged commits;
4. selects and commits a deck-pool manifest supported by both endpoints of
   each comparison;
5. writes the comparison's metrics, direction and numeric thresholds into the
   results document **before** asking the owner to run candidate games;
6. gives the owner exact copy-and-paste commands and expected output paths;
7. validates report metadata, runs F4's comparison command, investigates
   anomalies and records the evidence; and
8. recommends pass, fail or inconclusive. The owner makes the merge decision.

### Project owner

The owner:

1. approves the endpoint manifest, deck pools, metrics and thresholds before
   seeing candidate results;
2. runs the long seeded-game commands exactly as supplied;
3. returns the complete reports or their committed paths to the agent; and
4. decides whether a passing layer is merged or a failed layer is remediated.

Do not edit generated reports by hand. If a command fails, preserve its output
and let the agent diagnose it before rerunning with different arguments.

## Phase 1: make historical runs comparable

F4 is designed primarily for option-off/option-on runs from one revision.
Historical endpoints predate F4 and complete D2, so the agent must first prove
that cross-revision evaluation is sound.

1. Create a clean worktree for each endpoint. Never commit harness changes to
   an endpoint tag.
2. Use F4's supported historical-source mechanism if its completed CLI has
   one. Otherwise prepare a minimal evaluation overlay that supplies only the
   finished harness, independent random streams and telemetry.
3. Apply the same semantic instrumentation to both arms. An adapter may bridge
   renamed APIs, but must not import later decision policy, card logic or
   scoring weights into an earlier endpoint.
4. With ordinary unseeded randomness and telemetry disabled, prove that the
   overlay does not change deterministic decision fixtures or snapshots.
5. Run at least two identical seeded smoke games per deck pair and require
   matching per-game outcomes and log hashes on replay.
6. Fail every run that logs an engine error, times out or falls back from an
   AI exception. Do not count such a game as an ordinary loss.

If neutral instrumentation cannot be provided for an endpoint, stop. Record
that the comparison is infeasible and narrow it to the earliest compatible
endpoint with owner approval; do not disguise a policy backport as harness
plumbing.

## Phase 2: freeze the experiment before seeing results

For each comparison the agent creates a results section containing:

- exact baseline and candidate SHAs;
- evaluation-overlay SHA, if any;
- common deck-pool path and hash;
- paired seed range and game count;
- start fixtures and collectors;
- effective Corp and Runner options;
- primary metric, direction and improvement threshold;
- every guarded metric and numeric tolerance; and
- exact baseline, candidate and comparison commands.

Use F4's standard 200 games per common deck pair unless the predeclared gate
requires more. Use the same seeds, pool, starts and collectors in both arms,
and F4's fixed 10,000-resample bootstrap comparison. A short smoke or timing
run may validate commands, but its candidate outcomes must not be used to
choose the acceptance thresholds.

The common pool is the intersection of decks and implemented cards supported
by both endpoints. Do not load a later card definition into an older endpoint.
New cards excluded by this rule retain their deterministic card and hook tests;
the legacy comparison cannot assess them against a revision where they did not
exist.

The diff audit decides the interpretation:

- **Corp-policy-only range:** keep the Runner behavior fixed if F4's completed
  historical mode can do so safely; use a Corp outcome as the primary metric.
- **Runner-policy-only range:** keep Corp behavior fixed and orient the metric
  for the Runner.
- **Mixed range:** decompose it into logical subranges when compatible. If it
  cannot be decomposed, label it an aggregate health audit rather than proof
  that either side became stronger.
- **Rules correction:** correctness is mandatory even if it harms a win-rate
  metric. Record it as an explained delta and assess the remaining policy
  changes separately.

At minimum every run guards zero engine errors/timeouts, deterministic replay,
`gameLength` and decision latency. Outcome guards must include `winRate`,
`pointsScored` and `pointsStolen`, oriented for the side the range intended to
improve. The agent proposes numeric tolerances from the relevant historical
goals and F4 baseline variability; the owner approves them before candidate
results are generated. Do not invent or relax a threshold after seeing a
comparison.

## Phase 3: commands the owner runs

The completed F4 CLI is authoritative, so this runbook deliberately does not
guess its final flags. For each arm the agent supplies commands in this order:

1. focused deterministic checks for the endpoint and evaluation overlay;
2. a small seeded reproducibility smoke run;
3. the full baseline batch;
4. the full candidate batch; and
5. after the agent validates both reports, the F4 comparison command.

The reports must record the source SHA, overlay SHA, command line, pool hash,
seed list, starts, collectors and effective options. The agent rejects a
comparison if any paired input differs or if the number of valid games is not
the predeclared number.

After every manual batch, the owner sends the output path and terminal summary
to the agent. The agent checks the JSON rather than relying only on the summary.

## Phase 4: decisions and investigation

### Pass

A comparison passes only when its predeclared improvement condition and every
guard pass under F4's confidence-interval rule. Record all metrics, not only
the passing line. Do not merge yet if a required earlier comparison failed.

### Inconclusive

If the interval crosses zero without violating a guard, record the result as
inconclusive. Before running more games, predeclare the expanded seed range
(normally 400 games per pair total) and keep the original games in the sample.
Do not repeatedly add seeds until a preferred answer appears.

### Fail

Do not merge the failed layer into its parent branch. The agent:

1. replays representative worst-difference seeds and checks for engine or
   instrumentation errors;
2. partitions the failed commit range by logical feature batches, using tags
   or temporary refs without rewriting the preserved endpoints;
3. uses smaller seeded runs only to locate the suspect batch;
4. retrofits a default-off option, corrects or reverts the suspect policy; and
5. reruns the original full comparison unchanged to make the acceptance
   decision.

Do not remove a correct rules fix merely to improve statistics. Separate its
effect from optional AI policy and document the tradeoff.

## Phase 5: integration and permanent record

Create `documentation/legacy-ai-stack-validation-results.md` when execution
begins. It contains the frozen manifests, commands, report paths, complete
metric tables, confidence intervals, explained correctness deltas, seed-replay
notes and the owner's decision for A, B, C and Z.

Once all required adjacent comparisons pass or their failures are remediated:

1. merge the stack through its preserved order without squashing, so the
   historical commits remain inspectable;
2. run `node tests/run-all-tests.js` on the final integrated branch;
3. run comparison Z against the exact accepted H5-equivalent candidate;
4. merge the accepted stack to `main`; and
5. implement I0 to commit the ordinary current-version F4 baseline used by
   future per-option gates.

The legacy audit does not replace I0. The hosted-card rez option it
mentioned, `evidenceBasedHostedCardRez`, failed its F4 gate and was removed
(2026-10-02); its next candidate has its own ticket,
[hosted-ice-rez-ignores-repeated-tax.md](bugs/hosted-ice-rez-ignores-repeated-tax.md).

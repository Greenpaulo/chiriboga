# Corp AI regression investigation: runbook v2

Supersedes `runbook-v1.md` (v1) where they differ. Read
`response-plan.md`, [AI batch harness](../ai-batch-harness.md) and
[legacy stack validation](../legacy-ai-stack-validation.md) first.

The gated implementation and its owner-run validation are now complete on
the isolated fix branch. Read [the handoff](gated-fix-handoff.md) before
continuing: it records source commits, confirmed fidelity, single-option
effects, residual scoring loss, playtest configuration and integration order.
This investigation procedure does not authorize additional batches.

Audited 2026-10-05 against saved state, arm commits and tooling. Read the
[recovery and asset inventory](assets/README.md) before
resuming: it includes historical numbering, exact arm tags, archived tools,
F3/F6 recovery steps and evidence that still needs external backup.

## Purpose

Find where and why the Corp AI got worse than the original upstream AI (H0),
then confirm each cause by switching it off on the current code. This runbook
records the method that was actually used, so the whole investigation can be
repeated from scratch.

## Rules for the agent (override v1)

- **Never run, start or poll a batch yourself.** Write a resumable queue script
  (it skips any arm whose report already exists), give the owner ONE command,
  and stop. The owner runs it in a terminal and says when it is done.
- Do not edit files or write runbooks unless the owner asks.
- Throwaway worktrees and branches only. Never push. Never touch the owner's
  real branches. Commit before every run so reports record a clean tree.
- Report win rate in **percentage points**, not as a fraction.
- Quote only paired `--compare` intervals. Terminal summaries are unpaired.
- A game that times out (900 s) is recorded, not rerun. `--compare` drops it from
  both arms. Say how many pairs were used.
- Do not read `ai_corp.js` in full. Use `grep -n` and narrow ranges.

## What the owner measures

- Chassis: harness branch `roadmap/corp_ai_finding_12_seeded_batch_harness`,
  tip `b52d451`. Engine, Runner AI (`ai_runner.js`), pool and seeds stay
  identical in every run. Only `ai_corp.js` differs.
- Pool `beginner-v1` (hash `fe8cb821d04c9dd7`): `pd-tao`, `btl-kit`, `neh-zahya`,
  `pe-steve`, `gateway`. Seeds 1-200 per pair, 1,000 games per run, default AI
  options.
- Win rate is against one Runner AI only, and the pool has four distinct Corp
  identities. It is a proxy for strength against a human, not proof.

## Metrics and how to select intervals (replaces v1's localisation rule)

v1's frozen checkpoint selection used `pointsStolen`. The owner later directed
localization using the full outcome signature. Preserve that historical record;
for a future experiment, freeze the criteria below before generating new results.

- **Primary:** Corp win rate (percentage points) and points scored.
- **Supporting:** points stolen (total and by server: HQ, R&D, Archives,
  remote) and game length.
- Read stolen-by-server as a signature, not a score. Remote theft down with
  HQ/R&D theft up suggests agendas are being held rather than installed; traces
  or direct agenda metrics are needed to establish that mechanism.
- Remote theft rising while win rate stays flat is "plays differently", not
  necessarily a regression.
- If an interval's 95% interval includes zero, say "inconclusive", not "no
  effect". Detectable effects depend on pairing and variance; the observed
  interval widths are not a universal 2-to-4-point detection limit.

## Step 0: setup

1. Reuse/adapt the [saved helper](assets/make-arm.sh) as
   described in the recovery inventory (swap historical `ai_corp.js` onto the fixed harness tip, add only
   the missing shim parts, commit, print the diff stat). The shim parts are
   `CorpAI.DEFAULT_OPTIONS`, `this.options = Object.assign`, the `_choiceInner`
   telemetry wrapper. Preserve the file's own line endings.
2. Quick check per arm: `node scripts/ai-game.js --corp "Gateway Corp.js"
   --runner "Gateway Runner.js" --seeds 1-10 --jobs 8`. Every line needs a winner
   and an empty `errors` list. Repeat Gateway seed 1 and confirm identical
   `logHash`.
3. Keep every report in `~/bench/`. File names used so far: `orig.json` (H0),
   `current.json` (tip), `h2.json` and other checkpoint reports,
   `a2-<sha>.json` (H1..H2 commits), `causal-a-no-is-secure-gate.json`,
   `causal-b-legacy-ice-weighting.json`.

## Speed-up (F3 and F6)

- F6 is commit `806922f` (branch `roadmap/F6-cheaper-security-evaluation.md`);
  F3 is `cd95844`. They are already native in the tip and in builds from it.
- With them, 1,000 games take about 3 minutes. Without them, H1/H2/H3 took 17.3,
  33.5 and 30.8 minutes.
- Only compare arms built the same way. Reports for H0, the early arms
  (#4, #8, #12, #16, #20, #24) and H1 are unpatched. The `a2-*` arms for the H1
  to H2 commits had F3/F6 ported on.
- The accepted manual port resolved a conflict in `_securityBoardKey`; the exact
  saved patches and commit deltas are linked in the recovery inventory. H1's
  shim arm accepts the pre-seeded patch cleanly; H0 and the six selected
  H0..H1 midpoint arms do not. All H0..H1 reports stayed unpatched.
- Fidelity check from the H1..H2 port: 998 of 1,000 `logHash` values matched the
  unpatched run (differences: `btl-kit` seeds 56 and 83). Similar averages do
  not prove neutrality; disclose this limitation when comparing those arms.
- Exact patches and reconstruction commands are in
  [F3/F6 recovery recipe](assets/README.md#exact-f3f6-recovery-recipe).

## Phase A: where did it regress?

### A1. Checkpoints

Checkpoints: H0 `625b008`, H1 `6281d7e` (last `main` commit), H2 `1361c37`,
H3 `f8aa2a5`, tip `b52d451`. Compare consecutive pairs with `--compare`.

| Point | Win rate | Scored | Stolen | HQ | R&D | Archives | Remote | Turns |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| H0 | 43.3% | 4.264 | 5.675 | 2.060 | 2.058 | .010 | 1.547 | 14.8 |
| H1 | 35.9% | 3.638 | 6.029 | 1.828 | 1.943 | .028 | 2.230 | 15.0 |
| H2 | 27.7% | 2.676 | 6.157 | 2.720 | 2.438 | .143 | .856 | 16.7 |
| H3 | 26.8% | 2.580 | 6.199 | 2.703 | 2.548 | .094 | .854 | 16.4 |
| Tip | 25.3% | 2.541 | 6.238 | 2.697 | 2.658 | .112 | .771 | 16.6 |

Share of the 18.0-point win-rate loss: H0 to H1 about 41%, H1 to H2 about 46%,
H2 to tip about 13%.

H2 to tip, paired (builds differ: H2 and H3 unpatched, tip has F3/F6 natively):

| Step | Win rate | Scored | R&D theft | Remote theft |
|---|---|---|---|---|
| H2 to H3 | -0.9 pts [-3.0, +1.2] | -.096 [-.208, +.015] | +.110 [+.012, +.210] | -.002 [-.067, +.063] |
| H3 to tip | -1.5 pts [-3.5, +0.6] | -.039 [-.145, +.065] | +.110 [+.015, +.206] | -.083 [-.140, -.027] |
| H2 to tip | -2.4 pts [-4.9, +0.1] | -.135 [-.268, -.006] | +.220 [+.105, +.338] | -.085 [-.158, -.012] |

H2 to tip is a borderline loss. No per-commit bisect has been run on it.

### A2. Per-commit arms

Round 1 (H0 to H1, 28 `ai_corp.js` commits): arms at commits #4, #8, #12, #16,
#20 and #24. The commit numbering and SHAs are in `~/bench/bisect-state.md`.
The full 28-commit list and arm/tag mapping are now in the recovery inventory;
the saved state is archived alongside it.

Round 2 resolved every transition in the two late intervals (#20 to #24 and
#24 to H1). A transition whose `ai_corp.js` is identical to its neighbour needs
no run (#28 `4dfe261` equals H1).

H1 to H2 (6 commits): every commit run as an `a2-<sha>.json` arm with F3/F6
ported on.

### Results so far

**H1 to H2 is one commit, `fa1182c`** ("Addressed installing agenda into
unsecure remote issue"): win -8.7 pts [-11.7, -5.7], scored -1.069, stolen
+.257 [+.109, +.406]; HQ +.948, R&D +.394, Archives +.130, remote -1.215. Two
changes: (1) `_isAScoringServer` returns false for any remote that
`_evaluateServerSecurity` calls not secure; (2) the protection score counts ICE
without an end-the-run effect as 0.25 instead of 1.

**H0 to H1 has several discrete steps:**

| Transition | Changed games | Win rate | Scored | Remote theft |
|---|---:|---:|---:|---:|
| #20 to #21 (`5e6af68`) | 642 | -4.4 pts | -.238 | +.322 |
| #24 to #25 (`a3d57d3`) | 532 | -2.0 pts | -.164 | -.090 |
| other late transitions | | within noise | | |

Transitions #21 to #22, #23 to #24 and #25 to #26 had no behavioural change.
Early follow-ups #2/#3/#6/#7/#10 are complete. #2→#3 (`95f2c15`)
accounts for scoring -0.195 [-0.361, -0.028] and remote theft +0.244
[0.117, 0.369]; #3→#4 has zero changed hashes. #7→#8 (`752dbf0`)
accounts for scoring -0.210 [-0.397, -0.027]; #6→#7 has zero changed hashes.
#8→#10 remote theft is +0.175 [0.042, 0.311], but still spans two commits.
These are historical findings, not automatic reasons to disable the behaviours
at the tip. See [the updated comparisons and gating assessment](findings.md#updated-early-localization-and-gating-assessment-2026-10-05).

## Phase C: causal tests on the tip (new; not in v1)

v1 forbade changing Corp logic. This phase requires it, on a throwaway branch
from the tip. The aim is to confirm a suspected cause by switching it off in the
current code, paired against the unmodified tip on the same seeds.

Method:
1. Branch from `b52d451`. Make the smallest possible change that disables one
   behaviour. Commit before running.
2. Run the full pool with default options and the same seeds as `current.json`.
3. `--compare ~/bench/current.json <variant>.json`. Differences are variant minus
   tip.
4. Each sub-change test is run with the `isSecure` gate left ON, unless the test
   is specifically about the gate.
5. Effects are conditional on the rest of the policy. Do not add them together
   and expect the historical commit effect. Test combinations directly.

Results:

| Variant (disabled from the tip) | Win rate | Scored | Stolen |
|---|---|---|---|
| A: `isSecure` gate in `_isAScoringServer` | +7.6 pts [+4.8, +10.3] | +.787 | -.145 [-.274, -.010] |
| B: legacy ICE weighting | +0.7 pts [-1.1, +2.6] | +.052 | +.037 (inconclusive) |
| `serverAtRisk` install override | +2.1 pts [0.0, +4.2] | +.208 | -.094 |
| committed-agenda reserve bypass | +2.0 pts [+.1, +4.0] | +.084 | -.081 |
| empty-Archives pressure admission | +1.7 pts [-.3, +3.7] | +.181 | -.044 |
| protection-debt reset (legacy aging) | +0.7 pts [-1.2, +2.6] | +.005 | -.077 |
| **Combined: gate + all four off (`edc177a`)** | **+14.5 pts [+11.1, +17.9]** | **+1.379 [+1.194, +1.559]** | **-.471 [-.627, -.311]** |

Combined variant against H0: win rate 39.8% vs 43.3% (-3.5 pts [-7.5, +0.4],
inconclusive); scored 3.920 vs 4.264 (-.344 [-.564, -.124], still clearly lower);
remote theft +.412 [+.247, +.581] above H0; stolen 5.767 vs 5.675; turns 14.9
vs 14.8.

Gotchas:
- `pd-tao` seeds 67 (legacy debt aging) and 117 (variant B) timed out at 900 s
  and were excluded from both arms. Seed 117 was inspected as a long stalemate;
  seed 67's mechanism has not been diagnosed.
- The empty-Archives variant changes `_nothingWorthProtecting()`, which also
  feeds debt aging. It is not a pure allocation-only test. A stricter test would
  change the allocation consumer only.
- `edc177a` hard-codes removal of five conditions in `ai_corp.js`; it does not
  add options. No option-based equivalent was built or validated. A future
  equivalent must demonstrate full-pool fidelity before inheriting this result.
- Queue script: `~/bench/run-queue-gate-and-four-off.sh`.

### Early tip and combined-build ablations (complete)

Tip c1 (`fbc0121`) removes only `adjustedScore: score - debt` from
`_rankedServersToProtect`, giving scoring +0.154 [0.024, 0.282]. Combined
c1 (`c7f2069` from `edc177a`) gives +0.037 [-0.100, 0.173], inconclusive,
and remains -0.307 [-0.526, -0.091] below H0. Debt ranking is a conditional
tip gating candidate, not a demonstrated explanation of the residual gap.

The no-ICE HQ-penalty variants (`6ad9f04`, `d1b4c93`) do not demonstrate a
scoring improvement. Removing the secure bonus (`dca880c`) worsens tip scoring
-0.128 [-0.213, -0.047]; combined variant `e27dee6` is inconclusive.
Structural-penalty variant `c196adc` changes zero hashes. Do not infer a
current gating recommendation from a harmful historical boundary alone.

The existing combined control is `~/bench/causal-gate-and-four-off.json`.
All detailed metrics, timeouts, arm/report names and candidate code expressions
are in the findings section linked above. No production options were added.

## Phase D: why did it regress? (v1 Phase B)

v1's trace and collector steps are retained as written in v1 (first-divergent
decision traces on the five worst `gateway` seeds, and an agenda collector).
Neither the first-divergence helper nor the agenda collector was implemented
or run in this investigation. The mechanism (the Corp holds agendas, scores
less, games run longer, theft moves from remotes to HQ/R&D) is inferred from the
data, not shown directly.

## Known open items

- Historical #9/#11 remain unrun individually; #8→#10 remote-theft attribution remains unresolved.
- H2 to tip: a borderline -2.4 points, no per-commit bisect run.
- Combined build still scores -0.344 below H0; combined c1 leaves -0.307 [-0.526, -0.091]. The cause is unresolved, not proven distributed.
- Shipped defaults for the options (harness baseline off; play build undecided).
- Human playtesting is the only evidence for "better against a human".

## Preserving the investigation

- Merge with a normal merge commit. Do not squash or rebase, so every SHA in the
  reports stays valid. Do not delete the old branches.
- Annotated tags with prefix `corp-ai-` on H0, H1, H2, H3, tip, #4, #8, #12, #16,
  #20, #21, #24, #25, `fa1182c` and `edc177a`.
- Repository copies now live in `documentation/corp-ai-regression/assets/`.
  Documents, scripts and overlays were committed in `7b28f2a`; the
  [evidence archive](assets/evidence.tar.gz) also preserves the 142 original
  JSON/log artifacts. Keep separate backups for additional disk-only reports,
  logs and temporary artifacts. Consult the inventory for archive verification,
  local-only arm branches and tag-push guidance.

## Caveats

- Win rate depends on one Runner AI, and the pool has four distinct Corp
  identities and upstream-era decks. A flat result does not prove newer logic
  useless.
- Mid-history `ai_corp.js` files run on today's engine, not the one they shipped
  with.
- Corp latency rose (mean 1.8 to 6.8 ms), report-only.

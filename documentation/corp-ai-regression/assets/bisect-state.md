# Corp AI regression bisect state

### Preservation audit (2026-10-05)

- Verified all 15 requested targets uniquely and created annotated local tags: corp-ai-h0/h1/h2/h3/tip, corp-ai-arm-04/08/12/16/20/21/24/25/fa1182c, and corp-ai-combined-gate-and-four-off. Listed with git tag -n; nothing pushed.
- Nine arm targets plus combined target are only on local bisect branches, absent from recorded remote-tracking refs and not ancestors of b52d451. Historical endpoints and tip are ancestors of the published harness branch.
- Preserved tooling/runbook/pool/state copies under documentation/corp-ai-investigation-assets/ and added a 110-artifact checksum/metadata manifest (33 reports). These files and investigation docs remain uncommitted. Raw JSON/log evidence stays in ~/bench and requires separate backup.
- Updated v2 and cross-links, corrected original-control/replay/overlay instructions, resolved CONFIRM placeholders with verified facts or explicit unperformed work. Exact mixed-newline overlay bytes are archived in .patch.base64 files; readable .patch snapshots are normalized and must not be applied directly.
- Entry point: documentation/corp-ai-regression-bissect-v2.md and assets/README.md. No batch, push, production policy change or new investigation was run.


Updated 2026-10-04. No `ai-batch.js` process is running. The owner runs queued batches manually and tells the agent when they finish.

## Active H0→H1 localisation (Round 1)

- 2026-10-04: resumed from this state file and re-read `documentation/corp-ai-regression-bisect.md`; confirmed H1→H2 is complete and out of scope for this round.
- Requested points: commits 4, 8, 12, 16, 20 and 24 from `git rev-list --reverse 625b008..6281d7e -- ai_corp.js`.
- Resolved points: #4 `b28b7bf`, #8 `752dbf0`, #12 `5de59ce`, #16 `159a8d6`, #20 `bd9bd79`, #24 `3c59ec1` (28 commits total).
- Found the pre-seeded overlay at `~/bench/f3-f6-ai_corp-overlay.patch`; the seeded variant is not applicable to this older interval.
- Detected CPU count: 10; the new queue will pass `--jobs 10`.
- Created clean shim commits on harness chassis `b52d451`: #4 `ac4ed79`, #8 `5d05f45`, #12 `270abd9`, #16 `2121431`, #20 `d2d9160`, #24 `5988b40`. Historical-file diffs contain only the required shim (13, 12, 12, 12, 12 and 3 inserted lines respectively).
- The saved `make-arm.sh` had a macOS `sed` insertion bug; repaired its first-match addressing and CRLF-safe wrapper insertion before preparing #8 onward. #4 was completed with the same exact shim after the initial partial run; no decision logic/default/option change was made.
- F3/F6 overlay result: unpatched for all six arms. Direct `git apply --check` failed at the first hunk on every arm. A non-mutating three-way merge found 12, 14, 12, 9, 8 and 7 conflict regions respectively; the older files lack overlay prerequisites such as `_withHypothetical` and (at #4/#8) `_effectiveIceSubtypes`. This is not a bounded clean application, so no manual decision-code port was made and the hash gate was not applicable.
- Unpatched smoke validation passed on every arm: Gateway seeds 1–10 all completed with a winner and empty errors; repeated seed 1 reproduced the same `logHash` on all six arms.
- Wrote and syntax-checked the new resumable queue `~/bench/run-queue-h0h1.sh`. It uses `~/bench/beginner-pool.json`, `--games 200`, `--jobs 10`, skips any arm whose `.json` exists, waits on each attached child without polling, continues after failures, and appends the exact line `DONE <label>` to `~/bench/queue.log` after each successful report.
- Queue order: `h0h1-04-b28b7bf`, `h0h1-08-752dbf0`, `h0h1-12-5de59ce`, `h0h1-16-159a8d6`, `h0h1-20-bd9bd79`, `h0h1-24-3c59ec1`. All are unpatched; all reports were absent and worktrees clean at handoff.
- Run exactly: `bash ~/bench/run-queue-h0h1.sh`.
- Estimated runtime: about 60 minutes total on this 10-CPU machine; allow up to 90 minutes because the later unpatched historical files can be much slower.
- Status: stopped at the requested manual-run handoff; no H0→H1 batch has been run by the agent.

### Round 1 results received

- All six queued reports completed: 1,000 games, 200 seeds, pool hash `fe8cb821d04c9dd7`, zero failures, and clean-tree metadata on every arm.
- Recorded wall times: #4 156.8 s, #8 357.8 s, #12 647.6 s, #16 656.2 s, #20 821.6 s, #24 680.7 s.
- Seven adjacent comparisons completed and saved as `~/bench/compare-h0h1-*.log`.
- Classification using the full finding signature: **several discrete steps**, not one step and not a gradual slide. Remote theft rises clearly at H0→#4 (+0.240), #8→#12 (+0.185), and #20→#24 (+0.332). Scoring falls at #20→#24 (-0.214) and #24→H1 (-0.233), with a smaller earlier estimate at #4→#8 (-0.148). Win-rate loss is concentrated late: #20→#24 (-0.034) and #24→H1 (-0.029).
- Largest combined outcome gap: #20 `bd9bd79`→#24 `3c59ec1`: win -0.034 [-0.064, -0.004], scored -0.214 [-0.367, -0.060], stolen +0.281 [+0.143, +0.420], remote theft +0.332 [+0.208, +0.459]. This gap contains commits #21–#24 and is not yet a culprit attribution.
- Boundary hash check passed on #20 and #24: repeated Gateway and PD–Tao seeds 1–10 produced identical `logHash` values on both repeats; all 40 games per repeat set had winners and no errors. Both arm files differ from their historical `ai_corp.js` only by the required shim (12 lines at #20, 3 lines at #24).
- Proposed Round 2 (not queued; awaiting owner review), chosen to cover the whole multi-step signature within seven runs: #2 `7591eb4`, #6 `32c4819`, #10 `cc2777e`, #21 `5e6af68`, #22 `87243c0`, #23 `c143116`, #26 `f234aa5`.
- Owner approved continuing with Round 2.
- Round-2 arms will remain unpatched so every H0→H1 point uses the same historical decision code basis as the existing H0, Round-1 and H1 reports.
- The initially proposed seven throwaway arms were created before the owner stopped preparation: #2 `8c0d8d7`, #6 `caa66f2`, #10 `907f4c7`, #21 `56ed6e9`, #22 `a120eae`, #23 `4d7be88`, #26 `ecadeb0`. No smoke checks or batches were run and no Round-2 queue was written.
- Owner questioned the scope: #2/#6/#10 sampled earlier Round-1 steps but did not fully resolve #24→H1. Correct full-granularity coverage of the two late rows is #21/#22/#23 for #20→#24 and #25/#26/#27 for #24→H1. Commit #28 needs no separate arm because `4dfe261:ai_corp.js` is identical to `6281d7e:ai_corp.js`, already represented by H1.
- Status: stopped for owner confirmation of the corrected six-arm queue; all created throwaway arms remain in place and no batch has been run.
- Owner approved the corrected priority: run #21/#22/#23 and #25/#26/#27 first; revisit #2/#6/#10 only afterward. The earlier throwaway arms remain in place but will not be queued.
- Created clean unpatched shim arms #25 `f498fdd` and #27 `fb6b7f9`. Together with existing #21 `56ed6e9`, #22 `a120eae`, #23 `4d7be88`, and #26 `ecadeb0`, the corrected six arms are ready for smoke validation.
- Smoke validation passed on all corrected arms: Gateway seeds 1–10 completed with winners and empty errors, and repeated seed 1 reproduced the same `logHash` for each arm.
- Wrote and syntax-checked `~/bench/run-queue-h0h1-r2.sh`. It queues only #21/#22/#23/#25/#26/#27, uses the same pool with `--games 200 --jobs 10`, skips existing `.json` reports, continues after failures, and appends `DONE <label>` to `~/bench/queue.log` after success. All six reports are absent and all six worktrees are clean.
- The #2/#6/#10 throwaway arms are explicitly excluded from this queue and remain available for the later earlier-interval investigation.
- Run exactly: `bash ~/bench/run-queue-h0h1-r2.sh`.
- Estimated runtime: about 75–90 minutes on this 10-CPU machine, based on the adjacent unpatched Round-1 arms.
- Status: stopped at the manual-run handoff; no Round-2 batch has been run by the agent.

### Round 2 results received

- All six corrected reports completed with 1,000 games, 200 seeds, pool hash `fe8cb821d04c9dd7`, zero failures, and clean-tree metadata.
- Wall times: #21 861.3 s, #22 670.0 s, #23 663.0 s, #25 679.7 s, #26 706.8 s, #27 678.8 s.
- All eight individual comparisons completed; logs are `~/bench/compare-h0h1-r2-*.log`.
- #20→#24 is localized to #21 `5e6af68`: win -0.044 [-0.073, -0.015], scored -0.238 [-0.390, -0.086], stolen +0.291 [+0.154, +0.429], remote theft +0.322 [+0.199, +0.447]. #21→#22 and #23→#24 are exactly neutral (0 changed games); #22→#23 is a small improvement.
- #24→H1 is mainly #25 `a3d57d3`: scored -0.164 [-0.299, -0.035], win -0.020 [-0.047, +0.005], stolen +0.068 [-0.049, +0.185]. #25→#26 is exactly neutral; #26→#27 is negligible. #27→H1 (the #28 change) alters 970 games but has no clear pooled outcome effect: win -0.009 [-0.043, +0.025], scored -0.075 [-0.255, +0.105], stolen -0.033 [-0.185, +0.120].
- Boundary hash checks passed. #20 and #24 had already passed repeated Gateway and PD–Tao seeds 1–10; #21 and #25 now also passed the same check, with identical hashes, winners and no errors.
- Decision changes: #21 adds `serverAtRisk` as an override for further protection installs and adds an `AIScoringPlanCommitted` path that can bypass the global advancement reserve. #25 adds public/recent successful-run pressure, principally allowing valuable/repeatedly-run Archives to enter protection allocation and changing protection-debt aging.
- Proposed next round for the deferred earlier steps, not queued: #1/#2/#3 (fully resolve H0→#4), #6 (split #4→#8), and #9/#10/#11 (fully resolve #8→#12). Seven runs total; #2/#6/#10 arms already exist.
- Status: review point after Round 2; no further batch is queued.

### Current-tip causal variants requested

- Owner put the proposed H0→#12 round on hold; #1/#2/#3/#6/#9/#10/#11 are not queued.
- Requested four throwaway variants from harness tip `b52d451`, each disabling exactly one behavior: #21 `serverAtRisk` override; #21 committed-agenda advancement-reserve bypass; #25 Archives/run-pressure admission to protection allocation; #25 `_nothingWorthProtecting` protection-debt reset.
- Created four clean one-behavior commits from `b52d451`: no `serverAtRisk` final override `188a96a` (one boolean term); no committed-agenda reserve bypass `a7b3236` (one boolean term); no run-pressure admission for empty Archives `8396407` (restore unconditional exclusion after backdoor/agenda checks); legacy debt aging `ad597a0` (remove only the `_nothingWorthProtecting` reset condition).
- All four diffs pass `git diff --check` and `node --check ai_corp.js`; each changes only `ai_corp.js` and only its named condition.
- All four completed Gateway and PD–Tao seeds 1–10 with winners and no errors.
- Ran `node tests/run-all-tests.js` in every arm. Each deliberate switch triggered its directly related regression assertion (server-at-risk layer install, empty-Archives pressure eligibility, or valueless-Archives debt reset); the scoring-reserve switch changes the scoring-plan fixture path and exposes its missing `IsFaceUp` test global. Shared sibling-worktree failures concern existing agent-script/tooling and unavailable local image assets. The required Corp decision-fixture and decision-snapshot suites were included; no unrelated source change was made to chase expected causal-variant failures.
- Wrote and syntax-checked `~/bench/run-queue-h0h1-causal.sh`. It queues only the four causal arms with the same pool, `--games 200 --jobs 10`, skips existing `.json` reports, continues after failures, and appends `DONE <label>` to `~/bench/queue.log`. All reports are absent and worktrees clean.
- Run exactly: `bash ~/bench/run-queue-h0h1-causal.sh`.
- After completion, compare each report against `~/bench/current.json`; no comparison has been run yet.
- Status: stopped at the manual-run handoff; no causal batch has been run by the agent.

### Current-tip causal results (2026-10-05)

- All four report inputs match `current.json` (pool hash, seeds, starts, collectors and options). First three reports have 1,000 completed games and no failures. Legacy-debt-aging has one `pd-tao` seed-67 timeout after 900 s; comparison uses 999 common completed pairs. No batch was rerun.
- All four comparisons completed; logs: `~/bench/compare-current-h0h1-<variant>.log`. Full intervals and per-server split are recorded in `documentation/corp-ai-regression-findings.md`.
- No-server-at-risk: win +0.021 [0.000, +0.042], scored +0.208 [+0.091, +0.326], stolen -0.094 [-0.188, -0.001].
- No-scoring-reserve-bypass: win +0.020 [+0.001, +0.040], scored +0.084 [-0.005, +0.173], stolen -0.081 [-0.161, -0.001].
- No-Archives-pressure-allocation: win +0.017 [-0.003, +0.037], scored +0.181 [+0.064, +0.296], stolen -0.044 [-0.134, +0.049].
- Legacy-debt-aging (999 pairs): win +0.007 [-0.012, +0.026], scored +0.005 [-0.087, +0.094], stolen -0.077 [-0.164, +0.008].
- Isolation caveat discovered during interpretation: Archives-admission variant changes shared `_nothingWorthProtecting()`, so it also resets debt for newly excluded empty Archives under the unchanged aging rule. A strictly allocation-only follow-up must preserve the aging consumer. No new arm was created.
- Status: causal comparisons delivered; earlier H0→#12 round remains on hold, no further batch queued.

### Combined causal arm (2026-10-05)

- Confirmed all four individual ablations use `b52d451` with the scoring-server `isSecure` gate ON. First three have 1,000 completed games; debt aging has 999 completed games plus a `pd-tao` seed-67 timeout.
- No combination reports (both #21, both #25, or all four) have run.
- Prepared combined arm `edc177aa865522103d8ab5d7347065142f19a525` on `bisect-causal-gate-and-four-off`, based on `b52d451`. Removes the scoring-server security rejection, final `serverAtRisk` install override, committed-agenda advancement bypass, empty-Archives run-pressure eligibility, and valueless-server debt reset. Only `ai_corp.js` changes; options and harness stay identical.
- Combined Archives eligibility/debt treatment restores unconditional empty-Archives exclusion while retaining legacy debt accumulation; it includes both previously tested sub-changes together.
- Queue: `~/bench/run-queue-gate-and-four-off.sh`, same pool, seeds 1–200 per pair, `--games 200 --jobs 10`. Skips existing report, preserves prior logs, records DONE/FAIL, and then saves comparisons against `current.json` and `orig.json`.
- Run exactly: `bash ~/bench/run-queue-gate-and-four-off.sh`. No combined batch or comparison has been run by the agent.

### Combined causal result received (2026-10-05)

- `causal-gate-and-four-off.json` completed: SHA `edc177a`, 1,000 games, zero failures, clean tree, wall time 163.7 s. Pool/seeds/starts/collectors match both baselines; options match `current.json`. H0's options metadata has no later `evidenceBasedHostedCardRez` option, whereas current/combined keep it false, as in the original approved comparison.
- Both queued comparisons completed, 1,000 paired games each. Against tip: win +0.145 [+0.111, +0.179], scored +1.379 [+1.194, +1.559], stolen -0.471 [-0.627, -0.311], turns -1.644 [-2.084, -1.219].
- Against H0: win -0.035 [-0.075, +0.004], scored -0.344 [-0.564, -0.124], stolen +0.092 [-0.098, +0.286], turns +0.166 [-0.281, +0.597]. Remote theft +0.412 [+0.247, +0.581], HQ theft -0.304 [-0.464, -0.143].
- Recovers about 81% of win loss, 80% of scoring loss, 84% of increased theft, based on point estimates. Individual effects cannot be added or inferred from this combination; residual intervals including zero do not establish equivalence to H0.
- Full table added to `documentation/corp-ai-regression-findings.md`. Earlier H0→#12 round remains on hold. Separate both-#21 and both-#25 combinations remain untested. No further batch queued.

## Completed checkpoint localisation

- Frozen primary metric: paired `pointsStolen`, increase is worse.
- H0→H1: +0.354, 95% interval [+0.171, +0.538] — the only checkpoint interval wholly above zero.
- H1→H2: +0.128 [-0.040, +0.294].
- H2→H3: +0.042 [-0.053, +0.137].
- H3→Tip: +0.039 [-0.055, +0.133].
- Full checkpoint evidence: `~/bench/review-point-a.md`.

The frozen rule selects H0→H1 for eventual localisation. By owner direction, investigate H1→H2 first because the F6 performance overlay applies where `_evaluateServerSecurity` is complete and this interval's historical files run slowest.

## Current interval: H1→H2

- Good endpoint H1: `6281d7e`, existing report `~/bench/h1.json`.
- Bad endpoint H2: `1361c37`, existing report `~/bench/h2.json`.
- `ai_corp.js` commits in the interval, oldest first:
  1. `1b1dcc0`
  2. `41a10b0`
  3. `72accd2`
  4. `4556eff`
  5. `fbe132e`
  6. `fa1182c`
- All six interval commits are now prepared and queued; see the overlay table below.

## F6 acceptance check

Constraint: at most three attempts or ten minutes. Passed on attempt 2 within the time limit.

- Attempt 1: broad `806922f` cherry-pick touched unrelated files and conflicted; aborted without committing.
- Attempt 2: applied only the `ai_corp.js` changes from F3 `cd95844` and F6 `806922f`. Kept the midpoint's existing decision wrapper, added only F3's security-cache lifetime, and resolved F6's single conflict in `_securityBoardKey`. No decision defaults or options were added.

| Pair, seeds 1–10 | Unpatched mean game time | Patched mean game time | Unpatched wall time | Patched wall time | Hash result |
|---|---:|---:|---:|---:|---|
| Gateway | 2.943 s | 1.026 s | 13.40 s | 2.15 s | all 10 identical |
| PD–Tao | 15.822 s | 1.654 s | 62.37 s | 3.47 s | all 10 identical |

All 40 executions completed with a winner and no errors. The overlay therefore meets the requested behaviour-preservation and approximately-two-second acceptance criteria for this midpoint.

Raw smoke artifacts are under `/tmp/chiriboga-72accd2-{unpatched,patched}-{gateway,pd-tao}.{jsonl,time}`.

## Overlay application across H1→H2

Every queued arm is a clean commit and differs from the harness chassis only by its historical `ai_corp.js`, the required harness shim, and the behaviour-neutral F3/F6 performance overlay. No arm changes decision defaults or options.

| Historical commit | Worktree | Queued HEAD | Overlay result |
|---|---|---|---|
| `1b1dcc0` | `bisect-a2-1b1dcc0` | `a0208cf` | accepted overlay applied cleanly |
| `41a10b0` | `bisect-a2-41a10b0` | `3bcd804` | accepted overlay applied cleanly |
| `72accd2` | `bisect-a2-72accd2` | `2dff323` | original accepted port; 20/20 acceptance hashes identical |
| `4556eff` | `bisect-a2-4556eff` | `72f5da0` | accepted overlay applied cleanly |
| `fbe132e` | `bisect-a2-fbe132e` | `a0e2579` | manually combined seeded-random and cache wrappers; required hashes passed |
| `fa1182c` | `bisect-a2-fa1182c` | `81d354d` | validated seeded-compatible overlay applied cleanly |

Saved overlays:

- `~/bench/f3-f6-ai_corp-overlay.patch` for commits before seeded randomness.
- `~/bench/f3-f6-ai_corp-overlay-seeded.patch` for seeded-randomness descendants.

The manually adjusted `fbe132e` arm was checked before queueing:

| Pair, seeds 1–10 | Unpatched mean game time | Patched mean game time | Hash result |
|---|---:|---:|---|
| Gateway | 2.328 s | 0.744 s | all 10 identical |
| PD–Tao | 21.556 s | 1.648 s | all 10 identical |

All 40 `fbe132e` smoke executions completed with winners and no errors. Raw artifacts are under `/tmp/chiriboga-fbe132e-{unpatched,patched}-{gateway,pd-tao}.{jsonl,time}`.

## Manual run queue

Queue script: `~/bench/run-queue.sh`.

Current entries, run sequentially:

1. `a2-1b1dcc0`: overlay commit `a0208cf`.
2. `a2-41a10b0`: overlay commit `3bcd804`.
3. `a2-72accd2`: overlay commit `2dff323`.
4. `a2-4556eff`: overlay commit `72f5da0`.
5. `a2-fbe132e`: manually validated overlay commit `a0e2579`.
6. `a2-fa1182c`: overlay commit `81d354d`.

Each entry writes `~/bench/<label>.json` and `~/bench/<label>.log`.

Run exactly:

```sh
bash ~/bench/run-queue.sh
```

The script runs the batch in the owner's terminal under an attached supervising shell, records its PID, refuses to overwrite an existing report, preserves a previous orphaned log, validates the pool/seeds/game count/failures/clean-tree metadata, and skips an already-complete valid report.

After it finishes, tell the agent. The next step is to compare every adjacent point from H1 through the six commits to H2 using paired `pointsStolen`, identify the two commits that straddle the step, and perform the requested Gateway and PD–Tao seeds 1–10 speed/hash spot-check on those two boundary commits before drawing a conclusion. Do not start H0→H1 until the owner-directed H1→H2 search is handled.

## Deferred H0→H1 state

- A midpoint worktree for `d31811e` already exists at `/Users/paulbingham/apps/netrunner/bisect-a2-d31811e` on clean shim commit `a82c155`.
- It has not run any smoke or batch games.
- F6 has not been attempted there. Per owner direction, if the F6 port does not work on an H0→H1 midpoint, queue those commits unpatched.

## H1→H2 completed localisation

All six queued reports completed with 1,000 games, zero failures and matching experimental inputs. The only material adverse adjacent step is `fbe132e`→`fa1182c`:

| Interval | Δ points stolen | 95% interval |
|---|---:|---:|
| H1→`1b1dcc0` | -0.002 | [-0.006, +0.000] |
| `1b1dcc0`→`41a10b0` | -0.036 | [-0.150, +0.078] |
| `41a10b0`→`72accd2` | -0.037 | [-0.073, -0.006] |
| `72accd2`→`4556eff` | -0.013 | [-0.054, +0.026] |
| `4556eff`→`fbe132e` | -0.041 | [-0.165, +0.083] |
| `fbe132e`→`fa1182c` | +0.257 | [+0.109, +0.406] |

At the boundary, points scored change -1.069 [-1.238, -0.896], win rate -0.087 [-0.117, -0.057], game length +1.797 [+1.368, +2.244], HQ theft +0.948 [+0.806, +1.094], R&D theft +0.394 [+0.254, +0.540], Archives theft +0.130 [+0.093, +0.170], and remote theft -1.215 [-1.343, -1.087].

Boundary overlay spot checks passed for both commits. All Gateway and PD–Tao seeds 1–10 reproduced their unpatched `logHash` values. `fa1182c` timing improved from 10.826→1.211 seconds (Gateway) and 8.924→1.376 seconds (PD–Tao).

Full-report overlay caveat: `a2-fa1182c.json` and the earlier unpatched `h2.json` have 998/1,000 identical `logHash` values. The differences are `btl-kit` seeds 56 and 83. Seed 56 has the same winner, points and turns; seed 83 changes from Corp 3 / Runner 9 in 17 turns to Corp 0 / Runner 9 in 19 turns. Therefore the overlay is not perfectly behaviour-neutral over the full pool, although the observed adjacent boundary effect is far larger than these two games.

Commit `fa1182c` changes two Corp decisions:

1. `_isAScoringServer` rejects every remote whose evaluated `isSecure` flag is false before considering it for agenda scoring.
2. `_cardProtectionValue`, which feeds `_protectionScore`, values ICE with ETR as ordinary protection while non-ETR ICE receives only 0.25.

## Queued causal test

Two clean throwaway branches start from harness tip `b52d451` and change only `ai_corp.js`:

- Variant A `7f3b634`: removes only the `_isAScoringServer` `isSecure` rejection and its now-unused precomputed-security argument.
- Variant B `18cff86`: restores only the pre-`fa1182c` ICE weighting in `_cardProtectionValue`; all other current policy remains unchanged.

`~/bench/run-queue.sh` runs both variants with the same pool, seeds and default options as `~/bench/current.json`, validates report compatibility, and writes comparisons to `~/bench/compare-current-causal-{a,b}.log`. It has not been run.

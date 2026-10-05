# Corp AI regression response plan

## Decision

Pause new behaviour-bearing Corp AI roadmap work and localise the demonstrated
regression before continuing. Do **not** roll the Corp AI back wholesale to H0,
and do **not** accept the harness-tip AI as a healthy baseline merely because
the roadmap is incomplete.

H0 is the experimental control, not the proposed production implementation.
It lacks later correctness fixes, deterministic policy randomness, engine and
card compatibility work, performance work, and newer defensive concepts. The
current AI also has one measured improvement: remote agenda theft fell sharply.
The aim is therefore to preserve sound infrastructure and correctness while
finding and selectively disabling, reverting or redesigning harmful policy.

The executable investigation is
[runbook.md](runbook.md). A fresh agent
should read this document, that runbook, [AI batch harness](../ai-batch-harness.md), and
[legacy stack validation](../legacy-ai-stack-validation.md), then carry out the runbook. It must stop at
the applicable owner review points. Current results are in
[findings](findings.md); tooling, tags and restoration are in
[the recovery inventory](assets/README.md). The early #2/#3/#6/#7/#10 follow-ups and tip/combined ablations are complete;
no batch starts merely by reading these plans.

## Evidence that changed the plan

The frozen H0-versus-harness benchmark used the harness branch
`roadmap/corp_ai_finding_12_seeded_batch_harness` at `b52d451`, the same current
engine and Runner AI in both arms, five common upstream-era deck pairs, and
seeds 1–200 per pair. Only `ai_corp.js` differed. Both arms completed 1,000
games with no failures.

| Metric | H0 original | Harness-tip AI | Difference (tip - H0), paired 95% interval |
|---|---:|---:|---:|
| `pointsStolen` (lower better) | 5.675 | 6.238 | +0.563 [+0.373, +0.753] |
| `winRate` (higher better) | 0.433 | 0.253 | -0.180 [-0.218, -0.141] |
| `pointsScored` (higher better) | 4.264 | 2.541 | -1.723 [-1.934, -1.505] |
| `gameLength` (lower for this benchmark) | 14.765 | 16.575 | +1.810 [+1.314, +2.314] |

All frozen acceptance checks failed. By server, points stolen changed by:

| Server | Difference |
|---|---:|
| HQ | +0.637 |
| R&D | +0.600 |
| Archives | +0.102 |
| Remote | -0.776 |

The result is not ordinary noise or a pure turtling trade-off. The current AI
protects remotes better but loses more from every central, scores much less,
wins much less often, and takes longer to finish. The regression appears
across all five pairs; `gateway` is the largest observed outcome drop.

Full evidence and raw artifacts are outside the repository:

- `~/bench/benchmark-report.md`
- `~/bench/benchmark-plan.md`
- `~/bench/orig.json` and `~/bench/current.json`
- `~/bench/orig.log`, `~/bench/current.log`, and `~/bench/comparison.log`
- `~/bench/beginner-pool.json`
- retained worktrees `../bench-orig` and `../bench-current`

The files and worktrees must remain in place and must not be rewritten or
deleted during the investigation.

## What the result does and does not establish

It establishes that the enabled Corp policy at `b52d451` is substantially
weaker than H0 on this common pool against the fixed current Runner AI. It also
shows that the remote-versus-central balance changed materially.

The aggregate H0-to-tip result does not identify one guilty commit. Subsequent
localization identifies `fa1182c`, #21 `5e6af68`, #25 `a3d57d3`, and the early
scoring boundaries #3 `95f2c15` and #8 `752dbf0`. Historical attribution and
current gating evidence must be kept separate.

Current gating candidates are the strict remote `isSecure` gate, final
`serverAtRisk` install override, committed-agenda reserve bypass, and the
shared empty-Archives run-pressure eligibility rule. Debt subtraction from
server rankings is a conditional tip candidate: removing it improves tip
scoring +0.154 [0.024, 0.282], but combined scoring +0.037 [-0.100, 0.173]
is inconclusive. The HQ penalty and secure bonus do not have positive current
ablation evidence; removing the bonus worsens tip scoring. The structural-risk
penalty changes no hashes on this pool. Exact code, paired intervals and
isolation limitations are in [the findings](findings.md#updated-early-localization-and-gating-assessment-2026-10-05).

The combined five-behaviour removal recovers much of the loss but retains a
scoring gap to H0. The gap remains unresolved; it is not proven to be spread
across small steps. No option-based equivalent has been accepted or merged.
First-divergence traces and agenda collectors remain unperformed, so the
agenda-holding mechanism is supported by outcome patterns rather than directly
observed. Strength against humans also remains unestablished by these batches.

## Why the roadmap process failed to catch it

Most completed server-security layers predate the seeded gate system. At the
time, “done” meant that deterministic and fixed-board tests passed. Such tests
can prove that an evaluator recognises a breaker, budgets rez credits, or picks
the intended server in one position; they cannot prove that the changed policy
wins more games or avoids buying local defence with larger losses elsewhere.

The roadmap also improved server evaluation before replacing legacy action
selection. Current install planning still orders independently generated
option groups and chooses the first legal preference; it does not compare ICE,
agenda installation, advancement, economy, and draw on one outcome scale. The
I0–I9 install-decision series intended to solve that is not yet implemented.

This makes the regression understandable, but not acceptable as a foundation
for further policy work. F4 arrived in time to detect the problem; its result
must now change sequencing.

## Work policy until localisation is complete

Pause:

- new default-on Corp policy;
- further L-layer or I-layer behaviour changes;
- calibration against the harness-tip AI as though it were an accepted
  baseline; and
- broad cleanup that would make historical attribution harder.

Allowed:

- the throwaway-worktree investigation in the bisect runbook;
- observation-only harness instrumentation applied identically to compared
  arms and proved not to change seeded log hashes;
- documentation of evidence; and
- mandatory correctness work, provided it is kept separate from claims about
  playing strength.

## Decision after localisation

The remedy depends on the evidence:

| Finding | Response |
|---|---|
| One harmful policy commit | Revert or repair that policy only; preserve unrelated correctness and infrastructure. |
| One harmful feature layer | Put the layer behind a default-off option and redesign it under an F4 gate. |
| Several independent harmful changes | Isolate each behind its own option and gate; do not use a compensating bundle. |
| Gradual deterioration | Run grouped ablations for mulligan, protection allocation, central interrupts/recovery, and deception before changing code. |
| Correct rules fix worsened results | Keep the rules fix and adjust surrounding optional policy; correctness is not traded for win rate. |
| Hypothesis unsupported | Follow the first-divergence evidence and instrument the actual changed decision family instead. |

Any remediation that changes play must be default-off until its predeclared
gate passes. At minimum, the gate must include the intended improvement plus
guards for `pointsStolen`, `winRate`, `pointsScored`, and `gameLength`. The
thresholds must be frozen before candidate results are generated.

## Conditions for resuming the roadmap

Resume normal behaviour-bearing roadmap work only after:

1. the bad interval or gradual contributing intervals have been identified;
2. first-divergent-decision evidence explains the mechanism well enough to
   choose a targeted remedy;
3. harmful optional policy is off, reverted, or passes a predeclared gate;
4. required correctness fixes remain intact; and
5. a new accepted baseline is recorded for subsequent I- and L-layer gates.

The target is not necessarily H0's exact numbers. The target is a justified,
measured baseline whose trade-offs are known and accepted rather than an
assumption that unfinished future layers will repair today's regression.

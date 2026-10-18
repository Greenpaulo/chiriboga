# Deception gates

Current cross-ticket guidance, updated 2026-10-15. The
[roadmap's implementation order](roadmap.md#current-implementation-order) owns
sequencing; each linked ticket/spec owns its acceptance gate. Historical merge
and gate-revision evidence remains in the
[2026-10-09 plan](../plans/2026-10-09-merge-and-roadmap-order.md).

## Measurement and adoption

[F11](../backlog/done/F11-paired-batch-metric-guards.md) supplies generic paired
pooled `--guard` and `--improve` checks. [F12](../backlog/done/F12-realized-defense-measurement.md)
owns passive `realizedIceByRootType` observations and control-only calibration.
The existing posture/profile collector does not alone measure the realized tell.

F12's original controls used feedback off and reported about 85.8% / 85.4%
known posture labels, below its frozen 90% requirement. That historical result
remains valid; the controls did not establish usable postured statistics.
L8.2 corrected never-selected roots to the passive `unrolled` label without
inferring safety or invoking policy evaluators, then collected fresh controls
with epochs and feedback both on (their current defaults). Its
[control evidence](measurements/L8.2-2dc504d-control-calibration.json) records
1,400/1,400 identical observer-off/on games, 99.659% / 99.626% known labels,
valid all-root/postured statistics and explicit accounting for the second
cohort's known seed 257 stall. Later consumers still need controls matching
whatever prerequisite policies are adopted; these controls do not adopt L8.2.

Use actual Runner-turn ICE-count distributions of unrevealed agenda/trap roots:
`allCountDistance` is their total-variation distance; `posturedCountDistance`
is the active-posture subset. Both have direction lower. Retain `allCountCorrelation`
and `posturedCountCorrelation` (absolute Spearman rho). TV catches nonmonotonic
count tells that rho can miss. Report residual values and class/bin/game coverage,
not just pass/fail. These metrics do not establish absence of ICE identity,
strength or multivariable tells, or success against a learning human.

| Item | Acceptance scope / remaining reconciliation |
|---|---|
| L8.4 | Settled: measured posture-correlation maximum 0.229 ≤ control 0.329; do not retroactively change its gate |
| L8.5 | Merged; revised full gate passed with correlation report-only, information/reachability and adaptation hard checks plus performance guards; feedback defaults on |
| L8.2 | Full gate failed; policy removed, not adopted. All-root TV reduction not demonstrated; public-variable correlation, active-subset rho, win-rate and shape-overlap checks failed. Retain measurements and frozen evidence. |
| I2 | Consume F12 with its existing proposed count-rho and posture guards; 0.02 rho margins remain provisional pending calibration; retain security improvement/performance checks |
| L8.9 | Investigate residual mechanisms, implement a supported repair in the same ticket, then require actual count-distance reduction and strategic safety guards |
| I3 | Reconcile scoped tell guards before implementation; use fresh adopted-policy control and preserve its own improvement/performance gate |
| I9 | Reconcile its absolute combined-policy target, role coverage and bounded-input exceptions in its source spec; no prior ticket silently adopts that target |

A paired no-regression guard does not show a reduction. For L8.2/L8.9 the primary
Improve row must demonstrate lower all-root TV with F11's paired pooled interval.
Do not choose a successful subset after candidate results or replace the
headline objective with an allowed regression. Keep safety overrides in headline
coverage; root ages, commitment distributions and per-deck splits explain
population/lifecycle effects without claiming causal attribution from rho/TV.

## Before a policy implementation or gate

- Re-ground the source ticket/spec against current code and dependencies.
- Use F12's control-only evidence to freeze coverage, sample size, any starts
  and consumer-specific guard margins before implementation/candidate results.
  TV and rho units differ; do not copy I2's provisional 0.02 into TV.
- Identical-policy/same-seed identity checks test measurement correctness, not
  noise. Disjoint calibration cohorts require independent deck-pair-stratified
  resampling; they are not matched adoption reports.
- Use fresh matching control/candidate reports with the same pool, seeds,
  starts, collectors and adopted prerequisite options. Change only the item's
  option. Refresh both reports after another policy adoption.
- Require valid agenda/trap observations, meaningful class/game coverage and
  changed games. Missing samples or undefined statistics cannot pass.
- Retain standard winRate 0.02 and relevant pointsStolen/pointsScored 0.2 guards
  unless the source explicitly justifies a different tolerance. Retain the
  source's additional guards and hard checks.

L8.2's frozen ticket gate supersedes the historical absolute 0.10 ceiling with
its calibrated paired correlation guard. It retains the all-root TV improvement,
active-subset and performance guards and the 0.05 shape-overlap ceiling.
The full gate failed. The relative-depth/parity/top-up strategy and its settings
were removed, with the evidence retained in the ticket and architecture. No
L8.2 strategy was adopted; later controls use the unchanged adopted policy.
L8.9 also requires passive instrumentation identity before policy changes; its
repair design and calibrated complete command are recorded in that same ticket.
A failed repair gate leaves the policy unadopted; investigation alone is not
completion of its repair objective.

Preserve L7.1's lesson: consequence weighting belongs in install ranking, not
HQ/R&D protection scores used as bars for remote scoring. L8.8's concealment/
private payoff design is separately gated and is not an I2 prerequisite.

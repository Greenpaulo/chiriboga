# Gated regression implementation

Branch `fix/corp-ai-regression-options` starts from `7b28f2a`, which preserves
the investigation assets above the tested harness tip `b52d451`. It is an
isolated implementation branch; no merge, push or benchmark acceptance is
implied by this change.

The five options below default to `false`. Each `true` setting restores only
the named expression from `b52d451`. All false targets `edc177a`; all true
targets `b52d451`.

| Option | Source / expression |
|---|---|
| `secureScoringServerGate` | `fa1182c`, `_isAScoringServer`: reject when `!security.isSecure`. |
| `serverAtRiskInstallOverride` | #21 `5e6af68`, `_shouldInstallIceLayer`: final `|| serverAtRisk`. |
| `committedAgendaReserveBypass` | #21 `5e6af68`, `Phase_Main`: `|| this._installedAgendaCanBeCompleted()`. |
| `emptyArchivesRunPressure` | #25 `a3d57d3`, `_nothingWorthProtecting`: empty Archives pressure admission. |
| `valuelessServerDebtReset` | #25 `a3d57d3`, `_ageProtectionPriorities`: reset for `_nothingWorthProtecting`. |

The last two intentionally preserve their shared-predicate interaction.
Debt reset is included to reproduce the combined diagnostic arm; its individual
ablation did not establish a scoring or win-rate benefit. HQ's relative
protection penalty, the +2 secure-server bonus, debt ranking subtraction and
all other policy expressions remain intact.

Unit tests exercise both paths of every option, default/instance isolation,
and the Archives admission/reset matrix. Existing fixtures that specify the
old behavior explicitly enable its option, retaining their expectations.
`node tests/run-all-tests.js --unit-only` includes the decision fixture and
snapshot suites and excludes `ai-batch.test.js`, which launches batches.
The full runner without this flag still includes that integration test.

## Owner-run validation

Use `scripts/run-corp-regression-options.js --bench <evidence-directory>` with
Node. `--check` performs read-only validation without launching games or
comparisons. The script requires a committed clean build and validates pool,
chassis, historical control hashes and existing output metadata before any
run. Raw evidence remains in the repository's ignored `bench/` directory.

The queue runs seven arms in order:

1. All five off (default), compared with `causal-gate-and-four-off.json`.
2. Each option alone on, in the table's order, compared with the new default.
3. All five on, compared with `current.json`.

Reports are named `corp-options-<option-or-default-or-all-on>.json`; unique
run/comparison logs are created beside them. Each arm uses beginner-v1,
seeds 1–200 for each of five pairs, 1,000 games, no collectors, and a
900-second per-game timeout. Failed/timed-out games are retained and never
retried. Existing matching reports are skipped. Completed staging reports
can be published on resume; output publication never overwrites a report.
Malformed/incomplete staging files stop the queue for inspection.

The default and all-on fidelity checks require all 1,000 pairs to complete
with identical log hashes, winners, points, turns and outcome metrics. A
fidelity failure stops further arms. Each comparison log contains the raw
paired `--compare` output and an outcome table with win-rate differences in
percentage points and paired 95% intervals.

The owner completed all seven arms on 2026-10-05: 1,000 games per arm,
zero failures. Both fidelity checks passed with 1,000 identical completed
pairs. Against H0, the new default retains a scoring deficit of -0.344
[-0.564, -0.124]; win-rate difference is -3.5 percentage points [-7.5, +0.4].
The first four options each clearly worsen scoring and win rate when enabled
alone on this new default; valueless-server debt reset remains inconclusive.
The agent did not launch or poll any batch.

See [the completed handoff](gated-fix-handoff.md) for source commit subjects,
intent, measured effects, mechanism limitations, full recovery results,
manual configuration examples and the agreed stack-integration order.

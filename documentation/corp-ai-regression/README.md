# Corp AI regression investigation

Start with [findings and gating candidates](findings.md), then the
[current runbook](runbook.md) and [response plan](response-plan.md).
For the completed gated fix and personal playtesting, read
[the gated-fix handoff](gated-fix-handoff.md).

| File or folder | Purpose |
|---|---|
| [findings.md](findings.md) | Completed comparisons, causal evidence, code expressions and gating candidates |
| [gated-fix-handoff.md](gated-fix-handoff.md) | Source commits, intent, regression evidence, completed gate tests, configuration examples and integration order |
| [implementation.md](implementation.md) | Option implementation and owner-run fidelity queue |
| [runbook.md](runbook.md) | Current investigation procedure and outstanding work |
| [response-plan.md](response-plan.md) | Remediation policy and requirements before resuming the stack |
| [benchmark.md](benchmark.md) | Original benchmark procedure, retained for reference |
| [runbook-v1.md](runbook-v1.md) | Earlier investigation procedure; current runbook takes precedence |
| [assets/](assets/README.md) | Recovery inventory, frozen plans, archived scripts, overlays and evidence manifest |

The original 142 raw JSON/log artifacts are preserved in the
[evidence archive](assets/evidence.tar.gz), with
[checksums and extraction instructions](assets/README.md#archived-evidence).
Local `bench/` and `~/bench/` copies remain working copies; additional artifacts
outside the archive need separate backup. Root `.gitignore` excludes `bench/`.

This investigation is tracked separately from the F4 harness in
[its review ticket](../backlog/code-review/corp_ai_regression_investigation.md).

The owner runs batches. These documents and archived scripts do not authorize
an agent to start or poll a batch. The option implementation and its completed
fidelity checks are described in [implementation.md](implementation.md).

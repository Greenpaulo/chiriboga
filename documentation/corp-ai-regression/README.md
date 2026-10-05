# Corp AI regression investigation

Start with [findings and gating candidates](findings.md), then the
[current runbook](runbook.md) and [response plan](response-plan.md).

| File or folder | Purpose |
|---|---|
| [findings.md](findings.md) | Completed comparisons, causal evidence, code expressions and gating candidates |
| [runbook.md](runbook.md) | Current investigation procedure and outstanding work |
| [response-plan.md](response-plan.md) | Remediation policy and requirements before resuming the stack |
| [benchmark.md](benchmark.md) | Original benchmark procedure, retained for reference |
| [runbook-v1.md](runbook-v1.md) | Earlier investigation procedure; current runbook takes precedence |
| [assets/](assets/README.md) | Recovery inventory, frozen plans, archived scripts, overlays and evidence manifest |

Raw reports and logs are in the repository's gitignored `bench/` folder; the
original `~/bench/` is also preserved. Those local evidence files require a
separate backup. Root `.gitignore` controls their exclusion from Git.

The owner runs batches. These documents and archived scripts do not authorize
an agent to start or poll a batch. The option implementation and its pending
fidelity checks are described in [implementation.md](implementation.md).

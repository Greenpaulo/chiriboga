# Vantage Point review evidence and remediation

Start with the [full-set review](vantagepoint-set-review.md), which links all 13
batch reports and records shared finding S1. The [active tracker](../../current-set-implementation.md)
selects the next reopened batch. The original [completion history](../../history/vantagepoint-2026-10-06.md)
and [post-review snapshot](../../history/vantagepoint-2026-10-06-reviewed.md)
remain archived separately. Current verdict: **Changes required**; batches 1–12
need repairs and batch 13 must be revalidated after relevant shared changes.

## Repair and re-review

1. Invoke `$implement-card-batch` to repair the next reopened batch. Its
   remediation instructions require reading that batch's linked report, related
   set findings, evidence gaps and acceptance criteria. Reproduce each required
   finding against current code before choosing a repair.
2. Add meaningful permanent regression tests for correct behavior and address
   missing decision evidence. Some probes assert the observed defect: a passing
   observation probe does **not** establish a repair. Shared fixes require checks
   of affected consumers and previously passing batches.
3. Append dated remediation notes to the batch report with finding IDs, changes,
   regression evidence and remaining work. Preserve the independent findings and
   verdict. Run the required full regression suite before handoff.
4. Invoke `$review-card-batch` for that repaired batch. Only independent review
   can record its new verdict. Repeat for the remaining batches, then invoke
   `$review-card-set` for the final readiness verdict and shared integration audit.

For example: “Use implement-card-batch to repair the next reopened Vantage Point
batch,” followed by “Use review-card-batch to independently review Vantage Point
batch 1.” These skills locate evidence through the tracker's **Review directory**
and linked reports; a separate remediation skill is unnecessary.

## What to retain

- **Reports and completion history:** keep as the durable record, including
  findings, dated remediation notes and independent re-review outcomes.
- **Probes:** retain while their findings or evidence gaps remain open. Once
  equivalent permanent regression coverage exists and independent review passes,
  consolidate or remove redundant probes. Keep useful specialized harnesses.
- **SHA-256 manifests:** provenance for a particular audit snapshot, not runtime
  dependencies or proof that current code passes. Keep useful snapshot manifests;
  redundant intermediate manifests can be consolidated after closure with their
  provenance explained and references updated.
- **JSON files:** recorded source/worktree metadata and headless outcomes. Retain
  these compact records for this audit; later runs should produce new records,
  rather than overwrite historical evidence.

No evidence has been deleted during this relocation. Any later cleanup must
update report links and retain enough evidence to understand the original
finding, repair and independent verification.

## Relocation provenance

On 2026-10-06, the reports and artifacts moved from the flat `reviews/` and
`reviews/probes/` directories into this directory and its `probes/` subdirectory.
Report links and probe root resolution were updated. Historical JSON and intermediate hash
manifests retain their original recorded paths and digests; retrieve the completed
pre-move artifacts from Git commit `5363f34`. Do not interpret a historical path
or document-digest mismatch after relocation as production drift or renewed
approval. The [relocation manifest](vantagepoint-relocation.sha256) records the
updated reports, probes and workflow instructions, excluding the manifest itself.
The original review verdict remains unchanged.

## PR #23 corrections — 2026-10-08

The [final manifest](vantagepoint-set-review-final.sha256) has been refreshed to
verify the retained paths and current merged remediation snapshot. Its original
version remains in Git at `6dd3adb`. This refresh does not renew review approval;
production changes from the base branch still need independent revalidation.
The [original smoke record](vantagepoint-headless-smoke.json) is unchanged;
[corrected results](vantagepoint-headless-smoke-2026-10-08.json) supersede its
invalid legal-deck/zero-error claim. Four games pass and four fail on recorded
engine errors; see the full-set report for the outstanding integration findings.

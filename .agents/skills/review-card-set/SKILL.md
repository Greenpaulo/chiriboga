---
name: review-card-set
description: Independently review a completed Chiriboga card set by establishing current per-batch strategic evidence and auditing cross-batch mechanics, rules and integration. Use for a full or final set review and readiness verdict. Does not implement repairs or enable the set.
---

# Review a completed card set

Resolve the requested set from `documentation/new-sets/current-set-implementation.md`
or its archived tracker. Read the integration guide, the set's notes and
`documentation/card-sets.md`; treat implementation claims as unverified. Preserve
pre-existing edits. Do not edit production code or existing tests, commit, push,
or change playability flags. Temporary reproduction probes and review documents
are allowed. Report the set, exact IDs, implementation status and review scope.

## Establish per-card evidence

Read and apply `../review-card-batch/SKILL.md` to each recorded batch lacking
current sufficient passing evidence. Audit exactly the recorded cards per batch;
never replace real planner/selector scenarios with hook-only checks. Existing
passing reports can be reused only after checking source/test hashes and changed
consumers. Record revalidation when later shared changes affect an earlier audit.
Missing reports are work to perform, not grounds to stop the review immediately.

For a full set, independent agents may review disjoint batches in parallel.
Each reviewer owns only its batch report and useful reproduction artifacts;
only the coordinator edits the shared tracker/backlog. During a full-set review,
the batch skill's tracker updates and batch reopening are deferred to the
coordinator; batch reviewers report the required changes without editing shared
tracker/backlog files. Give each reviewer the
batch skill and raw set/test context, without proposed findings. Never run these
reviews alongside production edits. Each batch retains its separate verdict and
per-card evidence. One coordinator full-suite run on the shared immutable code
snapshot can satisfy the shared verification requirement for all reports; reviewers
must still run their focused checks and cite that coordinator result explicitly.

## Audit the whole set

- Account for every intended ID exactly once in metadata and definitions; verify
  stats, printed-text mechanics, finite ELO values, image resolution and absence
  of unfinished stubs. Use targeted queries and small code windows. Resolve
  consequential rules ambiguities from local rules or primary ruling sources.
- Check timing, cancellation, prevention, ownership, restrictions and cleanup,
  including the shared engine changes introduced by this set. Cross-check the
  real consumers and both AI sides for payments, hosting, access, scoring,
  strength changes, finite defenses and run continuations where applicable.
  Exercise realistic cross-batch and existing-playable-set interactions; preserve
  reproductions and explain supported expected outcomes. A full set audit must
  not claim exhaustive coverage of all possible combinations.
- Verify format legality and launcher defaults against code and current metadata,
  and generate legal Runner and Corp random decks for every applicable format.
  Check size, influence, agenda points, copies, side, identity and set legality.
- Run the set's focused/shared commands, syntax checks, `git diff --check` and
  `node tests/run-all-tests.js` using `.nvmrc`. Confirm Corp decision fixtures
  and decision snapshots are included. Exclude known-red pending reproductions.
  Name failures and evidence limits; do not equate a green suite with correct AI.
- Record human-facing manual checks actually performed. Missing essential manual
  or runtime evidence prevents Pass; name what would settle it. Do not claim
  browser playthroughs based on VM tests or infer rules correctness from no TODOs.

## Locate and retain review evidence

Use **Review directory** from the active or archived tracker, or the existing
linked report directory. For a new set, record a directory under
`documentation/new-sets/reviews/<set-slug>/` in its tracker. Keep that set's
reports, probes, manifests and result JSON together, with probes in `probes/`.
Preserve referenced evidence while findings or revalidation remain open.
Historical hashes describe the original snapshot; path/documentation changes do
not renew approval. After fixes have permanent green regressions and passing
independent review, redundant probes/manifests/results can be consolidated or
removed with report links and provenance updated; retain useful reproductions,
final reports and completion/review history. Follow a set index's retention notes.

## Record and hand off

Write `<review-directory>/<registry-key>-set-review.md`, retaining
prior review history. Include date/reviewer, exact IDs, commit, dirty-worktree
state and source/test hashes (a linked manifest is fine); all batch verdicts and
report links; integration/cross-batch evidence; exact commands/results; manual
coverage; findings and remaining evidence gaps. Distinguish demonstrated defects,
missing necessary capabilities, missing evidence and optional improvements.

Each defect needs affected IDs, actual consumer/location, reproducible state or
probe, current and expected behavior with justification, impact and an actionable
repair/re-review criterion. Use **Pass** only when every batch and essential
set-wide check has sufficient current evidence; **Changes required** for supported
defects or missing necessary capabilities; otherwise **Inconclusive**. Missing
coverage stays visible even when demonstrated defects determine the verdict.

The coordinator appends batch review results to the active tracker's separate
review log, reopens only affected batches as Pending (or Blocked for a precise
external dependency), clears their owners and refreshes counts. Keep completion
history append-only. Update set-wide review status/report link and the backlog;
for an archived set, update only its own records. Repairs go through
`implement-card-batch` and require re-review. Recommend playability only after Pass;
do not enable the set. Before the tracker is replaced, preserve its entire queue,
completion/review logs and final state under `documentation/new-sets/history/`,
without overwriting older snapshots; retain links to notes and review reports.

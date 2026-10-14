---
name: review-card-batch
description: Independently audit one previously implemented Chiriboga card batch for strong strategic AI support, exercise real decision paths, record findings and reopen incomplete work. Use when asked to review or audit a card batch, optionally naming the set and batch number. Does not implement repairs or replace the final set-wide review.
---

# Review one implemented card batch

Review exactly one batch against the current code, not the implementer's claims.
Prefer a fresh chat. Audit both sides' relevant decisions and modelling; a green
suite, documented hook or selectable ability alone cannot establish strong AI
support. This is a review: do not edit production code or existing tests, commit,
push, or change playability flags. Temporary local reproduction scripts are
allowed; preserve their useful scenario and results in the review report.

## Resolve the set and batch

Accept natural-language arguments such as:

```text
$review-card-batch Vantage Point 5
$review-card-batch vantagepoint 12
$review-card-batch 5
```

A number alone refers to the active set in
`documentation/new-sets/current-set-implementation.md`. With no batch number,
select the earliest completed batch without a current passing review, using the
review records below; do not start the next implementation batch. Report the
resolved set, range and review scope before auditing.

Resolve an explicit set against the tracker and `documentation/card-sets.md`;
accept its name, registry key or pack code only when unambiguous. The active
tracker supplies batch boundaries, definition file, notes and verification
commands. For another set, locate a preserved batch queue or explicit batch
ranges in its implementation records. Never reinterpret its number using the
active set's queue or invent equally sized groups. If that mapping is absent,
ask for the archived mapping or exact card IDs. Do not change the active set.

Review previously implemented cards, including a reopened batch when explicitly
requested. Do not claim unfinished cards have passed. Check `git status`,
preserve pre-existing edits, and never review while another agent is editing the
same definition file or tracker.

## Gather evidence economically

For the active set run `node scripts/batch-brief.js <n>`. This script reads only
the active tracker; it does not accept a set argument. For an archived set,
extract just the selected IDs' printed stats and rules from the metadata file
with a small local Node query; do not load the metadata file into chat.

Read the batch's implementation notes and named tests as claims to verify.
Use `node scripts/show.js card <id>`, `node scripts/show.js fn <name>` and
`rg -n` followed by small code windows. Read the relevant sections of
`documentation/ai.md`, `documentation/engine_patterns.md`,
`documentation/ai-principles.md` and each affected side's current principles and
architecture. Check consequential rules ambiguities against the local rules or
primary ruling sources. Do not open card art or whole engine/AI/set files.

## Audit every card's strategy

For each card, identify its useful role and trace the actual consumer from legal
options through command, card, timing, target and resolution. For passive effects,
trace valuation, advancement, security or run-calculator consumers. Establish:

- **Opportunity and alternatives:** when to play/install/rez/activate and when
  to hold or decline; what competing score, kill, defense or economy action it
  could displace. Check expiring and no-target windows, fixed selector lists,
  and inline preferences that override a calculated plan.
- **Resources and clocks:** all clicks, credits, counters, recurring resources,
  hand space and mandatory draws; once-per-turn effects, scoring windows,
  resets and finite consumable defenses. Account for installation and follow-up
  costs rather than affordability of the printed ability alone.
- **Targets and interactions:** useful targets versus merely legal or high-ELO
  ones; relevant synergies, duplicate cards, replacement effects and the
  opposing AI's response. Inspect related mechanics across batch boundaries
  when needed, without expanding into a second batch's implementation.
- **Information and planning safety:** no opponent hidden-card reads or Corp
  R&D-order use, no leaked hypothetical mutations, no card-title special cases
  or unsupported constants introduced to fit one board. Confirm hook contracts
  and documentation match the actual call sites.

Exercise the real selector or planner in contrasting realistic states. Include
useful action and justified decline, a scarce resource or competing action, and
an immediate win/loss when applicable. Passive cards need equivalent planning
and valuation evidence, not artificial activation tests. Reuse existing tests
or temporary VM probes; do not stub the decision path being reviewed. Inspect
assertions and explain why each expected decision is strategically justified.
Direct hook-return tests are supplements. Distinguish an absent test from a
proven bad decision; look for a counterexample before endorsing a heuristic.

Use current planner metrics and supported game outcomes. Strong support means
sound, evidenced choices within the architecture, not mathematical optimality.
A missing necessary consumer or ignored strategic effect is unfinished work.
If a deeper architecture dependency prevents support, name the precise missing
capability and affected behavior rather than accepting it as a vague limitation.

Run relevant focused tests, the selected set's required shared verification and
`node tests/run-all-tests.js` on the Node runtime pinned by `.nvmrc`. This includes
Corp decision fixtures and decision snapshots, excluding known-red pending
reproductions. Check `node --version` first and select the installed pinned
binary (for example, with `nvm use`) if the shell resolves an older runtime.
Name every failure and distinguish related from demonstrated
pre-existing failures. An unrelated failure prevents claiming a green suite;
it does not by itself prove this batch's strategy is defective.

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

## Record the verdict and hand off

Write `<review-directory>/<registry-key>-batch-<n>.md`. Include the
review date, reviewer, exact card IDs, reviewed commit and dirty-worktree state,
and content hashes of the reviewed source and test files (for example, use
`shasum -a 256 <paths>`). Preserve previous review history when updating it;
a passing report must not silently apply to subsequently changed consumers.

Record a per-card table of strategic role, actual consumers, contrasting
scenario/test evidence and verdict. Each finding needs the card ID, current
behavior, concrete board state or reproducible probe, expected behavior and its
reason, code location, impact and an actionable repair/acceptance criterion.
Separate supported defects from missing evidence and optional improvements.
List exact verification commands/results and remaining architecture limitations.

Use one overall verdict:

- **Pass:** all cards have sufficient decision evidence and no necessary AI gaps.
- **Changes required:** a demonstrated defect or missing necessary AI capability.
- **Inconclusive:** essential evidence or a ruling is unavailable. State exactly
  what would settle it; do not invent a defect or call this a passing review.

During a full-set review, defer the following tracker/backlog updates and batch
reopening to the coordinator. Batch reviewers record the required updates in
their reports and do not edit those shared files.

For the active set, link the report and verdict from a separate batch-review log
in the tracker, creating that section on the first review. Keep implementation
completion history append-only. For Changes required, reopen a completed queue
row as `Pending` for repairs, or `Blocked` only for a precise dependency that
materially exceeds the batch. Clear its active owner, link the findings in its
notes, and refresh summary counts. Do not overwrite another agent's active claim.
Pass or Inconclusive does not change implementation status; an inconclusive
review remains outstanding. For another set, update its own notes/backlog with
the report and repair need; leave the active tracker untouched.

Report the verdict, strongest findings, evidence limits and report path. Repairs
for the active set go through `implement-card-batch`; reopening the earliest
completed batch makes it selectable ahead of later pending work. Re-review after
repairs. Batch reviews can run before the last implementation batch is finished;
final set review still checks cross-batch interactions and overall readiness.

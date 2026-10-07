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

Deliver one consolidated audit and repair handoff. Finding a defect is a reason
to inspect its affected consumers and interactions, not to end the review and
leave those checks for the next repair cycle. Re-reviews use the recorded audit
scope and acceptance criteria; they must not become a sequence of isolated
counterexamples or silently introduce new requirements.

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

## Map the audit before exercising scenarios

Build a compact coverage matrix in the review report before deciding the verdict.
Start from current mechanics and call sites, then reconcile implementation tests
and earlier findings against it. Do not use the latest repair's tests as the
scope of the audit. For each card, record:

- Its necessary strategic contracts: useful action/decline, tactical safety,
  resource and timing accounting, targets, information boundary and restoration.
- The actual consumers of each contract, including separate selectors, payment
  allocators, preparation checks and the opposing planner where applicable.
  Search for all uses of affected hooks/helpers and equivalent calculations;
  similarly named methods are not necessarily the only consumers.
- Relevant boundaries and state transitions, with an expected game outcome,
  evidence path and status: supported, defect, missing evidence or not applicable
  with a reason. Link scenarios to consumers so untested paths remain visible.

Choose scenarios from the mechanic's causal dependencies, not an exhaustive
product of every board variable. Include scarce/sufficient resources, ordinary
versus immediate game outcomes, initial versus newly gained/spent state, and
effect order when those distinctions change legality, survival or valuation.
For a shared route or budget contract, check every distinct consumer and the
relevant compositions: state gained at one encounter can enable a later effect;
damage can precede draw; paying now can remove a follow-up winning route.
These are examples of dependency analysis, not mandatory scenarios for unrelated
cards. Inspect related cards only as needed to establish the selected batch's
contracts; this remains exactly one batch review.

Existing evidence may fill matrix rows after its assertions and current consumers
are checked. Do not recreate equivalent probes or rerun unchanged evidence
without a reason. Preserve the matrix across repairs so evidence accumulates
instead of restarting the audit each time.

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

## Complete the audit and consolidate repairs

Before handing off Changes required, finish every applicable matrix row across
all cards, including after the first defect is found. A row may end in a supported
defect or an explicitly identified evidence gap; a failing scenario does not
excuse leaving the other consumers unexamined. When a finding reveals a missing
shared contract, extend the matrix to its affected call sites and causal
interactions and audit those in this invocation. Record unavailable evidence
explicitly instead of implying the audit is complete.

Group related symptoms under their root contract and give the implementer one
repair list covering all affected consumers. Each item must include contrasting
acceptance scenarios, expected decisions/outcomes, required permanent regressions
and shared consumers to revalidate. Where existing code already violates that
contract, include the demonstrated defect in the same handoff even if the latest
repair did not introduce it. Separate optional improvements and speculative
optimisation from necessary repairs; they do not reopen a batch.

The stopping condition is that every identified necessary contract and applicable
consumer has evidence or an explicit unresolved gap, all demonstrated defects
are consolidated, and required verification is recorded. Do not keep searching
unrelated architecture or invent new quality requirements after reaching that
condition. This establishes a bounded audit, not a claim that no undiscovered
bug can exist. Essential unavailable evidence prevents Pass.

## Re-review against the consolidated handoff

Read the prior coverage matrix and complete repair list, then inspect the actual
diff and current call sites. If an older report lacks the matrix, build it from
the current consumers and historical evidence before validating repairs.
Verify every required repair together, retain
unaffected evidence with its provenance, and exercise changed consumers and
their affected interactions. A green reproduction alone does not close an item
whose other recorded acceptance scenarios or consumers remain unsupported.

If another necessary defect emerges, classify it as an unresolved acceptance
criterion, a repair regression, or an escaped audit gap. Explain which matrix
row or dependency was missed and check its related consumers before handing off
again. Add it to the consolidated matrix/list rather than returning only the
new counterexample. Distinguish a newly proposed requirement from a defect in
the agreed strategic contract; do not silently make it a new approval gate.

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
scenario/test evidence and verdict, plus the coverage matrix and consolidated
repair/acceptance list above. State which rows remain unresolved and whether
the audit covered all identified necessary consumers. Each finding needs the
card ID, current behavior, concrete board state or reproducible probe, expected behavior and its
reason, code location, impact and an actionable repair/acceptance criterion.
Separate supported defects from missing evidence and optional improvements.
List exact verification commands/results and remaining architecture limitations.

Use one overall verdict:

- **Pass:** all cards have sufficient decision evidence and no necessary AI gaps.
- **Changes required:** a demonstrated defect or missing necessary AI capability.
- **Inconclusive:** essential evidence or a ruling is unavailable. State exactly
  what would settle it; do not invent a defect or call this a passing review.

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

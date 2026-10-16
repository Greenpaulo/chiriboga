---
name: optimise-card-batch
description: Strengthen strategic AI decisions and repair supported review findings, bugs and edge cases in one implemented Chiriboga card batch. Use for post-implementation optimisation or review repairs, optionally naming a set and batch. Does not implement new batches or grant independent review approval.
---

# Optimise one implemented card batch

Improve how the AI plays an already usable batch and repair supported defects.
Assess every card's strategy, then work to a concrete repair/improvement scope.
Strategic improvements are optional for implementation completion and playability.
Baseline gameplay, baseline AI and integration defects are required repairs,
even when this skill coordinates them after implementation. Preserve their
required status and acceptance criteria until repaired and verified.

Check `git status` and preserve unrelated work. Never run alongside edits to the
same set, consumers or record. Do not commit, push, discard work or change
availability flags.

## 1. Resolve and claim the batch

Accept a set name, registry key or pack code and optional batch number, for
example `$optimise-card-batch Vantage Point 5`. A number alone uses the active
set; no arguments uses its optimisation queue. Resolve explicit sets through
`documentation/card-sets.md` and the backlog's **Set record** link: use the active
tracker for its set, otherwise `documentation/new-sets/records/<registry-key>.md`.
If only a historical tracker exists, preserve it and create a maintained record
with relative links adjusted; link it from the backlog. Never change the active
implementation set to optimise another set.

Use preserved batch boundaries; if unavailable, ask for the mapping or exact
IDs. Read the set record's paths, verification commands, optimisation queue and
review logs. Select an explicit implemented batch, otherwise resume In progress,
then the earliest Pending. Do not silently skip a first outstanding Blocked row.
If nothing is queued, report that and stop; an explicit batch may be optimised
without a prior review. Never claim unimplemented cards.

Mark only its optimisation row In progress, with owner/date. If needed, create
an **Optimisation queue** with batch, exact IDs, status, owner/date and findings.
Statuses are Not requested, Pending, In progress, Blocked, Awaiting review and
Pass. Preserve implementation completion, history and independent verdicts.

## 2. Establish strategy and a bounded work list

Read the selected cards, existing tests and implementation notes. Read linked
batch findings, related set findings, acceptance criteria and missing essential
evidence; locate artifacts through **Review directory** and its index. Historical
hashes and observation probes describe their original snapshot, not current
approval. For the active set, use `node scripts/batch-brief.js <n>` for printed
text; for another set, query only those IDs from local metadata without changing
the active tracker. Use `node scripts/show.js card <id>` / `fn <name>` and small
`rg -n` windows. Read relevant hook contracts/consumers in `documentation/ai.md`
and the affected side's principles/architecture; consult engine patterns or
the integration guide only for mechanics being repaired. Resolve consequential
rulings using local rules, then primary sources if needed. Do not open card art
or whole metadata, set or AI files.

For every card, establish its strategic role, actual selector/planner consumers
and existing decision evidence. Identify where legal baseline behaviour makes
poor choices: installation versus holding, rez/activation versus conserving
resources, target priorities, scoring/kill opportunities, synergies and the
opposing AI's response. Reuse sound existing evidence; do not rewrite working
cards to demonstrate activity.

Before editing, record a work list of supported findings and concrete strategy
gaps, each with affected IDs, current behaviour, justified expected decision and
acceptance evidence. Include every required review finding and evidence gap.
Without a review, derive this list from the per-card strategy assessment. Verify
claims against current code and reproduce defects; record evidence when a claim
is disproven or already fixed. Distinguish necessary repairs from optional
improvements, and keep newly discovered necessary gaps visible in this pass.

Mechanics revalidation follows reported defects, changed behaviour and affected
interactions. This is not another from-scratch implementation audit. The
independent batch/set review owns the broader correctness verdict.

## 3. Improve decisions and repair supported defects

Change the selected cards and their smallest necessary shared dependencies.
Preserve metadata and exact ELO. Trace each affected decision through legal
options, command/card selection, timing, target and resolution; for passive
cards, follow valuation, scoring, security or run-calculator consumers.

Compare relevant alternatives using current planner metrics and supported game
outcomes. Account for follow-up costs, scarce clicks/credits/counters, expiring
opportunities, finite effects and the opponent's response where it changes the
choice. Avoid title-specific exceptions or arbitrary tuning when existing
resource calculations/rankings suffice. A selectable ability or high ELO is not
evidence of sound strategy.

For gameplay defects, correct the demonstrated rule/timing/state error and
check its affected interactions and cleanup. Add permanent regressions for the
expected outcome; an observation probe asserting bad behaviour is not a green
regression. Move passing pending reproductions into the green suite without
weakening expectations, following repository rules.

Keep planning read-only, safe outside runs and restricted to legally available
information. Verify any changed hook against its consumer. Place card hooks
with existing AI hooks at the bottom and document new/changed hooks in
`documentation/ai.md`, including signature, result, timing and information
constraints. A new hook needs a working call site.

For each strategic change, test the real selector/planner in contrasting states
where the justified decision changes: useful action versus decline, alternative
targets or competing resource use; include immediate wins/losses where relevant.
Assert the command/card/target or planning outcome and explain why it is sound.
Do not stub the path under test. Reuse existing contrasting evidence when it
already covers an unchanged decision; add coverage for the gaps. Run focused
tests as each repair lands.

For shared changes, identify affected consumers and batches requiring
revalidation, including previously passing batches. A dependency materially
beyond the batch needs a precise capability, affected behaviour and repair
criterion; do not silently accept a necessary gap as a limitation.

## 4. Verify and hand off for independent review

Check the work list against current behaviour and permanent regressions.
Completion requires required repairs/evidence to be addressed or concretely
disproved, plus a per-card account of strategic support and any remaining gaps.
Stop when that scope is satisfied; speculative further tuning does not prolong
this pass. A known necessary gap keeps the work unfinished or precisely Blocked.

Run focused tests, the set record's **Required shared verification**, relevant
shared regressions and `node tests/run-all-tests.js` using `.nvmrc`. Include Corp
decision fixtures and decision snapshots; exclude known-red pending reproductions.
Never weaken assertions. If card definitions change, regenerate
`documentation/card-status.md` and check the touched definitions for unfinished
markers. Check repaired mechanics and affected interactions rather than
repeating every card's original mechanics checklist.

After verification passes, mark the optimisation row Awaiting review and clear
its active owner. Append an **Optimisation log** row with date, batch/IDs,
finding IDs, decisions/repairs, tests and remaining re-review scope. Update the
set notes/backlog; append a separate dated **Remediation log** in any linked
batch report, preserving its independent findings and verdict. Queue evidence
revalidation for other affected batches/sets without changing implementation
status. Only `review-card-batch` can award Pass.

If unfinished, retain In progress or Blocked with the exact remaining acceptance
criteria; do not claim completion. Report set/batch/IDs, finding-by-finding
outcome, strategic evidence, test results and remaining gaps, with the exact
`$review-card-batch <set> <batch>` invocation.

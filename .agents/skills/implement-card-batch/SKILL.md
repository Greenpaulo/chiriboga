---
name: implement-card-batch
description: Implement exactly one batch of cards for the active card set tracked in documentation/new-sets/current-set-implementation.md, including AI hooks, focused tests and the tracker update. Use when asked to implement, continue or resume the next card batch or card-set work. Not for the set-wide final review or for setting up a new set.
---

# Implement one card batch

Implement exactly one batch for the active set, then stop. This is an execution
task: work through code, tests and the tracker update, stopping only for a
genuine rules ambiguity or a required change that would materially exceed the
batch. The repository is the handoff; no earlier chat transcript is needed.

Never run this while another agent is editing the active set file or tracker.

## 1. Discover and claim the batch

`documentation/new-sets/current-set-implementation.md` is the only source for
the active set, file paths, card range, batch queue, completion log and required
verification commands. Read everything except the older completion-log rows,
which you only append to.

- If the tracker is `Inactive`, make no card edits and report that no set is
  selected.
- Apply its batch-selection rule exactly (resume `In progress`, otherwise claim
  the first `Pending`; never skip a `Blocked` batch silently).
- When claiming a batch, mark it `In progress`, record your agent name (for
  example `Codex`) and today's date under `Owner / started`, and refresh the
  status-summary counts.
- When the queue links a batch-review report, read its latest findings before
  editing. A reopened batch's repair must address each required finding and its
  decision-level acceptance criteria within the same card range. Preserve the
  report link in the handoff; implementation completion does not replace an
  independent re-review or change the reviewer verdict to Pass.
- Change only the selected card range, except for the smallest shared helper or
  engine fix those cards strictly require.

### Repair a reopened batch

Read the linked batch report's latest findings, per-card evidence gaps and
acceptance criteria, plus the related set-wide findings in the set report.
The tracker’s **Review directory** locates the report/index/probes; follow its
existing links rather than guessing paths. Use the index's artifact retention
and provenance notes when interpreting historical hashes or observation probes.

Make a finding-by-finding repair list with IDs and required evidence. Verify each
claim against current code and reproduce supported defects before changing it;
if a claim is wrong or already fixed, record concrete evidence. Review probes
that assert current bad behavior are diagnostic observations, not green tests.
Add meaningful permanent regressions asserting the justified expected decision
or game outcome, and migrate any passing pending reproduction into the green
suite under the repository rules. Address named missing essential evidence too.

For shared repairs, identify affected consumers and other batches whose evidence
needs revalidation, including previously passing batches. Keep changes within
the selected cards and their necessary shared dependencies. A genuine broader
blocker needs a precise capability/dependency and repair criterion in the tracker.

Append dated remediation notes to a separate **Remediation log** in the linked
batch report: finding IDs, changed behavior/code, regression evidence and
remaining gaps/re-review scope. Keep the independent findings and verdict intact.
Completion still requires focused/shared/full verification and the append-only
tracker completion row; it is not independent review approval.

## 2. Establish context before editing

- Check `git status` and preserve unrelated and pre-existing changes.
- Run `node scripts/batch-brief.js` (or `node scripts/batch-brief.js <n>`). It
  prints each selected card's stats and rules text, where its stub is, and the
  most similar fully implemented cards in other sets. Do not read the metadata
  file directly: it is over 2 MB.
- Read §§5, 6 and 8 of `documentation/new-sets/new-set-integration-guide.md`.
- Read the "Card Object Shape" section of `documentation/engine_patterns.md`,
  then only the sections its table says the selected cards need.
- Read only the `documentation/ai.md` sections the selected cards need, using
  the task table at its top and the §7 quick reference.
- Read each example the brief suggests with `node scripts/show.js card <id>`,
  and each engine function you need with `node scripts/show.js fn <name>`.
  Use targeted `rg -n` searches only when those are not enough, and read small
  windows around the matches rather than whole files. Do not invent engine
  APIs or copy unfinished stubs.
- Card text comes from the brief. Do not open card images, which cost tens of
  thousands of tokens each.
- If the brief's text and local code cannot settle a rule, check the
  Comprehensive Rules PDF in the repo root. Use web sources (NetrunnerDB or Null
  Signal Games) only for a genuine ruling question, and capture consequential
  rulings in a focused test or concise comment.

Roadmaps and work summaries are context, not implemented APIs. For an existing
hook, confirm its contract in `documentation/ai.md` and inspect its current
consumer. Trace the relevant AI path from legal options through command/card
selection, target choice and resolution; for passive effects, trace the
planning or run-calculator consumer. Distinguish eligibility or valuation from
action selection: a hook can allow an action without making the AI choose it.
Check the relevant timing windows, including expiring opportunities and cases
where no immediate target remains. Fixed card lists in a selector can exclude
a new card even when its hooks return the right values.

## 3. Implement every card in the batch

For each card, preserve its metadata and exact existing ELO, and implement:

- every printed cost, restriction and legality condition;
- mandatory and optional choices, cancellation and no-target behaviour;
- triggers, interrupts, prevention and replacement timing;
- turn, run and encounter state, and its cleanup;
- hosting, movement, reveal, access and unusual scoring behaviour;
- AI valuation, timing, targeting and activation hooks, placed with the existing
  AI hooks at the bottom of the card object and documented in
  `documentation/ai.md` (`tests/ai-hook-docs.test.js` checks this);
- accurate run and security modelling for ICE, breakers, bypasses, redirects,
  subtype changes and hosted credits.

Corp-planning hooks must be read-only, safe outside a run, and use only
information legally available to the Corp. Remove a TODO only once the
behaviour and its AI support exist; never hide missing behaviour behind a
silent approximation. Avoid unrelated refactors and formatting churn.

When an existing hook cannot express a required AI decision, add the smallest
shared consumer or new hook within the batch's scope. Implement its engine/AI
call site and document its signature, return value, timing and information
constraints in `documentation/ai.md` in the same change. Defining and
documenting a hook without a working consumer does not provide AI support.

Before accepting a card's AI support, identify its strategic role and the real
alternatives at each decision: install versus hold, rez versus save credits,
activate versus preserve resources, and which target serves the current scoring,
defense or kill plan. Use the existing planner's metrics and public information;
a high ELO, an always-activate flag, or a legal choice alone is not evidence of
good play. Include the opposing AI's response and resource model where relevant.

Add focused tests for human mechanics and meaningful AI behaviour, including
cleanup and negative cases. The set's focused integration test is large: read
its setup (the first 60 or so lines) and the nearest similar test block found
with `rg -n`, then append new blocks at the end. Do not read the whole file.

For AI actions, exercise the real selector with legal options and assert the
chosen command, card and target as applicable. Cover a useful timing window
and a meaningful decline or expired/illegal opportunity; do not stub the
selection path under test. For passive effects, exercise the real planner or
run calculator instead. Add contrasting board states that change the best decision: an immediate win
or loss, a scarce click/credit/counter, and a realistic competing use of the
card. Assert the strategic outcome through the real consumer, not just that the
card is selectable. Explain the reason for the expected choice. Do not invent
numerical tuning where an existing ranking or resource calculation suffices.
Direct hook-return tests are useful supplements;
`ai-hook-docs.test.js` checks documentation coverage, not action selection.

Work card by card: implement one card, run the focused test, then move to the
next. Small failures are cheaper to fix than a batch's worth at once.

## 4. Verify

- Run `node scripts/card-status.js` to regenerate
  `documentation/card-status.md`, then run the focused tests, every command
  under **Required shared verification** in the tracker, and
  `node tests/run-all-tests.js`.
- Rerun `node scripts/batch-brief.js <n>`: every card must show "no unfinished
  markers". Also check the range for empty effects and empty subroutine arrays.
- Never remove or weaken assertions to make tests pass.
- Audit each card against its printed strategic effects and competing actions.
  A missing valuation, ignored scoring cost, or finite effect modelled as a
  permanent lockout prevents completion even when every test is green. Record
  the supported decisions and their contrasting test evidence. If a necessary
  planner change materially exceeds the batch, leave it blocked with the exact
  dependency; do not relabel unfinished AI support as an accepted limitation.
- Record the relevant AI consumers and selection/planning test evidence in the
  set's implementation notes before marking the batch complete.

## 5. Update the tracker and hand off

Strategic card support is delivered in this batch. The set-wide review verifies
that support and catches omissions; it is not the planned implementation stage
for card strategy. "Complete" means well-supported decisions within the current
AI architecture, not a claim of mathematically optimal play.

Only after every card and test in the batch is complete:

1. Mark the queue row `Complete` and refresh the summary counts.
2. Append a completion-log row: date, agent name, focused test files, a concise
   implementation note. Remove the no-completions placeholder for the first
   entry.
3. Update `documentation/new-sets/card-implementation-backlog.md` when
   accepted limitations change.
4. Add consequential rulings, engine changes and AI decisions to the set's
   implementation-notes file named in the tracker.

If blocked, leave the row `In progress` or mark it `Blocked` with the exact,
actionable reason, refresh the counts, and do not add a completion row.

Do not change the set's `hidden`/`untested` registry flags or its row in
`documentation/card-sets.md`; the user decides playability and the flags follow
it. Do not commit, push or discard work. Report the batch and card IDs, important mechanics
and AI decisions, tests and results, limitations, and the next outstanding
batch. For remediation, include finding IDs, report path and the exact independent
re-review needed. Do not overwrite the review log with a repair-completion claim.

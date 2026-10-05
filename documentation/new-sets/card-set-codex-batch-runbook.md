# Card-Set Batch Runbook — Codex

## Execution contract

When the user says to read and follow this document, implement exactly one batch
for the active set in `documentation/new-sets/current-set-implementation.md`. Do not
merely summarize this file or return a plan. Work through implementation, tests
and the shared tracker update, stopping only for a genuine rules ambiguity or a
required change that would materially exceed the selected batch.

The repository is the handoff. Do not require an earlier chat transcript.

## 1. Discover and claim the work

Read `documentation/new-sets/current-set-implementation.md` completely. It defines the
active set, definition and metadata files, card range, batch queue, completion
log and required verification.

- If the tracker is `Inactive`, make no card edits and report that no set is
  selected.
- Follow its batch-selection rule exactly.
- When claiming a `Pending` batch, mark it `In progress`, record `Codex` and the
  current date under `Owner / started`, and refresh the status-summary counts.
- Implement only that batch. Do not edit later stubs except for a narrowly
  required shared helper or engine fix.

Never run this workflow concurrently with another agent editing the active
definition file or tracker.

## 2. Inspect before editing

- Inspect `git status` and preserve unrelated and pre-existing changes.
- Read §§5, 6 and 8 of `documentation/new-sets/new-set-integration-guide.md`.
- Read `documentation/engine_patterns.md` completely.
- Read only the `documentation/ai.md` sections relevant to the selected cards,
  following its table of contents and the hook index.
- Read the selected definitions and their authoritative local metadata/rules
  text using the paths and pack code in the current-set tracker.
- Find the closest implemented cards and actual engine call sites for unusual
  mechanics. Use targeted `rg` searches; do not invent engine APIs.
- If local sources cannot settle a rule, consult current authoritative
  NetrunnerDB or Null Signal Games material and capture consequential rulings in
  a focused test or concise comment.

Roadmaps and work summaries are architectural context, not automatically valid
card APIs. Use a proposed hook only if current documentation and an engine call
site show that it is implemented.

## 3. Implement the complete batch

For every selected card:

- Preserve metadata and exact existing ELO.
- Implement all costs, restrictions, choices, triggers, prevention,
  replacement, hosting, lingering effects and cleanup/reset points.
- Handle cancellation and insufficient-target cases.
- Add all AI hooks needed for valuation, timing, targeting and use. Model ICE,
  breakers and route effects accurately in run/security planning.
- Keep Corp-planning hooks read-only, safe outside runs and free from hidden
  Runner information.
- Add focused tests for human mechanics and meaningful AI behavior, including
  cleanup and negative cases.
- Remove TODOs only when mechanics and relevant AI support are complete. Never
  hide missing behavior behind a silent approximation.

Shared engine changes are in scope only when they are the smallest general
solution required by a selected card and include regression coverage. Avoid
unrelated refactors and formatting churn.

## 4. Verify and hand off

Run all focused tests and every command under **Required shared verification**
in the current-set tracker. Run relevant regression suites for shared engine
changes. Inspect the selected range for TODOs, empty effects and empty
subroutine arrays. Do not weaken tests to make them pass.

Only after all selected cards and tests are complete:

1. Mark the queue row `Complete`.
2. Refresh the tracker summary counts.
3. Append a completion-log row with the date, `Codex`, focused test filenames
   and a concise implementation note; remove the no-completions placeholder
   when adding the first entry.
4. Update `documentation/new-sets/card-implementation-backlog.md` when unfinished-card
   or TODO counts and accepted limitations change.
5. Update `documentation/new-sets/vantage-point-implementation-notes.md`

If blocked, leave the batch `In progress` or mark it `Blocked`, record the exact
actionable reason, refresh the summary and do not append a completion row.

Do not change the set's hidden/untested state during a batch. Do not commit,
push or discard work unless explicitly requested.

Report the batch and IDs, important mechanics/AI decisions, tests and results,
limitations, and the next outstanding batch.

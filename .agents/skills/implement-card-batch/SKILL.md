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
- Change only the selected card range, except for the smallest shared helper or
  engine fix those cards strictly require.

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

Roadmaps and work summaries are context, not implemented APIs. Use a hook only
if current documentation and an engine call site show it exists.

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

Add focused tests for human mechanics and meaningful AI behaviour, including
cleanup and negative cases. The set's focused integration test is large: read
its setup (the first 60 or so lines) and the nearest similar test block found
with `rg -n`, then append new blocks at the end. Do not read the whole file.

Work card by card: implement one card, run the focused test, then move to the
next. Small failures are cheaper to fix than a batch's worth at once.

## 4. Verify

- Run the focused tests and every command under **Required shared
  verification** in the tracker, then `node tests/run-all-tests.js`.
- Rerun `node scripts/batch-brief.js <n>`: every card must show "no unfinished
  markers". Also check the range for empty effects and empty subroutine arrays.
- Never remove or weaken assertions to make tests pass.

## 5. Update the tracker and hand off

Only after every card and test in the batch is complete:

1. Mark the queue row `Complete` and refresh the summary counts.
2. Append a completion-log row: date, agent name, focused test files, a concise
   implementation note. Remove the no-completions placeholder for the first
   entry.
3. Update `documentation/new-sets/card-implementation-backlog.md` when
   unfinished-card counts, TODO counts or accepted limitations change.
4. Add consequential rulings, engine changes and AI decisions to the set's
   implementation-notes file named in the tracker.

If blocked, leave the row `In progress` or mark it `Blocked` with the exact,
actionable reason, refresh the counts, and do not add a completion row.

Do not change the set's hidden/untested registry flags during a batch. Do not
commit, push or discard work. Report the batch and card IDs, important mechanics
and AI decisions, tests and results, limitations, and the next outstanding
batch.

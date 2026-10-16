---
name: implement-card-batch
description: Implement exactly one batch of cards for the active card set tracked in documentation/new-sets/current-set-implementation.md, including working gameplay, baseline AI consumers, focused tests and the tracker update. Use when asked to implement, continue or resume the next card batch or card-set work. Advances to the next queued set after implementation completes. Not for optimisation or independent review.
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
- Review findings for already implemented batches belong in the separate
  optimisation queue and `optimise-card-batch`; never reclaim them here.
- Change only the selected card range, except for the smallest shared helper or
  engine fix those cards strictly require.
- If all batches are `Complete` and **Implementation status** is not yet
  `Implemented`, finish the implementation integration checks in §5 first.
  Once `Implemented`, follow the operator guide's set-transition
  procedure: preserve this set's record and history, select the next set in its
  **Implementation set queue**, prepare its tracker using the integration guide,
  then implement exactly one batch of that set. Do not wait for review or
  optimisation. If no next set is queued, report implementation complete and
  request a set selection; never invent a priority order.

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

Confirm existing hook contracts and real consumers; roadmap proposals are not
implemented APIs. Inspect the selector or planner path needed for each card's
normal use, including command, timing and target. A hook that is never consumed
cannot provide baseline AI support.

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
- run/security representation of the card's direct effects through existing
  model contracts, including costs, finite resources and effect duration.

Corp-planning hooks must be read-only, safe outside a run, and use only
information legally available to the Corp. Remove a TODO only once the
behaviour and its AI support exist; never hide missing behaviour behind a
silent approximation. Avoid unrelated refactors and formatting churn.

When an existing hook cannot express a required baseline AI decision, add the smallest
shared consumer or new hook within the batch's scope. Implement its engine/AI
call site and document its signature, return value, timing and information
constraints in `documentation/ai.md` in the same change. Defining and
documenting a hook without a working consumer does not provide AI support.

### Baseline AI completion standard

For each card, identify its ordinary useful role and provide:

- a working route to play, install, rez or activate it when useful, with legal
  timing and targets; passive effects reach the relevant evaluator instead;
- resource and legality guards, including follow-up costs required to complete
  the action and no-target/expired opportunities;
- representation of direct costs and effects in relevant existing evaluators,
  without treating a finite defense as permanent or spending restricted credits
  illegally;
- a focused test through the real consumer showing useful behaviour, plus the
  relevant negative/cleanup cases. ELO and direct hook-return tests alone are
  insufficient.

Use established rankings and a reasonable heuristic for normal timing/targets.
Completion does not require comparing every competing scoring, kill, defense or
economy plan, anticipating the opponent's response, discovering synergies, or
proving the best decision in every scarce-resource or immediate-win position.
Those are optimisation work. Record specific limitations and affected decisions
in the notes/optimisation queue instead of expanding this stage to perfect them.
For example, selecting a useful legal tutor target with its follow-up cost
covered can satisfy baseline support; choosing the winning tutor sequence over
competing plans belongs to optimisation.

Missing printed mechanics, crashes, illegal actions, incorrect direct-effect
accounting or no usable AI path still block implementation. If an existing
contract cannot represent a direct effect, add the smallest necessary consumer
or hook; a genuinely broader dependency needs an actionable blocker. Limited
strategic foresight alone does not justify an architecture rewrite here.

Add focused tests for human mechanics and meaningful AI behaviour, including
cleanup and negative cases. The set's focused integration test is large: read
its setup (the first 60 or so lines) and the nearest similar test block found
with `rg -n`, then append new blocks at the end. Do not read the whole file.

For AI actions, exercise the real selector with legal options and assert a
representative useful command, card and target as applicable. Include relevant
illegal/no-target/resource guards. For passive effects, exercise the real planner
or run calculator. Do not stub the selection path under test. Add further
contrasts when needed to validate the mechanic; a full strategic audit of every
scarce-resource, immediate-win and competing-use state is an optimisation task.
Direct hook-return tests are useful supplements, not the only AI evidence.

Work card by card: implement one card, run the focused test, then move to the
next. Small failures are cheaper to fix than a batch's worth at once.

## 4. Verify

- Run `node scripts/card-status.js` to regenerate
  `documentation/card-status.md`, then run the focused tests, every command
  under **Required shared verification** in the tracker, and
  `node tests/run-all-tests.js` using the runtime pinned in `.nvmrc`, including
  Corp decision fixtures and decision snapshots (excluding known-red pending
  reproductions).
- Rerun `node scripts/batch-brief.js <n>`: every card must show "no unfinished
  markers". Also check the range for empty effects and empty subroutine arrays.
- Never remove or weaken assertions to make tests pass.
- Verify printed mechanics, the baseline AI standard above, resource accounting and
  state cleanup. Record baseline decision evidence and specific deeper-strategy
  work in the notes and optimisation queue. Review approval is not required.

## 5. Update the tracker and hand off

The **Batch queue** and its summary track implementation only. Never count or
claim rows from the **Optimisation queue** as implementation work.

`Complete` means implemented gameplay and usable baseline AI with required tests
passing. Independent strategic review and optimisation have separate statuses.

Only after every card and test in the batch is complete:

1. Mark the queue row `Complete` and refresh the summary counts.
2. Append a completion-log row: date, agent name, focused test files, a concise
   implementation note. Remove the no-completions placeholder for the first
   entry.
3. Update `documentation/new-sets/card-implementation-backlog.md` and initialise
   the completed batch's separate optimisation row as `Not requested`, or
   `Pending` with specific findings/deeper-strategy work. Preserve existing
   review verdicts and optimisation ownership; never reset them on completion.
4. Add consequential rulings, engine changes and AI decisions to the set's
   implementation-notes file named in the tracker.

If blocked, leave the row `In progress` or mark it `Blocked` with the exact,
actionable reason, refresh the counts, and do not add a completion row.

When the last batch completes, run the implementation integration checklist in
§8 of the integration guide, then mark **Implementation status** `Implemented`.
Under this workflow, completing that checklist authorizes marking the set
`playable` in `documentation/card-sets.md` and setting its registry
`hidden: false`, `untested: false` together. Regenerate card status and run the
relevant focused checks and full suite after those changes. Do not wait for
`review-card-set`; queue review/optimisation independently. Record any failed
integration gate without falsely claiming the set is implemented or playable.

Do not commit, push or discard work. Report the batch and IDs, mechanics and
baseline AI, tests/results, queued optimisation and next implementation batch or
set. Stop after this batch; the next invocation performs any set transition.

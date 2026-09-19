# Card-Set Batch Runbook — External Coding Agents

## Instruction to the agent

When asked to read and follow this document, implement exactly one batch for the
active set defined by `documentation/new-sets/current-set-implementation.md`. This is an
execution task, not a request for a summary or plan. Continue through code,
tests and tracker updates unless an unresolved rule or materially out-of-scope
engine change requires user input.

This runbook is tool-neutral and intended for repository-aware agents such as
Claude Code, Cline or similar VS Code extensions. Repository state replaces
previous chat history.

## 1. Discover and claim the batch

Read `documentation/new-sets/current-set-implementation.md` completely. It is the only
source for the active set name, paths, IDs, batch queue, completion log and
verification commands.

- If its status is `Inactive`, do not infer a set; report that none is selected.
- Apply its batch-selection rule exactly.
- When claiming a pending batch, mark it `In progress`, record the
  agent/extension name and current date, and refresh the summary counts.
- Change only the selected card range except for a minimal shared helper or
  engine fix strictly required by those cards.

Do not operate concurrently with another agent editing the active definition
file or tracker.

## 2. Establish repository context

- Inspect working-tree status. Preserve existing edits and never reset, revert,
  overwrite or broadly reformat unrelated work.
- Obey repository-level agent instructions supplied by the environment.
- Read §§5, 6 and 8 of `documentation/new-sets/new-set-integration-guide.md`.
- Read `documentation/engine_patterns.md` completely.
- Read only relevant sections of `documentation/ai.md`, using its contents and
  the hook index in `engine_patterns.md`.
- Read the selected definitions and matching metadata using the paths and pack
  code in the current-set tracker.
- Inspect the nearest working examples and actual engine call sites. Do not
  invent APIs or copy unfinished stubs.
- When local sources are insufficient, use authoritative current NetrunnerDB or
  Null Signal Games sources and preserve consequential rulings in tests or
  concise comments.

A roadmap proposal is not an implemented hook. Confirm card-facing APIs in the
current hook documentation and engine code.

## 3. Definition of implementation

For every selected card, preserve its metadata/ELO and implement:

- every printed cost, restriction and legality condition;
- mandatory/optional choices, cancellation and no-target behavior;
- triggers, interrupts, prevention and replacement timing;
- turn/run/encounter state and cleanup;
- hosting, movement, reveal, access and unusual scoring behavior;
- AI valuation, timing, targeting and activation hooks;
- accurate run/security modelling for ICE, breakers, bypasses, redirects,
  subtype changes, hosted credits and related effects;
- focused positive, negative, cleanup and meaningful AI tests.

Corp planning may use only information legally available to the Corp, and
out-of-run hooks must not assume active encounter globals. Remove TODOs only
after actual behavior and AI support exist. If general engine support is needed,
add the smallest reusable solution with regression coverage; otherwise leave
the batch unfinished and document the blocker.

Avoid unrelated refactors and formatting churn.

## 4. Verify, log and report

Run focused tests and every command in the tracker's **Required shared
verification** section, plus relevant regression suites for shared engine
changes. Inspect the selected range for TODOs, empty effects and empty
subroutine arrays. Never remove or weaken assertions just to pass.

After everything passes:

1. Mark the queue row `Complete`.
2. Refresh the tracker summary.
3. Append a completion-log row with date, agent/extension, focused tests and a
   concise note; remove the no-completions placeholder for the first entry.
4. Update the general backlog when unfinished counts or limitations change.

If blocked, retain `In progress` or use `Blocked`, record the precise reason,
refresh counts and do not append a completion entry. Do not alter hidden/untested
flags during a batch.

Report completed IDs, important mechanics/AI decisions, tests and results,
limitations and the next outstanding batch. Do not commit, push or discard work
unless the user explicitly requests it.

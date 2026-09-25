# Running a Card-Set Implementation with Coding Agents

This is the user-facing procedure for implementing a large card set through
Codex, Claude Code, Cline or another repository-aware coding agent. The
`implement-card-batch` skill contains the technical instructions; this document
explains exactly what the user should do and say.

## Files and responsibilities

| File                                       | Purpose                                                            | Normally edited by           |
| ------------------------------------------ | ------------------------------------------------------------------ | ---------------------------- |
| `current-set-implementation.md`            | Active set, batch queue, ownership, status and completion evidence | Setup agent and batch agents |
| `.agents/skills/implement-card-batch/SKILL.md` | Set-agnostic one-batch instructions for any coding agent       | Maintainers only             |
| `card-implementation-backlog.md`           | Long-term unfinished work and archived set-level status            | Batch/final-review agents    |
| `new-set-integration-guide.md`             | Definition of done for adding a complete set                       | Maintainers only             |

The checked-out repository is the shared handoff. Agents do not need earlier
chat transcripts when they can read these files and the current worktree.

## Before starting

1. Open the repository root as the agent's VS Code workspace.
2. Confirm `documentation/new-sets/current-set-implementation.md` names the intended
   active set and its file paths are correct.
3. Check that no other agent is currently working on the definition file or
   tracker.
4. Preserve or commit any unrelated work according to your normal Git workflow.
   Agents are instructed not to commit automatically.

Never run two batch agents concurrently. They could both claim the same row or
overwrite the shared set file even if their intended card ranges differ.

## Implement one batch with Codex

Start a new Codex chat in the repository and type:

```text
$implement-card-batch
```

Plain English such as "implement the next card batch" also triggers the skill.
That instruction authorizes one batch only. Codex will read the current-set
tracker, resume an interrupted batch or claim the next pending batch, implement
and test it, and update the queue and completion log.

## Implement one batch with another agent

Agents that do not load `.agents/skills/` automatically can be pointed at the
skill file directly. Start a new agent chat in the same repository and paste:

```text
Read .agents/skills/implement-card-batch/SKILL.md and follow it.
```

The skill is tool-neutral. The extension must be able to read
and edit the workspace and run terminal commands. If it operates in a different
clone, its tracker and prior batch edits will not be shared until Git changes
are transferred.

## After every batch

Do not rely only on the agent's chat response. Inspect the repository:

1. Open `documentation/new-sets/current-set-implementation.md`.
2. Confirm the batch is `Complete`, the summary counts changed and a completion
   log row names focused tests. If it is `Blocked` or `In progress`, read the
   recorded reason before starting another agent.
3. Review the changed cards and focused tests in the diff.
4. Confirm the agent reported all required shared tests passing.
5. Optionally commit the reviewed batch so it becomes a clean recovery point.

Then open a fresh chat and use the same one-line prompt for the next batch. A
fresh chat keeps context smaller; the tracker supplies continuity.

## Resume an interrupted batch

If a session ends while a row remains `In progress`, do not reset it to
`Pending`. Start a new chat and use the normal one-line prompt. The next agent is required to resume the first in-progress batch.

If you know another agent is still actively working, wait for it instead of
starting a second session.

## Handle a blocked batch

Read the blocker in the queue. If you can supply the missing ruling or approve
the necessary scope, start a new chat with the normal prompt plus that one fact. For example:

```text
$implement-card-batch
For the blocked card, use the ruling that <concise ruling or decision>.
```

Do not manually mark the row complete. The agent resolving the blocker must run
the tests, change the status and append the completion evidence.

## Perform the final set-wide review

Completing every batch does not automatically make the set production-ready.
Start a separate chat and paste:

```text
Read documentation/new-sets/current-set-implementation.md and
documentation/new-set-integration-guide.md. All implementation batches should
now be complete. Perform the full set-wide definition-of-done review: audit all
card mechanics and AI hooks, search for unfinished stubs, run focused and shared
tests, validate metadata/images/formats/random decks, update the backlog, and
only remove hidden/untested flags if every requirement passes. Do not silently
accept limitations; report and record any blocker.
```

This is deliberately not part of the one-batch skill. It checks interactions
between batches and decides whether the registry flags can safely change.

## Change to a different active set

Do this only after archiving the old set's final state, or when explicitly
pausing it to change priorities. You can update the tracker manually using the
checklist below, or ask an agent to prepare it.

### Exact setup prompt

```text
Prepare documentation/current-set-implementation.md for <SET DISPLAY NAME>
using pack code <PACK CODE>, registry key <REGISTRY KEY>, definition file
<SET FILE>, and card range <FIRST ID>-<LAST ID>.

Read documentation/new-sets/card-set-agent-operator-guide.md and
documentation/new-set-integration-guide.md. Inspect the metadata and card text,
archive the previous active set's final status in the backlog, create sensible
reviewable batches based on card complexity, reset the completion log, add the
correct set-specific verification commands, and validate that every intended
card ID is covered exactly once without gaps or overlaps. Do not implement any
cards in this setup task.
```

Replace every angle-bracketed value before sending it.

### Tracker fields that must change

In `documentation/new-sets/current-set-implementation.md`, update all of these together:

- `Status` (`Active` or `Inactive`);
- set display name;
- registry key from `setRegistry.availableSets`;
- legacy NetrunnerDB pack code;
- definition and metadata file paths;
- exact intended card range;
- registry state expected during implementation;
- focused integration-test path;
- status-summary counts;
- every row in the batch queue;
- completion log, reset to its empty placeholder;
- set-specific syntax and test commands.

Before replacing the previous tracker contents, preserve its completed-batch
summary, unresolved limitations and final review state in
`documentation/new-sets/card-implementation-backlog.md`.

### Choosing batches

- Use roughly 6–8 straightforward cards per batch.
- Use roughly 4–6 cards when identities, hosting, access replacement,
  prevention, redirects or complex Corp decisions are involved.
- Prefer faction or mechanic boundaries, but split a complex faction.
- Cover every intended ID exactly once.
- Never use overlapping ranges.

## Pause without selecting another set

Set the tracker's `Status` to `Inactive`, preserve the current queue/log in the
backlog or an archived tracker, and do not leave a different set implied by old
paths. The skill will stop safely when the tracker is inactive.

## Minimal recurring workflow

For ordinary operation, the whole user loop is:

1. Ensure no other agent is running.
2. Open a new chat.
3. Type `$implement-card-batch`.
4. Review the diff, tracker entry and tests.
5. Optionally commit.
6. Repeat until all batches are complete.
7. Run the separate final-review prompt.

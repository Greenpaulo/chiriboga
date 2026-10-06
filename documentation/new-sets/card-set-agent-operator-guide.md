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
| `.agents/skills/review-card-batch/SKILL.md` | Independent strategic AI review of an implemented batch | Maintainers only |
| `.agents/skills/review-card-set/SKILL.md` | Full-set review coordinating batch evidence and readiness checks | Maintainers only |
| `reviews/<registry-key>-batch-<n>.md` | Per-card review evidence, findings and verdict for a specific code snapshot | Batch-review agents |
| `history/<registry-key>-<YYYY-MM-DD>.md` | Dated full tracker snapshots, retaining batch boundaries and completion/review history | Setup/final-review agents |
| `reviews/<registry-key>-set-review.md` | Final set-wide evidence, unresolved findings and readiness verdict | Final-review agents |
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

## Review a completed batch's AI support

Use a fresh chat for the independent check:

```text
$review-card-batch Vantage Point 5
```

The skill accepts the set name, registry key or pack code and a batch number.
`$review-card-batch 5` uses the active set. Without a number it selects the earliest
completed batch without a current passing review. An archived set needs preserved
batch boundaries; the agent will ask for exact IDs if those records are missing.
It never substitutes the active set's numbering for a different set.

The reviewer audits every card's strategic choices through real selectors and
planners, including competing actions, resource/scoring budgets, targets and the
opposing AI. It records a per-card verdict and reproducible findings under
`documentation/new-sets/reviews/`. It runs focused and full regression checks,
but green tests alone do not establish strong strategy. Reviews are tied to the
reviewed source/test snapshot; changed consumers require rechecking the evidence.

The review does not repair code. A **Changes required** verdict reopens the active
batch as `Pending`, or `Blocked` for a precise dependency beyond that batch.
`$implement-card-batch` picks up reopened work under its usual selection rule,
then the repaired batch is reviewed again. An **Inconclusive** verdict identifies
the missing evidence and does not count as review approval. Review history is
separate from the append-only implementation completion log.

You can review earlier batches while the last batch is still pending, one chat
at a time. For an existing set, start with the earliest completed batch and work
through the queue. For new batches, review after implementation and before moving
on. Never run a reviewer while an agent is editing the same set file or tracker.

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
Check that every completed batch has a passing strategic review for the current
code and that repairs or inconclusive reviews have been resolved. The final
review still checks interactions across batches and overall integration.
The review must produce evidence for the whole set, rather than another
implementation-completion claim:

1. **Coverage and rules:** account for every intended card, metadata mapping,
   image path and ELO value; compare implemented mechanics with card text and
   current rulings. Exercise timing, cancellation, prevention, restrictions and
   turn/run/encounter cleanup. Record which checks are automated and which are
   manual, including anything not verified.
2. **Strategic AI:** verify current passing batch-review evidence for every
   card. Exercise real selectors and planners with competing actions, resource
   budgets and opposing-side decisions. Recheck evidence affected by later
   shared-engine or AI changes; a hook's existence is insufficient.
3. **Cross-batch interactions:** test shared payment, prevention, hosting,
   access, run-continuation and scoring mechanics together where applicable,
   including interactions with already playable sets. Record the scenarios and
   results so another reviewer can reproduce them.
4. **Integration and regression:** check legal formats and launcher defaults,
   generate legal Runner and Corp decks in every applicable format, run focused
   and shared integration tests, and finish with `node tests/run-all-tests.js`,
   including Corp decision fixtures and decision snapshots. Pending known-red
   reproductions remain outside the green suite.
5. **Recorded verdict:** write `reviews/<registry-key>-set-review.md` with the
   reviewed commit, dirty-worktree state, source/test hashes, per-card evidence
   or links to current batch reports, cross-batch results, commands/results,
   manual checks, findings and a verdict of **Pass**, **Changes required** or
   **Inconclusive**. Preserve earlier review history. Missing evidence means
   Inconclusive; confirmed defects mean Changes required. Reopen affected
   batches with actionable findings, update tracker counts and the backlog,
   and retain the append-only completion log. A repair requires re-review.

A Pass supports a recommendation to mark the set playable. Changing registry
status/flags is a separate action; unresolved blockers or unverified checks must
remain visible, and limitations require explicit user acceptance.

Start a separate chat and use:

```text
$review-card-set Vantage Point
```

Without a set argument, the skill uses the active tracker. It establishes missing
current batch reviews using `review-card-batch`, then checks cross-batch mechanics
and integration and records the final verdict. Independent reviewers may audit
disjoint batches while one coordinator owns the tracker and shared verification;
production code stays unchanged throughout the review. Repairs are handed back
to `implement-card-batch`, followed by re-review. The review does not enable the
set or silently accept limitations.

## Change to a different active set

Do this only after archiving the old set's final state, or when explicitly
pausing it to change priorities. You can update the tracker manually using the
checklist below, or ask an agent to prepare it.

### Exact setup prompt

```text
Prepare documentation/new-sets/current-set-implementation.md for <SET DISPLAY NAME>
using pack code <PACK CODE>, registry key <REGISTRY KEY>, definition file
<SET FILE>, and card range <FIRST ID>-<LAST ID>.

Read documentation/new-sets/card-set-agent-operator-guide.md and
documentation/new-sets/new-set-integration-guide.md. Inspect the metadata and card text,
archive the entire previous tracker under documentation/new-sets/history/ with
its batch boundaries and complete implementation/review logs. Preserve existing
snapshots, adjust relative Markdown links, and link the archive and final review
from the backlog. Create sensible
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
- completion log, reset to its empty placeholder after archiving;
- batch-review log and set-wide review state/links, reset for the new set;
- set-specific syntax and test commands.

Before replacing the previous tracker contents, save a dated full snapshot in
`documentation/new-sets/history/<registry-key>-<YYYY-MM-DD>.md`, including the
entire completion log, batch boundaries, review log and final review state.
Never overwrite an existing snapshot; add a suffix if necessary. Adjust relative
Markdown links, keep linked notes/reports in place, and link the snapshot and
final report from `documentation/new-sets/card-implementation-backlog.md` with a
summary of unresolved findings and explicitly accepted limitations. The next
set starts with an empty live log; the previous set's evidence stays in history.

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

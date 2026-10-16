# Running Card-Set Implementation and Optimisation

The workflow has two independent stages. Implementation delivers working rules
and usable baseline AI, marks the set implemented and playable, and moves on.
Optional optimisation strengthens strategy and repairs review findings, bugs
and edge cases through an optimise/review cycle. Review approval is not a
prerequisite for implementation completion or playability.

## Files and responsibilities

| File | Purpose |
| ---- | ------- |
| `current-set-implementation.md` | Active implementation set, exact batches, verification, separate implementation/optimisation queues and logs |
| `.agents/skills/implement-card-batch/SKILL.md` | Implement one new batch, including baseline AI and tests; transition to a queued next set when needed |
| `.agents/skills/optimise-card-batch/SKILL.md` | Improve one implemented batch and repair supported findings |
| `.agents/skills/review-card-batch/SKILL.md` | Independently audit strategy and mechanics; update optimisation status |
| `.agents/skills/review-card-set/SKILL.md` | Independently audit all batches and cross-batch integration |
| `records/<registry-key>.md` | Maintained set record after implementation moves on, retaining paths, batch boundaries, both queues, verification and logs |
| `history/<registry-key>-<date>.md` | Immutable dated tracker snapshots; never overwrite an old snapshot |
| `reviews/<set-slug>/` | Snapshot-specific reports, probes and results |
| `card-implementation-backlog.md` | Ordered implementation set queue, Set record links and outstanding work |
| `new-set-integration-guide.md` | Mechanics, baseline AI and implementation integration requirements |
| `../card-sets.md` | Playability decisions, matched by registry flags |

The repository is the handoff; earlier chat transcripts are unnecessary. Preserve
unrelated work. Never run implementation, optimisation or review concurrently
against the same set file, consumers or record. Agents do not commit automatically.

## Implement one batch

In a fresh repository chat:

```text
$implement-card-batch
```

Plain English such as “implement the next card batch” works too. Other agents
can read `.agents/skills/implement-card-batch/SKILL.md` directly. The agent resumes
an In progress implementation batch, otherwise claims the first Pending batch,
implements rules and working baseline AI, tests and records completion, then
stops. A first outstanding Blocked batch requires its recorded dependency to be
resolved or an explicit priority change.

Inspect the diff, queue, completion evidence and test results after each batch.
`Complete` means gameplay and baseline AI are implemented; it does not certify
strong strategic review. Baseline support accounts for direct effects, legal
timing/targets and required resources using existing evaluator contracts.
Deeper competing-plan comparisons, synergies and opponent-response planning
are queued for optimisation. No review is required between implementation batches.
If interrupted, use the same prompt to resume the In progress row; do not reset
it while another agent is still working.

After the last batch, the agent runs the integration guide's implementation
checks, marks **Implementation status** `Implemented`, records `playable` in
`documentation/card-sets.md`, sets `hidden: false` and `untested: false` together,
regenerates card status and verifies the final changes. This workflow authorizes
that availability change without waiting for independent review. Failed
implementation checks stay visible and must be resolved before claiming completion.
Review findings discovered later enter optimisation, including rules bugs.

## Change to the next implementation set

On the next `$implement-card-batch` invocation after implementation completes:

1. Select the first Pending entry in the backlog's **Implementation set queue**.
   An explicitly named next set takes precedence. If none is selected, ask for
   the next set; do not infer priorities from registry order. Inactive means
   paused: do not resume or select another set without the user's instruction.
2. Save the entire old tracker as a new immutable dated snapshot in `history/`,
   adding a suffix if the filename exists. Preserve boundaries, both queues,
   completion, optimisation and review logs, set-wide verdict and verification.
3. Save a maintained copy as `records/<registry-key>.md`. Adjust relative Markdown
   links in both copies for their new directories, and retain linked notes and
   evidence. If a maintained record already exists, reconcile its newer
   optimisation/review evidence rather than overwriting it. The backlog's
   **Set record** link must point to this maintained copy. Link the snapshot and
   set report too. Update other current operational links that pointed to the
   outgoing active tracker, including the availability table and review index;
   immutable historical records keep their original provenance.
4. Prepare the new tracker using local metadata, registry and integration guide:
   set name/key/pack, exact IDs, definition and metadata files, notes, review
   directory, integration test and required shared commands. Preserve existing
   implementations. Inspect unfinished mechanics to choose sensible batches,
   usually 6–8 ordinary or 4–6 complex cards, without gaps or overlaps. Inspect
   existing definitions and tests before crediting any already implemented range.
   Initialise **Implementation status** `In progress`, both queues and logs;
   mark the selected set In progress in the backlog. Keep its availability
   in-progress, hidden and untested until implementation checks pass.
5. Implement exactly one batch of the new set, then stop. Setup does not consume
   a second batch, and no review/optimisation of the previous set is required.

For setup only, say “Prepare the tracker for <set>; do not implement cards.”
To pause, set Status Inactive and preserve the queues and logs. To change
priorities mid-set, explicitly name the replacement; archive the interrupted
record first. Never erase outstanding implementation or optimisation work.

## Optimise and review an implemented batch

Use separate chats for implementation and independent review:

```text
$optimise-card-batch Vantage Point 5
$review-card-batch Vantage Point 5
```

Both accept set name, registry key or pack code. A number alone uses the active
set. Optimisation with no batch resumes In progress, otherwise the first Pending
optimisation entry. Review with no batch selects the earliest implemented batch
without current passing evidence. Explicit sets resolve through the backlog's
Set record link, so optimisation of an earlier set continues after implementation
moves on. Never reinterpret another set's batch number using the active queue.
Missing preserved boundaries require exact IDs or a mapping from the user.

Optimisation assesses every card's strategy and establishes a concrete work
list from supported findings and decision gaps. It improves strategy through
real selectors/planners and adds permanent regressions. Mechanics revalidation
follows defects, changed behaviour and affected interactions, rather than
repeating the original implementation checklist. It runs
focused/shared/full verification, appends remediation evidence and marks the row
Awaiting review. Missing essential evidence is part of the work. Shared repairs
identify other batches needing revalidation. The optimiser preserves independent
verdicts; only review can assign Pass.

| Optimisation status | Meaning |
| ------------------- | ------- |
| Not requested | No optimisation currently queued |
| Pending | Findings, improvements or evidence checks queued |
| In progress | Claimed work, with owner and date |
| Blocked | Precise unresolved dependency recorded |
| Awaiting review | Optimisation pass completed; independent review needed |
| Pass | Sufficient independent evidence for the reviewed code snapshot |

Changes required queues Pending repairs (or a precise Blocked dependency).
Inconclusive queues Pending evidence work with an exact criterion. Neither
automatically changes implementation status or availability. Baseline gameplay,
baseline AI and integration defects are required repairs; label them explicitly
in the report and queue, and use bug tickets when separate work is needed.
Preserve historical completion rows/logs and track outstanding defects separately.
Deeper strategic improvements remain optional. Review history stays separate
from append-only completion and optimisation logs. Previously passing evidence needs revalidation when its
consumers change. Reviewers use unchanged code and do not repair it.

## Review the whole implemented set

After implementation, optionally run:

```text
$review-card-set Vantage Point
```

This establishes current per-card and batch evidence, audits cross-batch rules,
AI, legal decks, integration and actual manual coverage, runs verification and
records Pass, Changes required or Inconclusive. Its evidence standard is
unchanged; the verdict describes optimisation readiness independently of the
playability decision. Independent batch agents may work on disjoint reports
while a coordinator owns the set record and shared verification. No production
edits run alongside review.

Findings go to the set's optimisation queue, with baseline defects marked as
required repairs rather than optional improvements. Separately ticketed defects
follow the ticket workflow. For batch repairs, follow with
`$optimise-card-batch <set> <batch>` and `$review-card-batch <set> <batch>` until
passing; re-run set review for remaining cross-batch findings. Implementation of
the next set can proceed without waiting for these reviews or repairs.

## Recurring workflow

1. Run `$implement-card-batch`, inspect the diff and evidence, and repeat until
   the set is Implemented and playable.
2. Record the next set in the implementation queue; the next implementation
   invocation preserves this set and starts one batch of the next.
3. Independently schedule set/batch review and optional optimise/review cycles
   against explicit sets. Preserve open findings across every transition.

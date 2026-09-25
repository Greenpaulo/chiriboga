# Legacy Corp AI planning documents

These are the Corp AI planning documents as they were on 2026-09-25, before the
restructure into `principles.md`, `architecture.md`, `roadmap.md`, `specs/` and
tickets. They are kept only to compare the two styles. **Agents must not treat
anything here as current.**

## Why they were restructured

Each roadmap mixed three kinds of content that change at different rates
(stable principles, descriptions of built behaviour, and plans), repeated the
principles in several places, and duplicated its follow-up specs in backlog
tickets. That had already caused drift: Layer 2.1 was implemented and reviewed
under finding 01, yet the roadmap still said `[FOLLOW-UP]` and its own ticket was
open; the Layer 8.2 ticket asked for behaviour that was already built. Status
was free text (nine variants), so nothing could check it.

## Where each part went

| Legacy content | Now |
|---|---|
| Guiding principles in every roadmap, foundations F1 randomness rules | `../principles.md` (one copy, with the tests that enforce each rule) |
| "Implemented notes" of completed layers; "Reference Engine Hooks & Helpers"; "Regression Validation and Current Limits" | `../architecture.md`, organised by component |
| Install roadmap "Findings from the Current Implementation" | `../architecture.md#install-planning-today` |
| Reactive roadmap "Findings from the current implementation" | `../architecture.md#not-yet-modelled-holding-and-trigger-ordering` |
| Layer, foundation, phase headings and their `[STATUS]` labels | `../roadmap.md`: one entry per item with a fixed status and dependencies |
| Security follow-ups (3.5.1, 4.1, 5.1, 6.1, 7.1, 8.4, 8.5, 8.6) and foundations F2–F4 | Merged into their existing backlog tickets, which are now the only copy |
| Install phases 0–9, reactive phases R1–R2 | `../specs/I0-…` to `../specs/I9-…`, `../specs/R1-…`, `../specs/R2-…` |
| Install architecture, test plan, migration, non-goals, edge cases, definition of done | `../specs/install-decisions-design.md` |
| Reactive relationship, non-goals, architecture, test plan, definition of done | `../specs/reactive-commitment-design.md` |
| "Suggested First Implementation Prompt" | Folded into the I1 spec; the `implement-ticket` skill replaces hand-written prompts |
| `corp-ai_improvement_prompts.md`, `corp_ai_improvement_work_summary.md` | Kept here as history only |
| `corp_ai_review_findings.md` (from `documentation/backlog/`) | Kept here; findings 1–9 are done, 10–13 are roadmap items F2, F3, F4 and P1 |

## Other changes made during the restructure

- `feature-layer-2-1-finite-global-etr.md` was closed as delivered by finding 01
  and moved to `documentation/backlog/done/`.
- `hardcoded-card-titles-still-in-aI-corp-logic.md` was merged into P1 (finding
  13) and removed from the backlog.
- The Layer 8.2 ticket was rescoped to the legibility signals that are still
  missing; its protection-debt interaction moved to L3.5.1.
- `backlog-tickets/` holds the tickets as they were before their specs were
  merged in.

## Files

- `roadmaps/`: the four original roadmaps.
- `backlog-tickets/`: original versions of the tickets that were rewritten or
  removed.
- `corp-ai_improvement_prompts.md`, `corp_ai_improvement_work_summary.md`,
  `corp_ai_review_findings.md`: historical companion documents.

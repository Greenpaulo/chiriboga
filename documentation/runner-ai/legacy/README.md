# Legacy Runner AI planning documents

The Runner AI roadmap as it was on 2026-09-25, before the restructure into
`principles.md`, `architecture.md`, `roadmap.md` and `specs/`. Kept only to
compare the two styles. **Agents must not treat anything here as current.**

## Why it was restructured

The roadmap was a single document mixing findings, principles, architecture,
phases and a suggested first prompt. Its findings were hand-counted
measurements that had already drifted: it reported 194 Runner Grip cards with 90
(46%) never kept, and 8 dead intent hooks. Measured again on 2026-09-25 across
all set files there were 232 cards with 105 never kept and 11 dead intent hooks;
across the playable sets only, 115, 35 and 7. There was no description of how
the Runner AI works today, so every agent had to rediscover it from a
2,900-line file.

## Where each part went

| Legacy content | Now |
|---|---|
| Guiding principles 1, 2, 4, 5 | `../../ai-principles.md` (shared with the Corp AI) and `../principles.md` (the Runner's information boundary) |
| Guiding principles 3 and 6 (centralise needs; explicit beats general beats fallback) | `../specs/hand-keep-design.md`, as rules for the `W` items |
| Findings 1–7 (measured coverage, dead hooks, the Vantage Point three) | Generated in `../../card-status.md#runner-keep-coverage-playable-sets`, so the numbers cannot go stale; code behaviour in `../architecture.md#keep-and-discard-decisions` |
| Proposed architecture, test plan, definition of done | `../specs/hand-keep-design.md` |
| Phases 0–5 | `../specs/W0-…` to `../specs/W5-…`, one file each, listed in `../roadmap.md` |
| Reference hooks and helpers | `../architecture.md#hook-reference` |
| Suggested first implementation prompt | Folded into W0; the `implement-ticket` skill replaces hand-written prompts |
| (new) How the Runner AI works | `../architecture.md`, drafted from the code |
| (new) Title lists and direct `Math.random()` found while documenting | `../roadmap.md` items D1 and D2 |

## Files

- `roadmaps/runner_ai_worth_keeping_roadmap.md`: the original roadmap.

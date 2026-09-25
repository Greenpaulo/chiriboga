# Corp AI documentation

Documentation for the Corp AI (`ai_corp.js`), organised by how often each part
changes so that every fact lives in exactly one place.

| File | Holds | Changes when |
|---|---|---|
| [principles.md](principles.md) | Rules every Corp AI change must obey | Rarely, by explicit decision |
| [architecture.md](architecture.md) | How the implemented system works today | The code changes |
| [roadmap.md](roadmap.md) | One short entry per planned or finished item: status, dependencies, where its spec lives | Priorities or status change |
| [specs/](specs/) | Full specs for `proposed` items that have no ticket yet, plus shared design notes per area | The item is refined |
| `documentation/backlog/` | Full specs for `ready` and later items (tickets) | During implementation |
| [legacy/](legacy/) | The previous roadmaps and companion docs, kept for comparison only | Never |

**Agents:** do not read `legacy/`. For an item, read `principles.md`, the item's
ticket or spec (from `roadmap.md`), the design note it names, and only the
`architecture.md` sections it links to.

## Item lifecycle

| Status | Meaning | Spec lives in |
|---|---|---|
| `proposed` | Worth doing, not yet refined into a ticket | `specs/<ID>-<slug>.md` |
| `ready` | A ticket exists and can be implemented once its dependencies are `done` | `documentation/backlog/` |
| `in-progress` | `implement-ticket` has started it | `documentation/backlog/` (or `code-review/`, `remediation/`) |
| `done` | Reviewed and merged; described in `architecture.md` | `documentation/backlog/done/` (when it had a ticket) |
| `parked` | Deliberately deferred; the entry says why | Either |

Raising a ticket moves the spec file, it does not copy it:
`node scripts/roadmap.js raise <ID>` moves `specs/<ID>-*.md` into
`documentation/backlog/` and sets the item to `ready`.

`node scripts/roadmap.js next` lists items whose dependencies are all `done`.
`tests/corp-ai-roadmap.test.js` keeps statuses, links, tickets and the code
names in `architecture.md` consistent.

## Item IDs

| Prefix | Area | Question it answers |
|---|---|---|
| `L` | Server security | How vulnerable, valuable or urgent is each server? |
| `F` | Foundations | Shared infrastructure (randomness, hypotheticals, caching, simulation) |
| `I` | Install decisions | What should the Corp install, where, and is that better than another action? |
| `R` | Reactive commitment | Is it better to hold or reorder an action for a visible future condition? |
| `P` | Principle debt | Existing code that breaks a principle and must be migrated |

`L` numbers follow the legacy layer numbers so old references still make sense.

## Spec and ticket template

Specs and feature tickets share one template, so raising a ticket needs no
rewriting.

```markdown
# <ID> <Title>

**Roadmap item:** <ID> · **Depends on:** <IDs or none> · **Sets:** <card sets in scope, or "none">
**Read first:** `documentation/corp-ai/principles.md`<, design note>

## Goal
<One paragraph: the behaviour change and why it matters.>

## Current behaviour
<What the code does today, or a link to the architecture.md section.>

## Design
<The intended approach: helpers, hooks, data shapes, compatibility shims.>

## Safety and information boundary
<Constraints specific to this item, beyond principles.md.>

## Test scenarios
1. <Deterministic scenario that must hold.>

## Acceptance gate
<Measurable condition for adopting the change, including any calibration.>

## Things to consider
<Optional: tensions with other items, performance, edge cases.>

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
```

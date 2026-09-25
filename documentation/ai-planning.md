# AI planning: how the roadmaps work

Shared by the Corp AI ([corp-ai/](corp-ai/README.md)) and Runner AI
([runner-ai/](runner-ai/README.md)) documentation. Each area is organised by how
often its content changes, so every fact lives in exactly one place:

| File (per area) | Holds | Changes when |
|---|---|---|
| `principles.md` | That side's rules, on top of [ai-principles.md](ai-principles.md) | Rarely, by explicit decision |
| `architecture.md` | How the implemented AI works today | The code changes |
| `roadmap.md` | One short entry per item: status, dependencies, where its spec lives | Priorities or status change |
| `specs/` | Full specs for `proposed` items, plus shared design notes | The item is refined |
| `documentation/backlog/` | Full specs for `ready` and later items (tickets) | During implementation |
| `legacy/` | Previous documents, kept for comparison only | Never |

**Agents:** never read a `legacy/` folder. For an item, read
[ai-principles.md](ai-principles.md), the side's `principles.md`, the item's
ticket or spec (from `roadmap.md`), the design note it names, and only the
`architecture.md` sections it links to.

## Item IDs

IDs are unique across both areas.

| Prefix | Area | Question it answers |
|---|---|---|
| `L` | Corp: server security | How vulnerable, valuable or urgent is each server? |
| `F` | Corp: foundations | Shared infrastructure (randomness, hypotheticals, caching, simulation) |
| `I` | Corp: install decisions | What should the Corp install, where, and is that better than another action? |
| `R` | Corp: reactive commitment | Is it better to hold or reorder an action for a visible future condition? |
| `P` | Corp: principle debt | Corp code that breaks a principle and must be migrated |
| `W` | Runner: hand keep and discard | Which Grip cards are worth keeping, playing or installing, and which go first? |
| `D` | Runner: principle debt | Runner code that breaks a principle and must be migrated |

## Item lifecycle

| Status | Meaning | Spec lives in |
|---|---|---|
| `proposed` | Worth doing, not yet refined into a ticket | `<area>/specs/<ID>-<slug>.md` |
| `ready` | A ticket exists and can be implemented once its dependencies are `done` | `documentation/backlog/` |
| `in-progress` | `implement-ticket` has started it | `documentation/backlog/` (or `code-review/`, `remediation/`) |
| `done` | Reviewed and merged; described in `architecture.md` | `documentation/backlog/done/` (when it had a ticket) |
| `parked` | Deliberately deferred; the entry says why | Either |

## Commands

Run from the repository root:

```sh
node scripts/roadmap.js next          # items (both areas) whose dependencies are all done
node scripts/roadmap.js list          # every item and its status
node scripts/roadmap.js raise <ID>    # move a proposed item's spec into the backlog as a ticket
```

Raising a ticket moves the spec file rather than copying it, rewrites its
relative links and sets the item to `ready`. `node scripts/ticket.js move`
keeps roadmap links pointing at a ticket as it moves between folders.

`tests/ai-roadmaps.test.js` fails when a status disagrees with where its ticket
lives, a spec or ticket is unlinked or out of template, a dependency does not
exist, or an `architecture.md` names code that does not exist.

## Spec and ticket template

Specs and feature tickets share one template, so raising a ticket needs no
rewriting.

```markdown
# <ID> <Title>

**Roadmap item:** <ID> · **Depends on:** <IDs or none> · **Sets:** <card sets in scope, or "none">
**Read first:** `documentation/ai-principles.md`, `documentation/<area>/principles.md`<, design note>

## Goal
<One paragraph: the behaviour change and why it matters.>

## Current behaviour
<What the code does today, or a link to the architecture.md section.>

## Design
<The intended approach: helpers, hooks, data shapes, compatibility shims.>

## Safety and information boundary
<Constraints specific to this item, beyond the principles files.>

## Test scenarios
1. <Deterministic scenario that must hold.>

## Acceptance gate
<Measurable condition for adopting the change, including any calibration.>

## Things to consider
<Optional: tensions with other items, performance, edge cases.>

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] The Resolution lists the cards updated in each set in scope and confirms none were missed (omit when Sets is "none").
- [ ] The side's `architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
```

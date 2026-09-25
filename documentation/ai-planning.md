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
| `in-progress` | `implement-ticket` has started it, or its reviewed change waits behind a default-off option for its gate | `documentation/backlog/` (or `code-review/`, `remediation/`) |
| `done` | Reviewed and merged; described in `architecture.md` | `documentation/backlog/done/` (when it had a ticket) |
| `parked` | Deliberately deferred; the entry says why | Either |

## Commands

Run from the repository root:

```sh
node scripts/roadmap.js next          # items (both areas) whose dependencies are all done,
                                      # including in-progress items whose ticket is open again
node scripts/roadmap.js list          # every item and its status
node scripts/roadmap.js raise <ID>    # move a proposed item's spec into the backlog as a ticket
```

Raising a ticket moves the spec file rather than copying it, rewrites its
relative links and sets the item to `ready`. It refuses a spec without a
`**Verified against code:**` line, or one whose recorded commit predates a
change to the game or AI code (the root `*.js` files and `sets/`, committed or
not): it lists the changed files; re-verify the spec (below) and update the
line first.

`node scripts/ticket.js move` keeps roadmap links pointing at a ticket as it
moves between folders, and keeps the linked item's status in step: moving to
`code-review/` or `remediation/` sets it to `in-progress`, and moving to `done/`
replaces the entry with a row in its section's **Done** table. The row's
Architecture cell comes from the first link in the ticket to that area's
`architecture.md`; if there is none, the script says so and the roadmap test
fails until the cell is filled.

`tests/ai-roadmaps.test.js` fails when a status disagrees with where its ticket
lives, a spec or ticket is unlinked or out of template, a dependency does not
exist, or an `architecture.md` names code that does not exist.

## Re-grounding a spec

Specs are written against the code of their day and go stale as other work
lands. Before raising a spec, and again when `implement-ticket` picks the
ticket up, check every claim in **Current behaviour** and every function, hook
or field the spec names against the current code (`node scripts/show.js fn
<name>`, `rg -n`). Fix what is stale in the spec, or stop and report when the
premise no longer holds, then set the header line to the commit checked:

```markdown
**Verified against code:** <short sha> (<date>)
```

## Acceptance gates

An item whose goal is to play better, rather than to reproduce a fixed
decision, is **gated**: deterministic tests cannot show that the change helps,
so its **Acceptance gate** decides adoption from seeded games run with the F4
harness ([corp_ai_finding_12_seeded_batch_harness.md](backlog/corp_ai_finding_12_seeded_batch_harness.md)).
A gated item:

- keeps its deterministic **Test scenarios**;
- lists F4 in **Depends on**;
- names in its gate the metrics (F4's core metrics, or collectors the item adds
  through F4's collector extension point and lists in its criteria), the
  direction and a threshold for each. Words such as "better", "material" or
  "reduce" need a number;
- is judged by F4's comparison rule: paired seeds, deck pairs from the committed
  deck pool, 200 games per deck pair unless the gate says more, and a bootstrap
  95% confidence interval per metric. The gate passes when no guarded metric's
  interval admits a regression beyond its tolerance and, for an improvement,
  the interval's lower bound is above zero;
- carries the two gate criteria shown in the template below, without their
  "(Gated items)" prefix. Ungated items delete them.

A gate that needs human games instead of F4 (for example L8.6) states its
sample size, metrics and thresholds the same way.

A change that must be behaviour-identical (a pure refactor) is not flagged.
Its gate criterion is instead: decision snapshots are identical to the recorded
baseline except for listed, justified deltas.

**AI options.** Neither `CorpAI` nor `RunnerAI` has an options mechanism yet;
the first gated item adds one with this convention. The class gets a frozen
defaults object (`CorpAI.DEFAULT_OPTIONS`, `RunnerAI.DEFAULT_OPTIONS`) that the
constructor copies into `this.options`. The change reads
`this.options.<camelCaseName>`, which defaults to `false`; its deterministic
tests set the option on the instance under test, and F4 runs the candidate with
it on. Gate evidence is the only thing that justifies switching the default to
`true`.

## Spec and ticket template

Specs and feature tickets share one template, so raising a ticket needs no
rewriting.

```markdown
# <ID> <Title>

**Roadmap item:** <ID> · **Depends on:** <IDs or none> · **Sets:** <card sets in scope, or "none">
**Read first:** `documentation/ai-principles.md`, `documentation/<area>/principles.md`<, design note>
**Verified against code:** <short sha> (<date>)

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
<Measurable condition for adopting the change. Gated items: F4 metrics,
direction and threshold for each (see Acceptance gates above).>

## Things to consider
<Optional: tensions with other items, performance, edge cases.>

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] (Gated items) The behaviour change ships behind an AI option that defaults to off (named in the Resolution).
- [ ] (Gated items) Gate evidence is recorded in the Resolution: F4 command, deck pairs, seed count, metrics, baseline vs candidate, and the threshold met. Only then is the option switched on by default.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] The Resolution lists the cards updated in each set in scope and confirms none were missed (omit when Sets is "none").
- [ ] The side's `architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
```

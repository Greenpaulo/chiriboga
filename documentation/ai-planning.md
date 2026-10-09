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
| `ready` | A ticket exists; it is actionable when neither a generated `## Blocker` nor an unmarked `## Additional blocker` section is present | `documentation/backlog/` |
| `in-progress` | `implement-ticket` has started it, or its reviewed change waits behind a default-off option for its gate | `documentation/backlog/` (or `code-review/`, `remediation/`) |
| `done` | Reviewed and merged; described in `architecture.md` | `documentation/backlog/done/` (when it had a ticket) |
| `parked` | Deliberately deferred; the entry says why | Either |

## Commands

Run from the repository root:

```sh
node scripts/roadmap.js next          # items (both areas) whose dependencies are all done,
                                      # including in-progress items whose ticket is open again
node scripts/roadmap.js list          # every item and its status
node scripts/roadmap.js blockers      # blocked tickets and stale/missing blocker headers
node scripts/roadmap.js blockers --fix # mechanically refresh those headers
node scripts/roadmap.js raise <ID>    # move a proposed item's spec into the backlog as a ticket
```

Raising a ticket moves the spec file rather than copying it, rewrites its
relative links and sets the item to `ready`. It refuses a spec without a
`**Verified against code:**` line, or one whose recorded commit predates a
change to tracked root `*.js` files or JavaScript under `sets/`. Untracked
JavaScript under `sets/` also counts, while arbitrary untracked root files do
not. It lists the changed files; re-verify the spec (below) and update the line
first.

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

## Blocked tickets

A ticket is blocked when its next required step cannot proceed because a
declared roadmap dependency is not `done`. A `**Gate:** pending <ID>` line in a
ticket's Resolution creates the same relationship for gated bugs that do not
have their own roadmap item.

Blocked tickets stay in `documentation/backlog/` or `documentation/bugs/`;
folders record workflow stage, while blocking is derived from dependencies.
`roadmap.js blockers --fix` puts a generated `## Blocker` section immediately
below the ticket metadata and removes it when the dependencies are done. Do
not edit that marked section by hand. `ticket.js move` and `roadmap.js raise`
refresh all generated blocker sections automatically, and
`tests/ai-roadmaps.test.js` rejects stale, missing or obsolete sections.

Use an ordinary, unmarked `## Additional blocker` section for a condition that
cannot be derived from the roadmaps or a pending gate, such as an owner
decision. Its author is responsible for removing it when that condition
changes.

## Re-grounding a spec

Specs are written against the code of their day and go stale as other work
lands. Before raising a spec, and again when `implement-ticket` picks the
ticket up, check every claim in **Current behaviour** and every function, hook
or field the spec names against the current code (`node scripts/show.js fn
<name>`, `rg -n`). Fix what is stale in the spec, or stop and report when the
premise no longer holds, then set the header line to the commit checked.
The full procedure, including re-checking the gate classification, is
`.agents/skills/reground-spec/SKILL.md`.

```markdown
**Verified against code:** <short sha> (<date>)
```

## Acceptance gates

The owner's guide to gates (why, who does what, how to read results) is
[judging-ai-changes.md](judging-ai-changes.md). `node scripts/roadmap.js gates`
lists gated items by what is left to do.

Every AI-behaviour spec and ticket must contain the exact, unnumbered headings
`## Acceptance gate` and `## Acceptance criteria`; workflow scripts parse them
literally. Absence never means ungated. An objectively correct change records
`N/A — deterministic fix (principle 4): <the rules, legality,
information-boundary or invariant oracle>`. A strategic preference records a
measurable gate as described below. Ticket/spec creation makes this decision,
`reground-spec` rechecks it against current code, and `implement-ticket`
normalizes older or manually created tickets before planning.

An item whose goal is to play better, rather than to reproduce a fixed
decision, is **gated**: deterministic tests cannot show that the change helps,
so its **Acceptance gate** decides adoption from seeded games run with the F4
harness ([corp_ai_finding_12_seeded_batch_harness.md](backlog/done/corp_ai_finding_12_seeded_batch_harness.md)).
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
  interval admits a regression beyond its tolerance. For an improvement,
  first orient the paired difference so positive always means better
  (`candidate - baseline` for higher-is-better metrics, `baseline - candidate`
  for lower-is-better metrics), then require the interval's lower bound to be
  above zero;
- carries the three gate criteria shown in the template below, without their
  "(Gated items)" prefix, plus one criterion per collector or start board it
  builds. Ungated items delete them.

A gate that needs human games instead of F4 (for example L8.6) states its
sample size, metrics and thresholds the same way.

### Writing a gate

Every `## Acceptance gate` section uses exactly one of these three forms, so
gates read the same everywhere and an agent can turn one into a command
without interpretation. `triage-log`, spec creation, `reground-spec` and
`implement-ticket` all write or normalise to this template.

**1. Objective change (ungated):**

```markdown
## Acceptance gate
N/A — deterministic fix (principle 4): <the rules, legality, information-boundary or invariant oracle>.
```

**2. F4 gate (seeded AI-vs-AI games):**

```markdown
## Acceptance gate
F4 gate. Option `<camelCaseName>` (<Corp | Runner> AI), off in the baseline
and on in the candidate. Committed deck pool, paired seeds, 200 games per deck
pair <or more: say how many and why>, bootstrap 95% intervals.
Collectors: <`name` (adds `name.metric`, defined in this ticket) | none>.
Starts: <`--start-tag` tags selecting boards in `tests/fixtures/ai-batch/starts/`, plus boards this ticket builds with `scripts/start-board.js` | none>.

| Check | Metric | Better | Threshold |
|---|---|---|---|
| Improve | `<metric>` | <lower/higher> | interval of the improvement above 0 |
| Guard | `winRate` | <higher for Corp, lower for Runner> | regression at most 0.02 |
| Guard | `<points metric of this side>` | <direction> | regression at most 0.2 |
| Guard | `<other metric this change could hurt>` | <direction> | regression at most <n> |
| Hard check | `<collector metric counting violations>` | — | at most <n> in every candidate game |

Gate command: `node scripts/ai-batch.js gate --corp-option <name>=true
--collector <name> --start <fixture> --improve <metric> --guard winRate=0.02
--guard <metric>=<n> --max <metric>=<n>`
```

Rules for form 2:

- **Improve rows** state what the change is for. Use at least one, unless the
  item only has to avoid regressions (then say so in one line).
- **Standard regression guards.** Every F4 gate guards `winRate` (0.02, two
  percentage points) and the points metric the change could hurt on its side:
  `pointsStolen` for Corp items that touch defence, `pointsScored` for Corp
  items that touch scoring, or both when in doubt (0.2 points per game).
  A Runner item guards the same metrics from the Runner's side and adds
  `--side runner` to the command, which flips their directions. Tolerances
  differ from these defaults only with a stated reason.
- **Direction.** Each row names the better direction. Core metrics have
  defaults (`metrics.js`); a collector metric declares its own `directions`,
  or the command adds `--better <metric>=higher|lower`.
- **Hard checks** are conditions that must hold in every game, not on average.
  Express them as a collector metric counting violations, checked with
  `--max <metric>=<n>`.
- **Ceiling rows** bound a batch-level metric that exists only over the whole
  batch (for example `bluffSingleVariableCorrelation.max`): `--ceiling
  <metric>=<n>` requires the candidate's interval upper bound to be at most
  `n` ([ai-batch-harness.md](ai-batch-harness.md#for-agents-adding-a-metric)).
- **Latency is not a standard guard** (F9 proposes a deterministic work guard
  in its place). `gate` may reuse a cached baseline
  timed on a differently loaded machine, so a latency guard is only meaningful
  for a performance item that plays both halves fresh in one run.
- **Gate setup is part of the item.** Every collector and start board the
  gate names is built and tested by the item itself, and gets its own
  acceptance criterion, before the item moves to code-review. The setup is
  ready when a `--quick` run of the gate command completes and its first
  line reports at least one game changed by the options. `gate` fails any
  gate whose option changed no game (`FAIL changed option effect`), because
  every guard passes trivially then. When the option only matters on boards
  the deck pool rarely reaches, the item adds `Starts:` boards that reach it.
- **Start boards come from real games where possible.** A board invented to
  trigger the option measures the option on a situation that may never
  occur. Extract it from the ticket's source log or another debug log
  (`node tests/extract-fixture.js <log> --list`), or reuse a corp-decision
  fixture already extracted from one. If no log has the situation, adapt the
  closest real board and keep the change minimal. A start board may use only
  cards from the pool's trusted sets (`sets` in the pool file); `--start`
  rejects any other card. A real board with an untrusted card is adapted by
  swapping it for a trusted card with the same role, and if that is not
  possible it cannot be used. Every start board's `NOTE` names the log it came
  from, or says what was changed or invented and why the result is a
  realistic position.
- **One command per game set.** Starts replace the opening, so a gate that
  guards the pool and measures an improvement on start boards has one gate
  command per set, each with its own rows. It passes only when every command
  passes. Metrics pool across every `--start` board in one command, so a row
  that must hold on one board (an improvement on one card's boards, or a
  per-game threshold) needs a command of its own. Each command costs a full
  baseline and candidate run (about 2 × 8 minutes with `--budget 1400`), so
  use as few commands as the rows need. A command over a set the
  option never changes (often the deck pool, for a board-specific option)
  fails `changed option effect`. Record that no game changed instead of
  running it.
- **Start boards come from real boards.** Build them with
  `scripts/start-board.js` from a log's decision snapshot or dump
  ([ai-batch-harness.md](ai-batch-harness.md#building-a-start-board)). It
  allows only the changes needed for the game to run (a crashing card, a
  card outside the pool's sets) or to restore the moment before the
  decision, records each one, and tags the board. A board gate selects
  boards with `--start-tag` and runs with `--budget 1400`, so it costs one
  baseline and one candidate run however many boards match. Never change the cards that decide whether the candidate is right,
  such as the Runner's breakers or the ICE involved. If the real board does
  not reach the option, that is evidence about the option's design: report
  it rather than editing the board until the option fires.
- **No conditional rows.** A row cannot say "unless" or depend on another
  row's result. Rewrite the condition as plain rows; if one branch is
  certain, keep only the other branch.
- **Gate command** is the exact command the table implies; one flag per row.
  `implement-ticket` runs it and records its output; see
  [ai-batch-harness.md](ai-batch-harness.md#running-a-gate).
- **Thresholds are set before the gate runs and never changed after seeing a
  result.** The committed baseline under `tests/fixtures/ai-batch/baselines/`
  shows how much each metric varies, for calibrating them first.

**3. Human-game gate:**

```markdown
## Acceptance gate
Human gate. Option `<camelCaseName>` (<Corp | Runner> AI), off by default.
Sample: <n> games against human players, <how they are recorded>.

| Check | Metric | Better | Threshold |
|---|---|---|---|
| Improve | `<metric>` | <direction> | <threshold> |
| Guard | `<metric>` | <direction> | <threshold> |
```

The line must start with `Human gate`; `roadmap.js gates` reads it.

A change that must be behaviour-identical (a pure refactor) is not flagged.
Its gate criterion is instead: decision snapshots are identical to the recorded
baseline except for listed, justified deltas.

**AI options.** Each AI class has a frozen defaults object
(`CorpAI.DEFAULT_OPTIONS` in `ai_corp.js`, `RunnerAI.DEFAULT_OPTIONS` in
`ai_runner.js`) that the constructor copies into `this.options`. A gated item
adds its option there and reads `this.options.<camelCaseName>`, which
defaults to `false`. Its deterministic tests set the option on the instance
under test, and F4 runs the candidate with it on (`--corp-option <name>=true`
or `--runner-option <name>=true`; see
[ai-batch-harness.md](ai-batch-harness.md)). Gate evidence is the only thing
that justifies switching the default to `true`.

### When a gate fails

A gated ticket tests one idea; a failed gate answers it. So:

- **The ticket closes.** It moves to `done/` with
  `**Outcome:** not adopted — gate failed <date> (<the deciding metric>)`
  directly under its title, and `**Gate:** failed — `<option>` removed.`
  in its Resolution with the evidence. A roadmap item it belongs to becomes
  `parked` (with the reason), or is replaced by a new item for the next idea.
- **The failed behaviour is removed in the same change:** the option, its
  branch and the tests that exist only for it. Git history keeps them.
  Anything useful without the idea stays: logging, harness events,
  collectors, real start boards, tools.
- **The next idea is a new ticket** that links back for the evidence and
  carries its own gate. A reproduction whose expected choice the idea
  needed moves back to `tests/pending/` under that ticket, expectation
  unchanged.

Every ticket carries an `**Outcome:**` line under its title once it leaves
open work (`adopted`, `not adopted — <why>`, or `blocked — <what>`), so its
state can be read without reading the ticket.

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
<One of the three forms in "Writing a gate" above: the N/A line, the F4 gate
table with its gate command, or the human gate table. Never omit this
section.>

## Things to consider
<Optional: tensions with other items, performance, edge cases.>

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] (Gated items) The behaviour change ships behind an AI option that defaults to off (named in the Resolution).
- [ ] (Gated items) The gate is ready to run: every collector and start board it names exists and is tested, and a `--quick` run of each gate command completes and reports at least one game changed by the options.
- [ ] (Gated items) Applicable gate evidence is recorded in the Resolution.
      For F4: exact command, committed deck pairs, paired seeds, seed count,
      every metric's baseline/candidate result and bootstrap 95% confidence
      interval, guarded-regression result, pass conditions and thresholds; an
      improvement interval's lower bound must be above zero. For a human-game
      gate: sample size, metrics, observed results, pass conditions and
      thresholds. Only then is the option switched on by default.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] The Resolution lists the cards updated in each set in scope and confirms none were missed (omit when Sets is "none").
- [ ] The side's `architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
```

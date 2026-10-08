# Process Workflows

How to run Chiriboga work through coding agents without wasting your limited
Codex usage. The rule of thumb:

- **Claude chat** (free, reads the repo on GitHub) does triage only: it turns
  a debug log into a ticket and a drafted reproduction.
- **CodeRabbit** (on GitHub) reviews every pull request against the
  `review-ticket` rubric; its rules are in `.coderabbit.yaml`.
- **Codex** (limited) implements tickets, writes plans and addresses review
  comments.
- **Scripts** (free) do the mechanical checks.

You do not need to remember skill names: plain English ("fix this ticket")
works in Codex. The triage prompt for Claude chat is below to copy.

Why the workflow is set up this way is explained in
[working-with-agents.md](working-with-agents.md).

## ⚡ Quick reference

| Step | Where | You do | You get |
|---|---|---|---|
| 1. Triage a log | Claude chat | Commit and push the log, then paste **prompt T** | A ticket and a drafted reproduction to save into the repo; commit and push them |
| 2. Fix | Codex, new chat | `$implement-ticket <ticket>` | The reproduction confirmed, the fix, and the ticket in `code-review/` (or a plan to approve first) |
| 3. Check | Terminal | `node scripts/ticket.js check <ticket>` | PASS/WARN/FAIL lines, the changed files and a review link |
| 4. Review | GitHub (CodeRabbit) | Commit, push and open a PR whose description names each ticket under review and pastes its check output | Inline findings, and a "Ticket review evidence and move" pre-merge check giving each ticket's verdict and move command (rules in `.coderabbit.yaml`) |
| 5. Finish | Codex, then terminal | `$address-pr-review <PR>` for any findings, on the same PR; once CodeRabbit approves, merge the PR, then run each ticket's post-merge move command and commit the ticket move | The ticket in `done/`, or back in the open ticket root with a generated blocker when review passes but its gate is pending |
| Gate (fallback) | Terminal | Only if Codex handed off with `**Gate:** pending F4` because the gate could not finish in its session: run the `**Gate command:**` from the ticket's Resolution (about 15–20 min), then `$implement-ticket <ticket>` with the output | The result recorded and the option switched on if it passed |
| Card batch | Codex, new chat | `$implement-card-batch` | One batch done and the tracker updated; see the [operator guide](new-sets/card-set-agent-operator-guide.md#after-every-batch) |
| Card batch review | Codex, fresh chat | `$review-card-batch <set> <batch>` | Independent per-card AI evidence and verdict; incomplete batches reopened for repair |
| PR feedback | Codex, PR branch | `$address-pr-review <PR>` | Each review comment verified and accepted, adapted, rejected or marked obsolete; supported fixes applied and tested |

Codex can also do steps 1 and 4 itself (`$triage-log <log>`, `$review-ticket
<ticket>`), but they are its most reading-heavy tasks. `$review-ticket` is the
fallback when a ticket needs a deeper look than CodeRabbit gave it.

The review record is the pull request: CodeRabbit's comments and its "Ticket
review evidence and move" check. No Code review section is added to the
ticket. A ticket goes to `remediation/` only when you decide the approach
itself must be redone rather than fixed on the PR. Then add the reasons to the
ticket before moving it, because `implement-ticket` works from what the
ticket records.

### Prompt for Claude chat

**Prompt T: triage**

```text
In the chiriboga repo, read .agents/skills/triage-log/SKILL.md and follow its
Draft mode for documentation/debug-logs/<file>.
```

**Prompt P: plan a risky ticket (optional, before step 2)**

```text
In the chiriboga repo, read .agents/skills/implement-ticket/SKILL.md and, for
documentation/bugs/<file>, write only the "## Implementation plan" section its
Plan gate step describes. Do not implement anything.
```

Save the plan into the ticket, change **Awaiting approval** to **Approved**
when you agree with it, and Codex will follow it.

### Keeping Codex usage down

- **One ticket per chat.** End the chat at hand-off. Every step re-sends the
  whole conversation, so long sessions cost the most: the five longest used
  31% of all tokens so far.
- **Point at paths.** Name files instead of pasting logs or code into the chat.
- **Approve plans in the same chat**, so Codex does not re-read everything.
- **Leave the reasoning level alone.** Reasoning and output are under 0.5% of
  usage; the cost is context, not thinking.
- **Keep tests quiet.** They print only failures and a summary. Use
  `VERBOSE=1` only when you need detail.

## 🎫 Ticket lifecycle

A ticket's folder is its workflow status. There is no separate status line.
Whether work can proceed is separate: a prominent generated `## Blocker`
section means a roadmap dependency or recorded gate is unresolved.

```text
debug-logs/<log>
   │  triage (Claude chat draft, or Codex)
   ▼
bugs/  ──implement-ticket──▶  bugs/code-review/  ──PR approved──▶  bugs/done/
                                    │  ▲
                 CodeRabbit findings│  │address-pr-review (same PR)
                                    ▼  │
                                  PR comments

bugs/code-review/ ──approach rejected by you──▶ bugs/remediation/ ──implement-ticket──▶ bugs/code-review/

bugs/code-review/ ──pass, gate pending──▶ bugs/ (generated blocker)
```

Backlog tickets follow the same path under `documentation/backlog/`, starting
from a ticket you write instead of a debug log. Move tickets with
`node scripts/ticket.js move <ticket> <open|code-review|remediation|done>`.
Here `open` means the root `documentation/bugs/` or `documentation/backlog/`
folder, not a folder named `open`. A review that passes while its F4 or human
gate is still pending moves the ticket to `open`, not `done`; the move command
uses its `**Gate:** pending ...` line to add or refresh the generated blocker.
The move command refreshes generated blocker headers. To inspect or repair
them directly, run `node scripts/roadmap.js blockers` or
`node scripts/roadmap.js blockers --fix`; the roadmap regression test prevents
stale headers from being committed.

### Approving a plan

`implement-ticket` stops and writes an `## Implementation plan` into the ticket
when a change is risky: it touches shared AI heuristics or widely used engine
functions, changes a hook contract or an existing test expectation, spans more
than three files, or the agent disagrees with the ticket. Read the plan, then
reply "approved" to continue, or say what to change. Small, local fixes go
straight through. Say "plan first" or "no plan" to override. A plan already in
the ticket and marked **Approved** is followed without stopping.

### Drafted reproductions

A reproduction drafted in Claude chat is marked *drafted, not yet run*.
`implement-ticket` runs it before changing any code. If it does not fail for
the stated reason, the diagnosis is wrong and the ticket goes back for
triage.

## 🃏 Card sets

Card-set implementation runs one batch at a time from
`documentation/new-sets/current-set-implementation.md`. See
[card-set-agent-operator-guide.md](new-sets/card-set-agent-operator-guide.md)
for setup, blocked batches and the final set-wide review. Each batch must deliver
strategic AI support alongside mechanics, including tests of useful activations,
resource tradeoffs, targeting and competing actions through the actual selectors
or planners. The final review verifies that support; it is not where unfinished
card strategy is scheduled. Use `$review-card-batch <set> <batch>` for an
independent strategic audit of a completed batch; findings and snapshot evidence
are recorded under `documentation/new-sets/reviews/`, and necessary repairs
reopen the implementation queue. A necessary AI dependency that exceeds a batch's
scope blocks completion and must be recorded in the tracker.

## 🗺️ Roadmaps

AI planning is split by side, `documentation/corp-ai/` and
`documentation/runner-ai/`, and shares
[ai-planning.md](ai-planning.md) (lifecycle, IDs, template, commands) and
[ai-principles.md](ai-principles.md) (rules for both AIs). Each side has:

- `principles.md`: its own rules, above all its information boundary;
- `architecture.md`: how that AI works today;
- `roadmap.md`: one short entry per item, with a fixed status
  (`proposed`, `ready`, `in-progress`, `done`, `parked`);
- `specs/`: the full spec of each `proposed` item, until it becomes a ticket.

To pick the next piece of work, run `node scripts/roadmap.js next`. To turn a
proposed item into a ticket, re-verify its claims against the current code and
run `node scripts/roadmap.js raise <ID>`, which moves its spec into
`documentation/backlog/`; then use `implement-ticket` as
usual. Previous versions are kept in each side's `legacy/` folder for
comparison.

Items meant to make an AI play better are **gated**: they ship switched off and
are switched on only when seeded AI-vs-AI games (F4) show they meet numbers set
in advance. What that means, what you do at each step and how to read the
results is in [judging-ai-changes.md](judging-ai-changes.md);
`node scripts/roadmap.js gates` lists which items need a gate run.

Every AI-behaviour spec or ticket carries the exact, unnumbered
`## Acceptance gate` and `## Acceptance criteria` headings. Objective changes
say `N/A` and name their rules or invariant oracle; strategic preferences name
a measurable gate. `triage-log` and spec creation classify new work,
`reground-spec` rechecks that classification, and `implement-ticket` adds or
corrects the sections on older and manually created tickets before planning.
A missing section is never shorthand for ungated.

## 🧾 Helper scripts

Free, deterministic steps that agents (and you) run instead of reading files:

| Command | Prints |
|---|---|
| `node scripts/batch-brief.js [n]` | The next (or nth) card batch: each card's stats and text, where its stub is, unfinished markers, and similar implemented cards |
| `node scripts/show.js card <id>` | One card definition |
| `node scripts/show.js fn <name>` | One engine or AI function |
| `node scripts/ticket.js check <ticket>` | The mechanical review checks for a fixed ticket |
| `node scripts/ticket.js move <ticket> <open\|code-review\|remediation\|done>` | Moves a ticket to the open family root, review, rework, or completed stage respectively, keeping linked roadmap state, links and generated blockers in step |
| `node scripts/ticket.js next bugs` | Open bug tickets that have no generated or manually recorded blocker |
| `node scripts/ticket.js list` | Actionable bugs and backlog tickets, blocked tickets, code review, and remediation grouped in one view |
| `node scripts/roadmap.js next` | Corp and Runner AI roadmap items whose dependencies are all done (including in-progress items whose ticket is open again) |
| `node scripts/roadmap.js list` | Every AI roadmap item and its status |
| `node scripts/roadmap.js blockers [--fix]` | Blocked tickets and stale generated headers; `--fix` adds, updates or removes the headers |
| `node scripts/ai-game.js [--seed s \| --seeds a-b]` | Plays seeded AI-vs-AI games headlessly (default Duel PD vs Tao) and prints one JSON line per game: winner, turns, time, points, a log fingerprint and any engine errors |
| `node scripts/ai-batch.js [--pairs ids] [--games n]` | Plays the committed deck pool (200 seeds per pair by default) and writes a JSON report; prints each pair's Corp win rate with its 95% range. See [ai-batch-harness.md](ai-batch-harness.md) |
| `node scripts/ai-batch.js gate --corp-option <name>=true ...` | Runs a gate: the all-off baseline (reused when cached) against the candidate, then a PASS/FAIL line per gated metric and `Gate: passed` or `failed` |
| `node scripts/roadmap.js gates` | Every item with an acceptance gate, grouped by what is left to do (gates waiting to run, failed, not built); see [judging-ai-changes.md](judging-ai-changes.md) |
| `node scripts/roadmap.js raise <ID>` | Moves a proposed item's spec into the backlog as a ticket; refuses one not re-verified against the current code |
| `node scripts/card-status.js` | Regenerates `documentation/card-status.md`: per-set card counts, missing definitions, scaffold markers, missing required AI hooks, AI hook counts, config disagreements, Runner keep coverage |

## 🛡️ Guardrails

- **Stop hook** (`.codex/hooks.json` → `scripts/agent-hooks/verify-on-stop.js`):
  when code or tests have changed, Codex cannot finish a turn while
  `node tests/run-all-tests.js` fails. It is sent back to fix the failure up to
  twice, then must report it. Codex asks you to trust the hook (or use `/hooks`)
  the first time and again whenever the hook file changes.
  The repository pins Node in `.nvmrc`. The hook resolves that installed nvm
  executable directly and puts its directory first on the suite's PATH, so an
  old Node inherited by the hook shell cannot produce false regression failures.
  Without the pinned nvm installation, a current Node of at least the pinned
  major version is accepted. An older runtime produces an explicit setup error
  before tests run. Use `nvm install` and `nvm use` from the repository for manual
  checks; this does not change your global Node default.
- **Ticket check** (`scripts/ticket.js check`): fails when a fixed ticket has no
  starting commit in its Resolution, its reproduction is still pending or had
  its assertions or `EXPECT` lines changed, any test fails, or a gated ticket
  has no `**Gate:**` line or turns its AI option on before the gate passed.
  When a pending reproduction moves into the green suite, its ticket keeps the
  original pending path on `**Reproduction:**` and also records the green path,
  so the check can compare the original assertions through Git history.
- **Quiet tests** (`tests/run-all-tests.js`): a passing test that prints more
  than 5 lines fails the suite. Per-case output belongs behind `VERBOSE=1`.
- **Hook documentation check** (`tests/ai-hook-docs.test.js`): fails when a card
  defines an `AI*` hook that `documentation/ai.md` does not mention. Hooks that
  predate the rule are listed in `LEGACY_UNDOCUMENTED`, which may only shrink.
- **Roadmap check** (`tests/ai-roadmaps.test.js`): fails when an AI
  roadmap status disagrees with where its ticket lives, a spec or ticket is
  unlinked, a dependency does not exist, or `architecture.md` names code that
  does not exist.
- **Card status check** (`tests/card-status.test.js`): fails when the generated
  `documentation/card-status.md` is out of date, or a registered set has no
  playability decision in `documentation/card-sets.md`.
- **Skill check** (`tests/agent-skills.test.js`): every skill needs a
  `SKILL.md` whose name matches its folder and which has a description.

## ✏️ Adding or changing a skill

Skills live in `.agents/skills/<name>/SKILL.md`. Edit that file to change a
skill. The `description` line decides when Codex loads it automatically, so say
both when to use it and when not to. Only the name and description are loaded
until a skill is used, so detail in the body costs nothing on other tasks.

To add a skill, create `.agents/skills/<name>/SKILL.md` with `name` and
`description` frontmatter, and add it to the quick reference above.

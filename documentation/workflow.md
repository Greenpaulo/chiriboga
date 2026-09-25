# Process Workflows

How to run Chiriboga work through coding agents without wasting your limited
Codex usage. The rule of thumb:

- **Claude chat** (free, reads the repo on GitHub) does the reading and writing:
  triage, plans and reviews.
- **Codex** (limited) only runs and changes code.
- **Scripts** (free) do the mechanical checks.

You do not need to remember skill names: plain English ("fix this ticket")
works in Codex. The prompts for Claude chat are below to copy.

Why the workflow is set up this way is explained in
[working-with-agents.md](working-with-agents.md).

## ⚡ Quick reference

| Step | Where | You do | You get |
|---|---|---|---|
| 1. Triage a log | Claude chat | Commit and push the log, then paste **prompt T** | A ticket and a drafted reproduction to save into the repo; commit and push them |
| 2. Fix | Codex, new chat | `$implement-ticket <ticket>` | The reproduction confirmed, the fix, and the ticket in `code-review/` (or a plan to approve first) |
| 3. Check | Terminal | `node scripts/ticket.js check <ticket>` | PASS/WARN/FAIL lines, the changed files and a review link |
| 4. Review | Claude chat | Commit and push, then paste **prompt R** with the check output | A Code review section to paste into the ticket, and a move command |
| 5. Finish | Terminal | Run the move command, then commit | The ticket in `done/`, or in `remediation/` for another step 2 |
| Card batch | Codex, new chat | `$implement-card-batch` | One batch done and the tracker updated; see the [operator guide](new-sets/card-set-agent-operator-guide.md#after-every-batch) |

Codex can also do steps 1 and 4 itself (`$triage-log <log>`, `$review-ticket
<ticket>`), but they are its most reading-heavy tasks.

### Prompts for Claude chat

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

**Prompt R: review**

```text
In the chiriboga repo, read .agents/skills/review-ticket/SKILL.md and review
documentation/bugs/code-review/<file>. Output of scripts/ticket.js check:
<paste it here>
```

Claude chat only sees what is pushed to GitHub. If it cannot find a file under
`.agents/`, paste the skill file's contents into the chat instead.

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

A ticket's folder is its status. There is no separate status line.

```text
debug-logs/<log>
   │  triage (Claude chat draft, or Codex)
   ▼
bugs/  ──implement-ticket──▶  bugs/code-review/  ──review──▶  bugs/done/
                                    ▲                   │
                                    │                   ▼
                              implement-ticket ◀── bugs/remediation/
```

Backlog tickets follow the same path under `documentation/backlog/`, starting
from a ticket you write instead of a debug log. Move tickets with
`node scripts/ticket.js move <ticket> <open|code-review|remediation|done>`.

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
for setup, blocked batches and the final set-wide review.

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

## 🧾 Helper scripts

Free, deterministic steps that agents (and you) run instead of reading files:

| Command | Prints |
|---|---|
| `node scripts/batch-brief.js [n]` | The next (or nth) card batch: each card's stats and text, where its stub is, unfinished markers, and similar implemented cards |
| `node scripts/show.js card <id>` | One card definition |
| `node scripts/show.js fn <name>` | One engine or AI function |
| `node scripts/ticket.js check <ticket>` | The mechanical review checks for a fixed ticket |
| `node scripts/ticket.js move <ticket> <stage>` | Moves a ticket between status folders, keeping a linked roadmap item's status and links in step |
| `node scripts/roadmap.js next` | Corp and Runner AI roadmap items whose dependencies are all done (including in-progress items whose ticket is open again) |
| `node scripts/roadmap.js list` | Every AI roadmap item and its status |
| `node scripts/roadmap.js raise <ID>` | Moves a proposed item's spec into the backlog as a ticket; refuses one not re-verified against the current code |
| `node scripts/card-status.js` | Regenerates `documentation/card-status.md`: per-set card counts, missing and unfinished cards, config disagreements, Runner keep coverage |

## 🛡️ Guardrails

- **Stop hook** (`.codex/hooks.json` → `scripts/agent-hooks/verify-on-stop.js`):
  when code or tests have changed, Codex cannot finish a turn while
  `node tests/run-all-tests.js` fails. It is sent back to fix the failure up to
  twice, then must report it. Codex asks you to trust the hook (or use `/hooks`)
  the first time and again whenever the hook file changes.
- **Ticket check** (`scripts/ticket.js check`): fails when a fixed ticket has no
  starting commit in its Resolution, its reproduction is still pending or had
  its assertions or `EXPECT` lines changed, any test fails, or a gated ticket
  has no `**Gate:**` line or turns its AI option on before the gate passed.
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

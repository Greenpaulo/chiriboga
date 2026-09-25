# Process Workflows

How to run Chiriboga work through coding agents. You do not need to remember
commands: describe the task in plain English ("triage this log", "fix this
ticket") and the agent loads the matching skill from its description. The short
names below force a particular skill when you want to be explicit.

## ⚡ Quick reference

| I want to… | In Codex type | Or say | The agent will… | Then you… |
|---|---|---|---|---|
| Turn a debug log into a ticket | `$triage-log documentation/debug-logs/<file>` | "Triage this log: …" | Write a ticket in `bugs/` with a reproduction that fails today, and archive the log | Check the root-cause claims tagged [Verified]/[Inferred], and that the reproduction fails for the right reason |
| Fix a bug or implement a backlog ticket | `$implement-ticket <ticket>` | "Fix `documentation/bugs/<file>`" | Reproduce and validate, then either stop with a plan in the ticket or implement, and move the ticket to `code-review/` | Approve or amend the plan if one was written; afterwards read the Resolution and the diff, then commit |
| Review a fix | `$review-ticket <ticket in code-review/>` | "Review the fix for …" | Add a Code review section, move the ticket to `done/` or `remediation/` | Read the verdict and commit |
| Redo a fix that failed review | `$implement-ticket <ticket in remediation/>` | "Address the review on …" | Answer each finding, move the ticket back to `code-review/` | Review again |
| Implement the next card batch | `$implement-card-batch` | "Implement the next card batch" | Complete one batch and update the tracker | See the [operator guide](new-sets/card-set-agent-operator-guide.md#after-every-batch) |

- In Codex, `/skills` lists the available skills.
- Start each ticket in a fresh chat. The ticket file carries the history, and a
  smaller context gives better results.
- Review in a different chat from the one that implemented the fix, ideally
  with a different model, so the reviewer does not inherit the implementer's
  assumptions.

## 🧰 Where each tool fits

| Tool | Can run skills and tests | Notes |
|---|---|---|
| Codex (VS Code) | Yes | Main tool. Reads `AGENTS.md` and `.agents/skills/`, and runs the Stop hook. |
| Claude web chat | No | Its GitHub access is read-only. Good for discussing a log, ticket or design, but it cannot run the reproduction tests the skills depend on. |

## 🎫 Ticket lifecycle

A ticket's folder is its status. There is no separate status line.

```text
debug-logs/<log>
   │  triage-log
   ▼
bugs/  ──implement-ticket──▶  bugs/code-review/  ──review-ticket──▶  bugs/done/
                                    ▲                    │
                                    │                    ▼
                              implement-ticket ◀── bugs/remediation/
```

Backlog tickets follow the same path under `documentation/backlog/`, starting
from a ticket you write instead of a debug log.

### Approving a plan

`implement-ticket` stops and writes an `## Implementation plan` into the ticket
when a change is risky: it touches shared AI heuristics or widely used engine
functions, changes a hook contract or an existing test expectation, spans more
than three files, or the agent disagrees with the ticket. Read the plan, then
reply "approved" to continue, or say what to change. Small, local fixes go
straight through. Say "plan first" or "no plan" to override.

## 🐛 Bugs

1. **Spot it**: download the debug log as soon as the bug appears in game.
2. **Save it** into `documentation/debug-logs/`, named after the bug.
3. **Triage** with `triage-log`. The ticket lands in `documentation/bugs/` with
   a pending reproduction (`tests/fixtures/corp-decisions-pending/` or
   `tests/pending/`), and the log moves to `documentation/debug-logs/bug_raised/`.
4. **Fix** with `implement-ticket`. The fix is complete when the pending
   reproduction passes and has moved into the green suite with its expectation
   unchanged. The ticket gains a Resolution section and moves to
   `documentation/bugs/code-review/`.
5. **Review** with `review-ticket`. The ticket moves to `done/`, or to
   `remediation/` with numbered findings for another `implement-ticket` pass.

## 📋 Backlog

Improvements and features are raised as tickets in `documentation/backlog/`
and follow steps 4–5 above.

## 🃏 Card sets

Card-set implementation runs one batch at a time from
`documentation/new-sets/current-set-implementation.md`. See
[card-set-agent-operator-guide.md](new-sets/card-set-agent-operator-guide.md)
for setup, blocked batches and the final set-wide review.

## 🗺️ Roadmaps

The main improvement plans are in `documentation/corp-ai/` and
`documentation/runner_ai/`. They contain layers of implementation that can be
worked on individually, and the guiding principles (imperfect information, no
hardcoded card titles) that every AI change must follow.

## 🛡️ Guardrails

- **Stop hook** (`.codex/hooks.json` → `scripts/agent-hooks/verify-on-stop.js`):
  when code or tests have changed, Codex cannot finish a turn while
  `node tests/run-all-tests.js` fails. It is sent back to fix the failure up to
  twice, then must report it. Codex asks you to trust the hook (or use `/hooks`)
  the first time and again whenever the hook file changes.
- **Hook documentation check** (`tests/ai-hook-docs.test.js`): fails when a card
  defines an `AI*` hook that `documentation/ai.md` does not mention. Hooks that
  predate the rule are listed in `LEGACY_UNDOCUMENTED`, which may only shrink.
- **Skill check** (`tests/agent-skills.test.js`): every skill needs a
  `SKILL.md` whose name matches its folder and which has a description.

## ✏️ Adding or changing a skill

Skills live in `.agents/skills/<name>/SKILL.md`. Edit that file to change
a skill. The `description` line decides when agents load it automatically, so
say both when to use it and when not to.

To add a skill, create `.agents/skills/<name>/SKILL.md` with `name` and
`description` frontmatter, and list it in the quick reference above.

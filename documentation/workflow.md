# Process Workflows

## 🐛 Bugs

1. **Bug Identified**: Live testing spots bugs.
2. **Log Captured**: Debug logs are downloaded as soon as the bug is spotted in-game.
3. **Log Saved**: Debug log is saved with the filename as the description of the bug and saved into `documentation/debug-logs/`.
4. **Ticket Created**: An agent that can run the tests triages the log with the `triage-log` skill (in Codex: `$triage-log documentation/debug-logs/<file>`). It writes the ticket to `documentation/bugs/` together with a reproduction that fails today: a pending fixture in `tests/fixtures/corp-decisions-pending/` or a pending test in `tests/pending/`.
5. **Log Archived**: The skill moves the debug log to `documentation/debug-logs/bug_raised/`.
6. **Fix Implementation**: Codex picks up the ticket with the `implement-ticket` skill (`$implement-ticket documentation/bugs/<file>`). It reproduces the bug and checks the ticket against the code. For risky changes (shared AI heuristics, widely used engine functions, hook contracts, or disagreement with the ticket) it writes an implementation plan into the ticket and waits for your approval before editing. The fix is complete when the pending reproduction passes and has moved into the green suite with its expectation unchanged.
7. **Code Review Submission**: The agent adds a Resolution section to the ticket and moves it to `documentation/bugs/code-review/`. A ticket's folder is its status; tickets do not carry a separate status line.
8. **Review & Remediation**: Tickets in `code-review` are passed back to Claude or Codex to review the changes:
   - **If further fixes are needed**: The ticket is moved to `documentation/bugs/remediation/`.
   - **If it passes code review**: It is finally moved into `documentation/bugs/done/`.

---

## 📋 Backlog

1. **Feature Requests**: Improvements and features are raised as backlog tickets in `documentation/backlog/`.
2. **Workflow Execution**: They follow the same path as bugs, but without an attached debug log, and also use `implement-ticket`.

---

## 🗺️ Roadmaps

- **Overarching Plans**: The main improvement docs are stored in `documentation/corp-ai/` or `documentation/runner_ai/` and contain layers of implementation that can be worked on individually.

---

## 🛡️ Guardrails

- **Stop hook** (`.codex/hooks.json` → `scripts/agent-hooks/verify-on-stop.js`): when code or tests have changed, Codex cannot finish a turn while `node tests/run-all-tests.js` fails. It is sent back to fix the failure up to twice, then must report it. Codex asks you to trust the hook (or use `/hooks`) the first time and again after the hook file changes.
- **Hook documentation check** (`tests/ai-hook-docs.test.js`): fails when a card defines an `AI*` hook that `documentation/ai.md` does not mention. Hooks that predate the rule are listed in `LEGACY_UNDOCUMENTED`, which may only shrink.

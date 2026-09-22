# Process Workflows

## 🐛 Bugs

1. **Bug Identified**: Live testing spots bugs.
2. **Log Captured**: Debug logs are downloaded as soon as the bug is spotted in-game.
3. **Log Saved**: Debug log is saved with the filename as the description of the bug and saved into `documentation/debug-logs/`.
4. **Ticket Created**: Debug logs are given to the Claude web app to investigate and create a bug "ticket" Markdown document, which is downloaded and saved to `documentation/bugs/`.
5. **Log Archived**: Once a ticket is raised, the debug log is moved to `documentation/debug-logs/bug-raised/`.
6. **Fix Implementation**: Bug ticket is then given to Codex to review and implement a fix.
7. **Code Review Submission**: Once fixed, the bug ticket is updated and moved to `documentation/bugs/code-review/`.
8. **Review & Remediation**: Tickets in `code-review` are passed back to Claude or Codex to review the changes:
   - **If further fixes are needed**: The ticket is moved to `documentation/bugs/remediation/`.
   - **If it passes code review**: It is finally moved into `documentation/bugs/done/`.

---

## 📋 Backlog

1. **Feature Requests**: Improvements and features are raised as backlog tickets in `documentation/backlog/`.
2. **Workflow Execution**: They follow the same path as bugs, but without an attached debug log.

---

## 🗺️ Roadmaps

- **Overarching Plans**: The main improvement docs are stored in `documentation/corp_ai/` or `documentation/runner_ai/` and contain layers of implementation that can be worked on individually.

---
name: review-ticket
description: Independently review the fix for a Chiriboga ticket in documentation/bugs/code-review/ or documentation/backlog/code-review/, record findings in the ticket, and move it to done/ or remediation/. Use when asked to review, code review, validate or sign off a ticket. Does not change code.
---

# Review a ticket's fix

You are the independent check between "the agent says it is fixed" and
`done/`. Work from the ticket and the repository, not the implementer's
conversation. This should be a fresh session, ideally a different tool or
model from the one that implemented the fix.

Do not modify code or tests. If something needs changing, it goes back through
`remediation/` and the `implement-ticket` skill.

## 1. Establish what changed

- Read the whole ticket: the original diagnosis, any `## Implementation plan`,
  and the `## Resolution`.
- Find the change set, in this order:
  1. the `Implemented from <sha>` line in the Resolution: `git diff <sha>` plus
     `git status` for uncommitted work;
  2. commits mentioning the ticket: `git log --oneline --grep=<ticket-file-name>`;
  3. otherwise ask the user which commits or changes to review.
- List the files changed. Flag any that the ticket does not explain.

## 2. Check the evidence

- **Reproduction.** The pending reproduction must now be in the green suite
  (`tests/fixtures/corp-decisions/` or `tests/`) with its expectation
  unchanged. Compare it with its pending version, for example
  `git diff <sha> -M --stat` and `git log --follow -p -- <new path>`. A changed
  `EXPECT`, assertion or setup needs a justification recorded in the ticket.
- **Tests.** Run the reproduction on its own, then
  `node tests/run-all-tests.js`. Record the results. Check that tests named in
  the Resolution exist and assert what it claims.
- **Acceptance criteria.** Verify each ticked criterion yourself; do not trust
  the tick.

## 3. Check the change

- **Correctness.** Re-validate the root cause against the code and game rules.
  Look for counterexamples: other board states, other callers of each changed
  function, asynchronous or continuation ordering, run versus out-of-run
  context, and state restored after hypothetical evaluation.
- **Principles.** No card-title checks, no AI reads of hidden information
  (including R&D order), no constants tuned to one board, and new AI hooks
  placed at the bottom of card objects and documented in `documentation/ai.md`.
- **Scope.** No unrelated refactors or behaviour changes. Out-of-scope findings
  are recorded rather than silently fixed.
- **Record.** The Resolution matches the diff, and departures from the ticket or
  plan are explained.

## 4. Record the verdict

Append to the ticket:

```markdown
## Code review — <date>

**Verdict:** Pass | Changes required
**Reviewed:** `<sha range or "working tree">`

### Findings
1. **<Blocking | Should fix | Note>** — `<file>`, `<function>`: <problem>.
   Evidence: <test, command or counterexample>. Required change: <what>.

### Checks performed
- <reproduction command>: <result>
- `node tests/run-all-tests.js`: <result>
- <other checks>
```

Only **Blocking** or **Should fix** findings make the verdict "Changes
required". Notes alone still pass.

- **Pass:** `git mv` the ticket to the matching `done/` folder.
- **Changes required:** `git mv` it to the matching `remediation/` folder.

Do not commit. Report the verdict, the findings and where the ticket moved.

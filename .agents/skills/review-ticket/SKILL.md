---
name: review-ticket
description: Independently review the fix for a Chiriboga ticket in documentation/bugs/code-review/ or documentation/backlog/code-review/, record findings in the ticket, and move it to done/ or remediation/. Use when asked to review, code review, validate or sign off a ticket. Does not change code.
---

# Review a ticket's fix

You are the independent check between "the agent says it is fixed" and
`done/`. Work from the ticket and the repository, not the implementer's
conversation. This should be a fresh session, ideally a different tool or
model from the one that implemented the fix.

The mechanical checks are done by `node scripts/ticket.js check <ticket>`,
which costs no tokens. Your job is judgement. A read-only reviewer (Claude chat
with GitHub access) asks the user for that script's output and reads the diff
through the review link it prints; the branch must be pushed first.

Do not modify code or tests. If something needs changing, it goes back through
`remediation/` and the `implement-ticket` skill.

## 1. Run the mechanical checks

Run `node scripts/ticket.js check <ticket>`, or ask the user for its output if
you cannot run commands. It reports:

- whether the Resolution records its starting commit;
- whether the reproduction moved into the green suite with its expectations
  unchanged (a FAIL here is Blocking unless the Resolution justifies it);
- whether the reproduction and the full suite pass;
- unticked acceptance criteria, the files changed and a GitHub review link.

Any FAIL is a Blocking finding. Do not repeat these checks by hand.

## 2. Read the change

- Read the ticket: the diagnosis, any `## Implementation plan`, and the
  `## Resolution`.
- Read the diff of the files the script lists (`git diff <sha>`, or the review
  link). Flag any changed file the ticket does not explain.
- Check that tests named in the Resolution assert what it claims, and verify
  each ticked acceptance criterion rather than trusting the tick.

## 3. Check the change

- **Correctness.** Re-validate the root cause against the code and game rules.
  Look for counterexamples: other board states, other callers of each changed
  function, asynchronous or continuation ordering, run versus out-of-run
  context, and state restored after hypothetical evaluation.
- **Principles.** No card-title checks, no AI reads of hidden information
  (including R&D order), no constants tuned to one board, and new AI hooks
  placed at the bottom of card objects and documented in `documentation/ai.md`.
  For AI changes, check against `documentation/ai-principles.md` and the side's
  `principles.md`, and
  confirm `architecture.md` describes the new behaviour. An AI behaviour
  change that leaves `architecture.md` describing the old behaviour is a
  Should fix finding.
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
- `node scripts/ticket.js check`: <PASS/WARN/FAIL summary>
- <other checks, such as counterexamples tried>
```

Only **Blocking** or **Should fix** findings make the verdict "Changes
required". Notes alone still pass.

- **Pass:** `node scripts/ticket.js move <ticket> done`. If the ticket declares
  a `**Roadmap item:**`, mark it done in the side's `roadmap.md`:
  remove its open entry and add a row to that area's **Done** table linking the
  ticket (now in `done/`) and its `architecture.md` section, then run
  `node tests/ai-roadmaps.test.js`.
- **Changes required:** `node scripts/ticket.js move <ticket> remediation`.

A read-only reviewer outputs the Code review section for the user to paste into
the ticket, and the move command to run. Do not commit. Report the verdict, the
findings and where the ticket moved.

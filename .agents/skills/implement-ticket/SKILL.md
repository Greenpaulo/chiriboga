---
name: implement-ticket
description: Pick up a Chiriboga bug or backlog ticket from documentation/bugs/ or documentation/backlog/ (including remediation/) and take it through reproduction, validation, an approval-gated plan when the change is risky, implementation, tests and hand-off to code-review/. Use when asked to fix, implement, address or pick up a ticket. Not for triaging a debug log (use triage-log).
---

# Implement a ticket

Every ticket is handled the same way so the outcome is predictable and
reviewable. The ticket file is the record: the plan and the resolution are
written into it.

## 1. Orient

- Read the ticket in full. Its folder is its status:
  - `bugs/` or `backlog/`: ready to implement.
  - `remediation/`: review found problems. Address the review findings recorded
    in the ticket (and whatever they imply), not the whole ticket again.
  - `code-review/` or `done/`: stop and ask the user.
- Record the starting commit (`git rev-parse --short HEAD`). If `git status`
  shows changes the user has not mentioned, ask before mixing work.

## 2. Reproduce

- If the ticket names a pending reproduction, run it and confirm it fails for
  the stated reason. If it already passes, stop and report: the bug may be
  fixed already or the reproduction may be wrong.
- If there is none (older tickets and backlog features), write it first. Bugs:
  a pending fixture or `tests/pending/<slug>.test.js`, using the options in
  step 4 of `.agents/skills/triage-log/SKILL.md`. Features: tests that encode
  the acceptance criteria and fail today.

## 3. Validate the ticket

Follow the `AGENTS.md` rule that documentation may be wrong. Check every
root-cause claim (always re-check claims tagged [Inferred]) and the proposed
fix against the current code, card definitions, game rules and every consumer
of a function you would change. Look for counterexamples. Note each point
where you disagree with the ticket, with evidence.

## 4. Plan gate

Write a plan and stop for approval if **any** of these hold:

- The change touches a shared decision heuristic or evaluator in `ai_corp.js`,
  `ai_runner.js` or `runcalculator.js` (scoring, protection, security,
  allocation, economy gates). These shift many decisions at once.
- It changes an engine function with many callers (in `mechanics.js`,
  `phase.js`, `utility.js`, `checks.js`), or makes a synchronous function
  asynchronous.
- It adds or changes an AI hook contract.
- You disagree with the ticket's diagnosis or proposed fix.
- It would change the expectation of an existing green test or fixture.
- It touches more than three source files, or the acceptance criteria are
  unclear.

Otherwise (a card definition, a typo, a helper with one caller, and the ticket
held up under validation) skip the plan and say in your report why none was
needed. The user can override either way with "plan first" or "no plan".

Write the plan into the ticket, directly under its header:

```markdown
## Implementation plan

Proposed at `<sha>`, <date>. **Awaiting approval.**

- **Validation:** where the ticket holds up and where it does not, with evidence.
- **Approach:** the general change, functions touched, rejected alternatives and why.
- **Tests:** reproduction to move, new variations or unit tests.
- **Risk:** other decisions or callers that could shift, and how you will check them.
- **Docs:** `ai.md`, roadmap or other documentation updates.
```

Then stop and present the plan. Continue only after the user approves, in this
conversation or a new one that says the plan is approved. Change the status
line to `**Approved <date>.**`, and revise the plan first if the user amends it.

## 5. Implement

- Fix the general behaviour: no card-title checks, no AI reads of hidden
  information (including R&D order), no constants tuned to one board.
- Stay within the ticket. Record worthwhile out-of-scope findings in the ticket
  or the relevant roadmap instead of fixing them.
- Put new AI hooks with the existing AI hooks at the bottom of card objects and
  document them in `documentation/ai.md`.

## 6. Verify

- The reproduction passes. `git mv` it into the green suite
  (`tests/fixtures/corp-decisions/` or `tests/`) with its expectation unchanged.
- Add a variation or unit test when a broad heuristic changed.
- `node tests/run-all-tests.js` passes.

## 7. Hand off

- Add a `## Resolution` section directly under the ticket's header (above any
  plan). Start it with `Implemented from <sha>` (the starting commit from
  step 1) so the reviewer can find the exact diff, then give what changed and why, where and why you departed from the ticket or
  plan, tests added or moved, and anything left open. Keep the original
  diagnosis below it so the reviewer can compare. Tick the acceptance criteria
  that are met. For a ticket in `remediation/`, add a dated remediation entry
  to the Resolution that answers each review finding by number.
- `git mv` the ticket into the `code-review/` folder beside it
  (`documentation/bugs/code-review/` or `documentation/backlog/code-review/`).
- Do not commit. Report the files changed, test results, deviations from the
  ticket or plan, and open questions.

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
  - `bugs/` or `backlog/`: ready to implement. If its Resolution already has
    `**Gate:** pending F4`, the code was reviewed with its AI option off; once
    F4 is `done`, only run the gate (step 6) and hand off again.
  - `remediation/`: review found problems. Address the review findings recorded
    in the ticket (and whatever they imply), not the whole ticket again.
  - `code-review/` or `done/`: stop and ask the user.
- Record the starting commit (`git rev-parse --short HEAD`). If `git status`
  shows changes the user has not mentioned, ask before mixing work.
- If the ticket declares a `**Roadmap item:**` (or a roadmap entry links it), read
  `documentation/ai-principles.md`, the side's `principles.md` and only the
  `architecture.md` sections the ticket links to, and set the item's status in
  the side's `roadmap.md` (`documentation/corp-ai/` or `documentation/runner-ai/`)
  to `in-progress`.
- A ticket is **gated** when its acceptance criteria require an AI option or its
  **Acceptance gate** needs seeded games (see "Acceptance gates" in
  `documentation/ai-planning.md`). If a gated ticket lacks the two gate criteria
  or its gate has no numbers, fix the ticket before planning.

## 2. Reproduce

- If the ticket names a pending reproduction, run it and confirm it fails for
  the stated reason. If it already passes, stop and report: the bug may be
  fixed already or the reproduction may be wrong.
- If the reproduction is marked *drafted, not yet run* (written by a read-only
  agent such as Claude chat), confirm it now: save it at the named path if the
  file is missing, run it, and fix only harness problems (missing stubs, wrong
  paths, setup errors) without changing what it asserts. If it passes, stop and
  report that the diagnosis is wrong. If it fails for the stated reason, update
  the **Reproduction** line to `fails at <sha>, <date>` and retag the claims it
  demonstrates as [Verified].
- If there is none (older tickets and backlog features), write it first. Bugs:
  a pending fixture or `tests/pending/<slug>.test.js`, using the options in
  step 4 of `.agents/skills/triage-log/SKILL.md`. Features: tests that encode
  the acceptance criteria and fail today.

## 3. Validate the ticket

Follow the `AGENTS.md` rule that documentation may be wrong, but spend effort
where it is uncertain:

- A [Verified] claim whose reproduction still fails as described needs no
  re-investigation.
- Re-check every [Inferred] claim and the proposed fix against the current
  code, card definitions and game rules.
- Check every consumer of a function you would change, and look for
  counterexamples.

- Roadmap tickets were written against older code. Re-ground them as
  "Re-grounding a spec" in `documentation/ai-planning.md` describes: check
  every **Current behaviour** claim and every function, hook or field the
  ticket names (`node scripts/show.js fn <name>`, `rg -n`). Correct what is
  stale in the ticket; if its premise no longer holds, stop and report. Then
  set its `**Verified against code:**` line (add it under `**Read first:**` if
  missing) to the starting commit and today's date.

Note each point where you disagree with the ticket, with evidence.

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

If the ticket already contains an `## Implementation plan` marked
**Approved**, or the user's request says its plan is approved, follow it
instead of writing a new one. Stop only if validation contradicts it.

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
- Stay within the ticket. Record worthwhile out-of-scope findings instead of
  fixing them: in the ticket, and for AI work also as a `proposed` item in the side's
  `roadmap.md` (`documentation/corp-ai/` or `documentation/runner-ai/`) with a spec in its `specs/`
  that follows the template in `documentation/ai-planning.md`.
- Put new AI hooks with the existing AI hooks at the bottom of card objects and
  document them in `documentation/ai.md`.
- Gated tickets: put the behaviour change behind an AI option that defaults to
  off, following the "AI options" convention in `documentation/ai-planning.md`
  (the first gated ticket creates the defaults object). Existing tests must pass
  unchanged with the option off; the ticket's own tests turn it on.

## 6. Verify

- The reproduction passes. `git mv` it into the green suite
  (`tests/fixtures/corp-decisions/` or `tests/`) with its expectation unchanged.
- Add a variation or unit test when a broad heuristic changed.
- `node tests/run-all-tests.js` passes.
- Gated tickets: if F4 is `done`, run its gate as the ticket states it and F4's
  comparison rule requires, and switch the option's default on only if the gate
  passes. If F4 is not `done`, do not run a substitute: leave the option off and
  hand off with the gate pending. If the gate fails, leave the option off, hand
  off, and say in your report that the user must choose between retuning
  (remediation) and parking the item.

## 7. Hand off

- Add a `## Resolution` section directly under the ticket's header (above any
  plan). Start it with `Implemented from <sha>` (the starting commit from
  step 1) so the reviewer can find the exact diff. Then give what changed and
  why, where and why you departed from the ticket or plan, tests added or moved, and anything left open. Keep the original
  diagnosis below it so the reviewer can compare. Tick the acceptance criteria
  that are met. For a ticket in `remediation/`, add a dated remediation entry
  to the Resolution that answers each review finding by number.
- Gated tickets: add one of these lines to the Resolution, naming the option
  in backticks:

  ```markdown
  **Gate:** passed — `<option>` now defaults to on. <F4 command, deck pairs, seed count, metrics, baseline vs candidate, threshold met>
  **Gate:** pending F4 — `<option>` defaults to off.
  **Gate:** failed — `<option>` defaults to off. <the evidence, as for passed>
  ```

  Leave the gate criteria unticked while the gate is pending or failed.
  `ticket.js check` fails a gated ticket without this line, or whose option
  defaults to on before the gate passed.
- If the change alters AI behaviour described in
  `documentation/corp-ai/architecture.md` or
  `documentation/runner-ai/architecture.md` (bug fixes included, not only
  roadmap items), update that section so it describes the new behaviour. Every
  backticked code name must exist; the suite checks this. Link that section
  from the ticket: when the reviewer moves the ticket to `done/`,
  `ticket.js move` uses the link to fill the item's Done-table row.
- Move the ticket into the `code-review/` folder beside it with
  `node scripts/ticket.js move <ticket> code-review` (this also sets a linked
  roadmap item to `in-progress`), then run
  `node scripts/ticket.js check <ticket-in-its-new-folder>` and fix anything it reports
  as FAIL.
- Do not commit. Report the files changed, test results, deviations from the
  ticket or plan, and open questions.

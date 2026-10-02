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
- unticked acceptance criteria, the files changed and a GitHub review link;
- for a gated ticket (its criteria require an AI option), whether the
  Resolution has a `**Gate:**` line naming the option and whether the option's
  default matches it (off unless the gate passed).

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
- **Gate** (gated tickets; "Acceptance gates" in `documentation/ai-planning.md`).
  With the option off, behaviour is unchanged: no existing test or fixture
  expectation changed, and every changed decision path reads the option. With
  it on, the ticket's own tests pass. The gate is written in the form of
  "Writing a gate" in `documentation/ai-planning.md`, including the standard
  regression guards, and its gate command has one flag per table row; a
  mismatch is Should fix. If the gate passed, check the evidence
  against the gate as written: the F4 command is recorded and runnable, it uses
  paired seeds and deck pairs from the committed pool with at least the stated
  number of games, it compares against the all-options-off baseline at the
  same code (which `gate` plays or reuses), its output has a PASS line for
  every metric the gate names and ends `Gate: passed`, and it is not a
  `--quick` run.
  Missing or non-matching evidence is Blocking. A ticket whose gate needed F4
  but whose criteria lack the gate criteria is Blocking too. Whether the gate
  passed or is pending, its setup must be ready: every `--collector` and
  `--start` in its gate command exists and is tested, and the Resolution
  records a `--quick` run reporting at least one game changed by the options.
  A missing piece, or gate output reporting 0 changed games or
  `FAIL changed option effect`, is Blocking.

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

- **Pass:** `node scripts/ticket.js move <ticket> done`. For a ticket a
  roadmap entry links, this replaces the entry with a row in that area's
  **Done** table; if the script says the ticket links no `architecture.md`
  section, fill the row's Architecture cell. Then run
  `node tests/ai-roadmaps.test.js`.
- **Pass with the gate pending F4:** the code may merge with its option off, but
  the item is not done. `node scripts/ticket.js move <ticket> open`; the item
  stays `in-progress`, and the move command adds or updates its generated
  `## Blocker` section. Once F4 is `done`, the blocker refresh removes that
  section and `node scripts/roadmap.js gates` lists the ticket for
  `implement-ticket` to run its recorded `**Gate command:**` (or for the owner
  to run it and supply the output). If the ticket has no runnable gate command matching its
  gate, that is a Blocking finding.
- **Pass with the gate pending human-game data:** the code may merge with its
  option off, but the item is not done. Before moving it, add an unmarked
  `## Additional blocker` section that names the unavailable sample and the
  ticket's required sample size, metrics and thresholds. Then run
  `node scripts/ticket.js move <ticket> open`; the item stays `in-progress`.
  When the user supplies or identifies qualifying data, `implement-ticket`
  removes that additional blocker, runs only the human-game gate, and hands
  the ticket off again. Do not let this outcome fall through to **Pass** and
  move the ticket to `done/`.
- **Pass with the gate failed:** the failed option and its branch were
  removed ("When a gate fails" in `documentation/ai-planning.md`), the
  `**Outcome:**` line says not adopted, and a follow-up ticket links back.
  Move it to `done/` as for **Pass**. A failed option still in the code is
  Blocking.
- **Changes required:** `node scripts/ticket.js move <ticket> remediation`.

A read-only reviewer outputs the Code review section for the user to paste into
the ticket, and the move command to run. Do not commit. Report the verdict, the
findings and where the ticket moved.

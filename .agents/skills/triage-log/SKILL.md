---
name: triage-log
description: Turn a Chiriboga debug log from documentation/debug-logs/ into a bug ticket in documentation/bugs/ backed by a reproduction test that fails today. Use when asked to triage, investigate, diagnose or raise a ticket from a debug log. Does not fix the bug.
---

# Triage a debug log

The deliverable is a ticket whose central claim is demonstrated by a test that
fails on the current code. Reading code produces hypotheses; running it confirms
them. Earlier tickets needed "corrected diagnosis" sections because claims about
runtime state made from reading alone were wrong (for example, whether Baker's
redirect was detected during Corp-turn planning).

**Two modes.** An agent that can run commands (Codex) follows every step
below. A read-only agent (Claude chat with GitHub access) follows **Draft
mode** at the end instead: it does the reading and writing for free, and the
reproduction is confirmed later by `implement-ticket`.

## Steps

1. **Check for an existing ticket.** Search every folder under
   `documentation/bugs/` and `documentation/backlog/` for the same cards and
   mechanism. If an open ticket covers it, add this log to that ticket as extra
   evidence instead of creating a new one. If a ticket in `done/` covers it,
   treat it as a regression and say so.
2. **Locate the bad decision.** Quote the log lines (with line numbers) that
   show it, and identify who acted: Corp AI, Runner AI, or the engine/rules.
3. **Investigate the code path** as `AGENTS.md` requires: current code, card
   definitions, related hooks and consumers, and the Comprehensive Rules PDF
   when a ruling matters.
4. **Build a reproduction that fails now.** Use the first option that applies:
   - Corp AI decision, log has decision snapshots:
     `node tests/extract-fixture.js <log> --list`, then
     `node tests/extract-fixture.js <log> <n> <slug> --expect <correct> --pending`.
   - Corp AI decision, no snapshots: hand-write
     `tests/fixtures/corp-decisions-pending/<slug>.txt` from the
     `RunnerTestField(...)`/`CorpTestField(...)` dump nearest the decision
     (format in `tests/fixtures/README.md`). Its `NOTE` must say it is a
     reconstruction and what was assumed.
   - Anything else (engine, rules, Runner AI, payment, UI logic): write
     `tests/pending/<slug>.test.js` in the style of the existing
     `tests/*.test.js` files. `run-all-tests.js` does not run `tests/pending/`.
     Compute the repo root so the file runs unchanged after it moves to
     `tests/`:
     `path.resolve(__dirname, path.basename(__dirname) === 'pending' ? '../..' : '..')`.
     Print only failures and a one-line summary unless `process.env.VERBOSE`
     is set.

   Run it (`node tests/corp-decision-fixtures.test.js --pending <slug>.txt` or
   `node tests/pending/<slug>.test.js`) and confirm it fails *for the reported
   reason*, not because of a harness error, a missing stub or an unrelated
   assertion. If no faithful reproduction is possible, record exactly why in the
   ticket. Never weaken an expectation to obtain a reproduction.
5. **Confirm the green suite is unaffected:** `node tests/run-all-tests.js`.
6. **Write the ticket** to `documentation/bugs/<slug>.md` using the template
   below.
7. **Archive the log** to `documentation/debug-logs/bug_raised/` (`git mv` if
   tracked, otherwise `mv`).
8. **Stop without fixing.** Report the ticket path, the reproduction path and
   command, which claims are verified versus inferred, and open questions.

## Rules

- Tag every root-cause claim **[Verified]** (name the test or command that
  demonstrates it) or **[Inferred]** (from reading code). Whoever implements the
  fix must re-check [Inferred] claims before relying on them.
- The proposed fix must be general: no card-title checks, no AI reads of hidden
  information, no constants tuned to this one board (see
  `documentation/ai-principles.md` for AI changes).
- Line numbers drift. Reference functions by name and record the commit
  (`git rev-parse --short HEAD`).
- Keep the ticket shorter than the investigation, ideally under 150 lines.
  Quote short log excerpts rather than pasting long runs of the log.

## Ticket template

```markdown
# <Corp AI | Runner AI | Engine>: <what went wrong, in one line>

**Source log:** `documentation/debug-logs/bug_raised/<file>`
**Reproduction:** `<path>` — `<command>` (fails at `<short sha>`, <date>)

## Summary
<Observed behaviour, expected behaviour under the rules or sound strategy, and
why it matters. Three to five sentences.>

## Evidence
<Log excerpts with line numbers.>

## Reproduction
<What the test sets up and asserts, and its current failing output.>

## Root cause
- [Verified] <claim> — <test/command>
- [Inferred] <claim>

## Proposed fix
<General approach, functions involved, rejected alternatives and why, and other
decisions that could shift.>

## Acceptance criteria
- [ ] The reproduction passes and has moved into the green suite
      (`tests/fixtures/corp-decisions/` or `tests/`), expectation unchanged.
- [ ] <Extra variation or unit test when the fix changes a broad heuristic.>
- [ ] New or changed AI hooks are documented in `documentation/ai.md`.
- [ ] `node tests/run-all-tests.js` passes.

## Out of scope / related
```

If no reproduction was possible, replace the **Reproduction** line with
`**Reproduction:** none — <reason>` and make writing one the first acceptance
criterion.

## Draft mode (read-only agents)

Use this when you can read the repository but cannot run commands or write
files, such as Claude chat with GitHub access.

1. Do steps 1–3 above. You can only see what has been pushed to GitHub; if the
   log is missing, ask the user to commit and push it.
2. Write the reproduction code from step 4 (a pending fixture or
   `tests/pending/<slug>.test.js`) as completely as you can, modelled on an
   existing test that exercises the same code. You cannot run it, so keep it
   small and use only functions you have read.
3. Write the ticket from the template with the **Reproduction** line
   ``**Reproduction:** `<path>` — drafted, not yet run``. Tag every claim about
   runtime behaviour [Inferred]; nothing can be [Verified] yet.
4. If the fix meets any plan-gate condition in
   `.agents/skills/implement-ticket/SKILL.md`, add a proposed
   `## Implementation plan` marked **Awaiting approval**, so Codex can start
   from it instead of investigating again.
5. Output each file in full under a heading with its repository path (the
   ticket, the reproduction, and the log's new path under
   `documentation/debug-logs/bug_raised/`) so the user can save them.

`implement-ticket` runs the drafted reproduction first. If it does not fail for
the stated reason, the ticket goes no further.

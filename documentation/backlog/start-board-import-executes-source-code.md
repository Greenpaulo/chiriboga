# Restrict executable source statements in the start-board importer

**Outcome:** blocked — follow-up design and reproduction required; not implemented by PR #18 review remediation.

## Finding

PR #18's architecture review identifies source-log execution in the new start-board builder. `sourceCode()` retains statements after the two field declarations, `parseBoard()` stores them as `rest`, and `boardLines()` passes them through to `inspect()`. `inspect()` calls `playGame()`, which evaluates the fixture with `vm.runInContext()` before installing its game timer. The context contains host-created callbacks. JSON parsing of the field declarations and restrictions on requested edits do not restrict these trailing statements.

This is source-verified evidence, not a tested exploit. A VM context is not a security boundary; an infinite synchronous statement is also outside the existing game timeout. Until this is addressed, source logs must be trusted as executable code.

## Scope and acceptance criteria

- Design and implement a restricted data representation or allowlisted parser for imported board state, covering the state-restoration statements emitted by current debug logs.
- Reject arbitrary trailing execution before engine inspection; validate with regressions for disallowed statements and synchronous nontermination without running an unbounded payload in the test process.
- Preserve reproduction of the committed real-log boards and supported builder edits.
- If executable input remains necessary, use an externally bounded process with an explicit privilege and credential isolation design; a VM timeout alone does not supply that isolation.

This needs broader work on the import format and headless execution boundary and is deliberately deferred from the focused PR #18 review fixes. Existing ticket workflow folders remain unchanged.

# Repository instructions

- After relevant code or test changes, run `node tests/run-all-tests.js` before handing off.
- During iteration, focused tests are fine, but the final full run must include `tests/corp-decision-fixtures.test.js` and `tests/decision-snapshots.test.js`.
- Pending fixtures under `tests/fixtures/corp-decisions-pending/` document unresolved bugs and are not part of the green regression suite.
- Document every new or changed AI card hook in `documentation/ai.md` in the same change.
- In card objects, place new AI hooks with the existing AI hooks at the bottom, after gameplay properties and abilities.
- Treat everything under `documentation/` as potentially incomplete, stale, or mistaken. Before implementing a documented fix or design, validate the behavior, root cause, dependencies, and acceptance criteria against the current code, tests, game rules, related mechanics, hooks, and consumers. Actively look for counterexamples and technical-debt risks. If the proposal is unnecessary, incomplete, incorrectly scoped, or uncalibrated, do not implement it as written; document the concern and use a better-supported design instead. Independently verify implementations described as completed.

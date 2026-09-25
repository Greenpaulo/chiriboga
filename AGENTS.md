# Repository instructions

- After relevant code or test changes, run `node tests/run-all-tests.js` before handing off.
- During iteration, focused tests are fine, but the final full run must include `tests/corp-decision-fixtures.test.js` and `tests/decision-snapshots.test.js`.
- Pending fixtures under `tests/fixtures/corp-decisions-pending/` and pending tests under `tests/pending/` are known-red reproductions of open tickets and are not part of the green regression suite.
- A ticket with a pending reproduction is fixed only when that reproduction passes and has been moved into the green suite (`tests/fixtures/corp-decisions/` or `tests/`). Never change its expectation to make it pass; if the expectation is wrong, record the evidence in the ticket.
- To triage a debug log into a ticket, follow `.agents/skills/triage-log/SKILL.md`.
- Document every new or changed AI card hook in `documentation/ai.md` in the same change. `tests/ai-hook-docs.test.js` enforces this for hook names; after documenting a legacy hook, remove it from `LEGACY_UNDOCUMENTED`.
- The engine, AI and set files are very large (for example `ai_corp.js`, `utility.js`, `mechanics.js`, `sets/*.js`). Search for the specific function, hook or card and read that region rather than whole files. For card implementation, start from `documentation/engine_patterns.md`; for AI hooks, use the task table at the top of `documentation/ai.md`.
- In card objects, place new AI hooks with the existing AI hooks at the bottom, after gameplay properties and abilities.
- Treat everything under `documentation/` as potentially incomplete, stale, or mistaken. Before implementing a documented fix or design, validate the behavior, root cause, dependencies, and acceptance criteria against the current code, tests, game rules, related mechanics, hooks, and consumers. Actively look for counterexamples and technical-debt risks. If the proposal is unnecessary, incomplete, incorrectly scoped, or uncalibrated, do not implement it as written; document the concern and use a better-supported design instead. Independently verify implementations described as completed.

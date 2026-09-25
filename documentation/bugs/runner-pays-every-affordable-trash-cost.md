# Runner AI: pays every affordable trash cost without weighing it

**Source:** code inspection while documenting the Runner AI (no debug log)
**Reproduction:** none yet: found by reading the code at `be61a78`, 2026-09-25; writing a failing test is the first acceptance criterion.

## Summary
When accessing a card, the Runner AI chooses "trash" whenever the engine offers
it, except for installed, non-advanceable ambushes. It never compares the trash
cost with the card's value to the Corp or with the Runner's own economy, so it
can spend its credits trashing low-value cards and then be unable to afford
runs or breakers.

## Evidence
`ai_runner.js`, `_internalChoiceDetermination`, "Run Accessing" branch:

```js
//priority 2: trash cost
else if (optionList.includes("trash")) return optionList.indexOf("trash");
```

## Root cause
- [Inferred] The access branch has no value-versus-cost check before trashing.

## Proposed fix
Before choosing "trash", compare the trash cost with a bounded estimate of the
card's value to the Corp (economy assets, scoring upgrades and defensive
upgrades are worth more than one-shot cards) and with the credits the Runner
needs for its next planned run. Prefer a card hook for Corp card value (see
roadmap item D1 in `documentation/runner-ai/roadmap.md`) over title checks.

## Things to consider
This changes Runner economy behaviour broadly; compare seeded games before and
after (`documentation/ai-principles.md` principle 8).

## Acceptance criteria
- [ ] A failing test shows the Runner trashing a low-value card when the credits are needed for a planned run.
- [ ] High-value Corp cards are still trashed when affordable.
- [ ] The test passes after the fix and has moved into `tests/`.
- [ ] `documentation/runner-ai/architecture.md` describes the new access behaviour.
- [ ] `node tests/run-all-tests.js` passes.

# Corp AI finding 1: Global end-the-run is treated as a permanent lockout

**Source:** `documentation/backlog/corp_ai_review_findings.md`, item 1.
**File:** `ai_corp.js` — `_hasGlobalETR()` (~1518), used by `_evaluateServerSecurity()` (~2319). Line numbers drift; search by function name.
**Belongs in:** Security roadmap (`documentation/corp-ai/roadmaps/corp_ai_improvement_roadmap.md`), new `#### Layer 2.1 ... [FOLLOW-UP]`, placed before `### Layer 3`.
**Suggested order:** Step 3 of 5 — one of the two evaluator fixes, because they feed everything else.
**Depends on:** Foundations doc F2 guarded hypothetical (findings 10/11). Calibrate/validate with the harness (finding 12).

---

## Problem

Any scored agenda with 1 or more agenda counters and an "end the run" ability sets `hasHardLockout` for every server.

- Each counter ends only one run, so a Runner with several clicks just makes another run. It is a run tax, not a lockout.
- _Nisei MK II_'s own Corp code (`sets/systemupdate2021.js`) offers the ability only on the final approach and only if `_runnerMayWinIfServerBreached()` is true. The evaluator credits it with securing servers where the card is written never to fire.

## Proposed fix

- Add a hook `AIGlobalETRUses(server) -> number` — the number of uses the Corp will actually spend against a run on that server.
  - The card's `Enumerate` and the evaluator both read it, so they cannot disagree.
- Compare capacity with the Runner's projected click allotment (currently computed inside `_effectiveRunnerCreditPool()`; extract it as a helper).
- Hard lockout only if `capacity >= projected runs`.
- Otherwise add `capacity x route mandatory cost` to `totalMandatoryBreakCost`.

## Tests / acceptance criteria

- One counter and 4 projected clicks: no lockout, plus one extra route cost.
- `counters >= projected runs`: lockout.
- A server where a breach cannot win gets no credit under Nisei-style policy.
- Hidden Grip changes nothing (the evaluator must not inspect the Runner's hidden hand).

## Also fix the security roadmap's Layer 2 text

Layer 2 names "_Ash 2X3301_", but the real title is _Ash 2X3ZB9CY_. Ash and Caprice Nisei exist only in `carddata/carddata.json` and have no implementation in `sets/`. The only `AIPreventBreach` declarations are on Runner cards (_Bank Job_, _Chastushka_, _Security Testing_), and `_hasDefensiveUpgrade()` reads only `server.root` and `ActiveCards(corp)`. So the defensive-upgrade path is untested by any real Corp card. Both cards are trace/psi based, so a deterministic boolean would overstate them. Correct the title and soften the claim.

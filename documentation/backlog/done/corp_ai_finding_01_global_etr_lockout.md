# Corp AI: global end-the-run counters are treated as a permanent server lockout

**Archived location:** `documentation/backlog/done/` after implementation and code review.
**Source:** `documentation/backlog/corp_ai_review_findings.md`, finding 1.
**Files:** `ai_corp.js`, `sets/systemupdate2021.js`, `tests/corp-server-security.test.js`, and `documentation/corp-ai/roadmaps/corp_ai_improvement_roadmap.md` (line numbers drift; search by function name).
**Status:** Fixed and regression-tested. See section 8 for the implementation record.

---

## 1. Summary

The Corp security evaluator treated any scored agenda with an agenda counter and an end-the-run ability as a permanent hard lockout on every server.

That is incorrect for _Nisei MK II_. Each counter ends one run, after which a Runner with another click can run again. A finite supply of counters is therefore a repeated-route tax unless the Corp has enough uses to stop every projected run attempt.

The old evaluator also disagreed with Nisei's live activation policy. Nisei's `Enumerate` code preserves its counter unless the breach could win the game, with an additional R&D restriction for _The Maker's Eye_. The evaluator ignored that policy and credited Nisei on servers where the live card would never fire.

The fix replaces the global boolean with a server-specific capacity hook shared by security planning and live card activation. A finite capacity adds repeated mandatory route cost; only capacity covering all projected runs creates a hard lockout.

---

## 2. Root cause

### 2.1 `_hasGlobalETR()` discarded both capacity and policy

The old helper searched every scored card for an agenda counter and ability text matching “end the run”:

```js
_hasGlobalETR() {
  for (var i = 0; i < corp.scoreArea.length; i++) {
    var scoredCard = corp.scoreArea[i];
    if (Counters(scoredCard, "agenda") < 1) continue;
    if (typeof scoredCard.abilities == "undefined") continue;
    for (var j = 0; j < scoredCard.abilities.length; j++) {
      if (this._textEndsTheRun(scoredCard.abilities[j].text)) return true;
    }
  }
  return false;
}
```

This reduced every positive counter count to `true`. It could not express:

- how many runs the Corp could end;
- whether the Corp would spend a counter on this server;
- card-specific restrictions on when the ability is valuable; or
- whether the Runner had enough clicks to try again.

### 2.2 `_evaluateServerSecurity()` promoted that boolean directly to a hard lockout

The evaluator previously did this before evaluating the route:

```js
if (this._hasGlobalETR()) {
  result.hasHardLockout = true;
  result.reasons.push("global end the run available");
}
```

One Nisei counter therefore made HQ, R&D, Archives, and every remote appear impossible to breach for the entire projected turn.

### 2.3 Nisei's live decision and the evaluator used different rules

Nisei's `Enumerate` path independently checked `_runnerMayWinIfServerBreached(attackedServer)`. On R&D it additionally required _The Maker's Eye_ to be resolving. `_hasGlobalETR()` knew nothing about either restriction, so planning and execution could reach opposite answers from the same public state.

### 2.4 Runner clicks were embedded in the credit-pool calculation

The public next-turn click projection already existed inside `_effectiveRunnerCreditPool()`, where spare clicks can become credits. It was not available as a reusable helper, so the global ETR evaluator had no consistent count of projected ordinary run attempts.

---

## 3. Implemented design

### 3.1 Declarative global ETR capacity

Scored cards can now expose:

```js
AIGlobalETRUses: function(server) {
  return numberOfUsesTheCorpWillSpend;
}
```

`_globalETRUses(server)` sums the non-negative integer capacity declared by scored cards. It does not infer policy from ability text.

_Nisei MK II_ implements the hook using its existing live policy:

- return zero unless breaching `server` could win the game;
- on R&D, return zero unless _The Maker's Eye_ is resolving; and
- otherwise return the number of hosted agenda counters.

Nisei's `Enumerate` path calls the same hook, so the evaluator cannot credit a counter which the live card decision would preserve.

### 3.2 Shared click and run projection

`_projectedRunnerClicks()` extracts the logic previously embedded in `_effectiveRunnerCreditPool()`:

- during the Corp turn, use the Runner's next public allotted clicks plus public temporary bonus clicks;
- during the Runner turn, use the current click tracker; and
- never return a negative number.

`_projectedRunnerRuns(server)` treats each available click as one possible ordinary run. When `server` is already being attacked, it also includes the current run, because its initiation click has already been paid.

### 3.3 Security calculation

After calculating the route's normal mandatory break cost, `_evaluateServerSecurity()` applies global ETR capacity:

| Condition | Result |
|---|---|
| `capacity === 0` | No global ETR security credit |
| `0 < capacity < projected runs` | Add `capacity × route mandatory cost` |
| `capacity >= projected runs` | Set `hasHardLockout` |

For a route with mandatory cost `R` and finite ETR capacity `U`, the resulting mandatory cost is `(U + 1) × R`: the initial route plus one repeat for each run the Corp ends.

### 3.4 Public-information boundary

The hook reads only public server state, scores, hosted counters, and the publicly resolving event. It does not inspect Runner Grip identities or Runner-AI private caches. Changing hidden Grip contents without changing public state cannot change the result.

---

## 4. Behaviour change

| Scenario | Old result | New result |
|---|---|---|
| One Nisei counter, four projected runs, route cost 1 | Hard lockout | No hard lockout; mandatory cost becomes 2 |
| Four usable counters, four projected runs | Hard lockout | Hard lockout |
| Nisei scored, but the breach cannot win | Hard lockout | No Nisei security credit |
| Winning breach on a non-R&D server | Hard lockout with any positive count | Capacity equals available counters |
| Winning ordinary R&D breach without _The Maker's Eye_ | Hard lockout | No Nisei security credit, preserving existing live policy |
| Hidden Grip contents change | Could not be guaranteed by the old text heuristic | No change to capacity or security result |

This change intentionally models Nisei's existing Corp policy rather than changing when the AI chooses to spend its counters.

---

## 5. Roadmap and reference-document corrections

Layer 2 of the security roadmap named “Ash 2X3301”; the correct title is _Ash 2X3ZB9CY_. _Ash 2X3ZB9CY_ and _Caprice Nisei_ currently exist in `carddata/carddata.json` but do not have implemented Corp card definitions under `sets/`.

The roadmap now describes those cards as intended examples rather than implemented coverage. It also notes that trace- and psi-dependent prevention must not be represented by an unconditional `AIPreventBreach` boolean.

A new `#### Layer 2.1: Finite Global ETR Capacity — [FOLLOW-UP]` section records the goal, design, compatibility constraints, deterministic regression scenarios, and acceptance gate. `documentation/ai.md` documents the new capacity hook and projected-run helpers.

---

## 6. Tests

The Corp server-security suite now contains these focused regressions:

| Test | Coverage |
|---|---|
| `one Nisei counter adds one repeated route cost without a global lockout` | One counter, four projected clicks, and one extra route cost |
| `global ETR capacity covering every projected run is a hard lockout` | Capacity equal to projected attempts |
| `Nisei policy gives no credit where a breach cannot win and ignores hidden Grip` | Card policy and imperfect-information boundary |
| `Nisei activation and security evaluation share the global ETR policy hook` | Both planning and live `Enumerate` call the same hook |

These are deterministic unit regressions using the real `CorpAI` class and _Nisei MK II_ card definition.

---

## 7. Acceptance criteria

- [x] One counter and four projected clicks do not create a hard lockout.
- [x] That one counter adds one repeated mandatory route cost.
- [x] Capacity covering every projected run creates a hard lockout.
- [x] A server where breaching cannot win receives no Nisei security credit.
- [x] Hidden Grip contents do not affect the result and are not inspected.
- [x] Nisei's live activation and the evaluator use the same `AIGlobalETRUses(server)` hook.
- [x] The Runner click projection is extracted from `_effectiveRunnerCreditPool()` and reused.
- [x] The roadmap uses the correct _Ash 2X3ZB9CY_ title and does not claim deterministic coverage for unimplemented trace/psi cards.
- [x] The Layer 2.1 follow-up and AI reference documentation are present.
- [x] The focused security suite and the complete repository test collection pass.

---

## 8. Implementation record

### 8.1 Code changes

- Replaced `_hasGlobalETR()` with `_globalETRUses(server)` in `ai_corp.js`.
- Added `_projectedRunnerClicks()` and `_projectedRunnerRuns(server)` and reused the click helper in `_effectiveRunnerCreditPool()`.
- Updated `_evaluateServerSecurity()` to distinguish finite repeated-route tax from full projected-run lockout.
- Added `AIGlobalETRUses(server)` to _Nisei MK II_ in `sets/systemupdate2021.js`.
- Replaced Nisei's duplicated live decision policy with a call to that hook.
- Updated `documentation/ai.md` and the Corp AI improvement roadmap.

No hidden-information access, counter mutation, or run-state mutation was added to security planning.

### 8.2 Verification

- `node tests/corp-server-security.test.js`: **95 regression cases passed**.
- Every `tests/*.test.js` file passes: **15 test files passed**, including the decision-fixture and snapshot-recorder suites.
- `node -c ai_corp.js` passes.
- `git diff --check` passes.
- A repository search shows no remaining production or active-reference use of `_hasGlobalETR()`; historical planning documents retain the old name only when describing the previous implementation.

### 8.3 Code-review validation — 23 September 2026

- Revalidated the implementation against the current evaluator, Nisei's live activation path, the AI hook reference, the security roadmap, and the acceptance criteria above.
- Confirmed the hook remains at the bottom of the card object with the other AI hooks and that planning and activation both call it.
- `node tests/corp-server-security.test.js`: **109 regression cases passed**.
- `node tests/run-all-tests.js`: **19 test files passed**, including the Corp decision-fixture and decision-snapshot suites.
- No corrective code change was required; the ticket is ready for the completed backlog.

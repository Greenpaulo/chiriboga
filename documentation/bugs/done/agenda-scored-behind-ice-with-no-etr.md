# Corp AI: scores an agenda behind ICE that can never end the run, partly because `_cardProtectionValue()` gives any rezzable ICE a flat protection point regardless of what its subroutines actually do

**Review location:** `documentation/bugs/code-review/`.
**Original source:** `documentation/debug-logs/bug_raised/played_agenda_into_server_with_no_etr_sub.txt` (`Version reference: Sat Sep 19 2026 22:23:18 GMT+0100`).
**Additional verified logs:** [`corp_played_agenda_into_unsecure_server_after_agenda_was_stolen_from_that_server_last_turn.txt`](../../debug-logs/bug_raised/corp_played_agenda_into_unsecure_server_after_agenda_was_stolen_from_that_server_last_turn.txt) and [`same_again_install_agenda_into_insecure_server.txt`](../../debug-logs/bug_raised/same_again_install_agenda_into_insecure_server.txt). These newer logs use breakable ETR ICE rather than no-ETR ICE and therefore confirm that the absolute security floor—not ETR-aware coarse scoring alone—is the essential fix.
**File:** `ai_corp.js` (line numbers are from `main` as of this writing and will drift; search by function name).
**Status:** Fixed on `23Sept-fixes`, awaiting code review. The shared `_isAScoringServer()` security floor prevents all reproduced insecure installs. `_cardProtectionValue()` now gives ETR-capable ICE the existing baseline/high-stat bonus and non-ETR ICE a smaller explicit deterrence baseline of `0.25`.

---

## 1. Summary

The Corp installed Sericulture Expansion (an agenda) into a remote protected by two ICE — Tithe and Diviner — neither of which can reliably end the run. Tithe's only subroutines are "Do 1 net damage" and "Gain 1[credit]"; it has no end-the-run effect at all. Diviner's single subroutine ends the run only if the Runner trashes a card this way with an odd printed cost, and in this game the only card in the Runner's grip (Ritual) has a printed cost of 0 — the log even states this explicitly (`Ritual has a printed cost of 0`). The run was always going to succeed once the Corp had spent its rez credits; the Runner simply absorbed 2 net damage and walked in.

The AI's own security evaluator correctly called this: `_evaluateServerSecurity(Remote 0).isSecure` was `false` at every check, exactly as in the log analyzed in `corp-installs-agendas-into-a-never-secure-remote.md`. The install went ahead for the same reason documented there — `_isAScoringServer()` (~line 561) only requires the remote's protection score to be at least as good as HQ's, not that the remote is actually secure.

What this log adds is *why* Remote 0's protection score (1.3-1.4) was high enough to beat HQ's (0.90-1.9) in the first place. `_cardProtectionValue()` (~line 1542) gives any ICE the Corp can afford to rez a flat "1 point for any ice" (line 1549) with no check on what its subroutines do:

```js
if (card.rezzed || Credits(corp) >= RezCost(card)) {
  ret++; //1 point for any ice
  if (card.rezCost > 4 || Strength(card) > 3) {
    ret++; //plus bonus point for high rez cost (based on printed value) or strong
  }
  ...
```

Tithe and Diviner each contributed this baseline point (plus a same-server bonus of `0.1 * sqrt(ice.length - 1)`) purely for existing and being affordable, exactly as if they were an "End the run." piece of ICE. A helper that already exists in the file for this exact purpose, `_iceHasETR()` (~line 1617), is never called anywhere — it is dead code that would have let `_cardProtectionValue()` tell the difference.

---

## 2. What happened in the log

Corp: AU Co.: The Gold Standard in Clones (gains power counters when it deals damage — cosmetic to this bug, but explains the `power counter` lines). Runner: René Loup Arcemont. Short game — this is the first Corp turn with a remote server.

| Log lines | Event |
|---|---|
| 20-21 | ICE installed on HQ |
| 26-27 | ICE installed on R&D |
| 65-67 | New remote created; Tithe installed as its first ICE |
| 75-77 | Diviner installed as Remote 0's second ICE |
| 78 | `Ranked server protection`: `Remote 0: {score: 1.3, secure: false}` vs `HQ: {score: 0.90, secure: false}` — Remote 0 already reads as *more* protected than HQ despite neither of its two ICE being able to end the run |
| 81 | `Scoring windows for empty servers: [2.95]` — a usable positive window |
| 84 | `Corp installed a card in root of a remote server` — hand tracking (Sericulture Expansion present at line 13, gone from the hand by line 42, later confirmed as the card in Remote 0's root at line 126) identifies the agenda |
| 91-119 | Runner runs Remote 0. Tithe is rezzed for 1 credit, fires "Do 1 net damage" (Creative Commission trashed) and "Gain 1[credit]" — no ETR, run continues. Diviner is rezzed for 2 credits, fires "Do 1 net damage" (Ritual trashed), its conditional ETR checks Ritual's printed cost and finds it even (0), so no ETR fires. `Approaching Remote 0` → `Run successful` → **`Sericulture Expansion accessed` / `Sericulture Expansion stolen`** |

Total cost to the Runner for a guaranteed steal: 3 rez-forced credits paid *by the Corp*, 2 net damage absorbed by the Runner, and zero credits spent by the Runner on breaking anything, because there was nothing that needed breaking to avoid a stop — nothing was going to stop the run regardless of what the Runner did.

---

## 3. Root cause

### 3.1 `_isAScoringServer()` uses a relative-to-HQ bar, not `_evaluateServerSecurity()`

This is the same defect documented in full in `corp-installs-agendas-into-a-never-secure-remote.md` §3.1-3.2: the function accepts any remote whose `_protectionScore()` is at least HQ's, regardless of the remote's own `isSecure` flag. Remote 0 was `secure:false` at every logged check in this game too (line 68: score 1.40; line 78: score 1.30), yet cleared the bar because HQ's own score (0.90-1.9 across these same turns) was lower still. Refer to that document for the fix to this half of the problem; it is not repeated in full here.

### 3.2 `_cardProtectionValue()` doesn't check whether the ICE can end the run

**Where:** `_cardProtectionValue()`, ~lines 1542-1589, feeding `_iceAndRootProtection()` (~1591-1600) and then `_protectionScore()` (~2771).

```js
_cardProtectionValue(
  card, //from 0 (completely pointless) to 2+ (depending on rez cost etc)
) {
  var ret = 0;
  if (CheckCardType(card, ["ice"])) {
    //if unrezzed and can't afford to rez, consider to be no protection (just a simple check ignoring cost of other ice in server)
    if (card.rezzed || Credits(corp) >= RezCost(card)) {
      ret++; //1 point for any ice
      if (card.rezCost > 4 || Strength(card) > 3) {
        ret++; //plus bonus point for high rez cost (based on printed value) or strong
      }
      ...
```

Every affordable piece of ICE gets at least 1 point, whatever its subroutines say. A piece of ICE whose only effects are net damage and a credit gain for the Corp (Tithe) scores identically, at this stage, to a piece of ICE that unconditionally ends the run. This function has no concept of "can this ICE actually deny access", which is exactly the question `_evaluateServerSecurity()` and its `_requiredSubroutineIndices()` / `_textEndsTheRun()` helpers (~2013, ~1611) were built to answer elsewhere in the file.

### 3.3 The fix for this already exists in the file, unused

**Where:** `_iceHasETR()`, ~lines 1616-1626.

```js
//returns true if the ice can end the run (printed subroutine or encounter effect)
_iceHasETR(iceCard) {
  if (!iceCard) return false;
  if (typeof iceCard.subroutines !== "undefined") {
    for (var i = 0; i < iceCard.subroutines.length; i++) {
      if (this._textEndsTheRun(iceCard.subroutines[i].text)) return true;
    }
  }
  //some ice end the run without a printed subroutine (e.g. Tollbooth's encounter effect)
  return this._textEndsTheRun(iceCard.cardText);
}
```

A repo-wide search (`grep -rn "_iceHasETR" --include="*.js" .`) finds exactly one match: the definition itself. It is never called. Wiring it into `_cardProtectionValue()` is the natural, minimal fix and needs no new logic.

### 3.4 Why this produced a wrong answer here even though `_evaluateServerSecurity()` was right

`_protectionScore()` (~2771) combines `_iceAndRootProtection()` (the inflated, ETR-blind score) with a flat `+2` bonus only if `_evaluateServerSecurity(server).isSecure` (line 2805). The `isSecure` component was correctly `false` throughout this log, so the `+2` never applied — but the inflated baseline from §3.2 was enough on its own to put Remote 0 (1.3-1.4) above HQ (0.90-1.9), because HQ's own ICE and general defense were equally thin. Two independently weak numbers being compared to each other, rather than either being checked against an absolute bar, is what let the install through. Fixing 3.1 alone (per the other document) is sufficient to stop this specific install; fixing 3.2 as well stops the *score* itself from being misleading, which likely affects other decisions that read `_protectionScore()` or `_iceAndRootProtection()` (ICE-install prioritization, `_bestProtectedRemote()`, `_serverToProtect()`, and the "Ranked server protection" log line the AI's other decisions and this document's own root-cause tracing both rely on).

---

## 4. Implemented fix

### 4.1 Primary: applied the `_isAScoringServer()` security floor

That fix (an absolute `_evaluateServerSecurity(server).isSecure` floor before the relative HQ comparison) prevents this install outright, independent of anything below. Implement it there; nothing more is required to stop this specific mistake from recurring.

### 4.2 Secondary: made `_cardProtectionValue()` ETR-aware

Wire in the existing, unused `_iceHasETR()` helper so ICE that cannot end the run doesn't get credited as if it could:

```js
if (card.rezzed || Credits(corp) >= RezCost(card)) {
  if (this._iceHasETR(card)) {
    ret++; //1 point for ice that can actually end the run
    if (card.rezCost > 4 || Strength(card) > 3) {
      ret++; //plus bonus point for high rez cost (based on printed value) or strong
    }
  } else {
    ret += 0.25; //some deterrent value (tax, damage, card disadvantage) but no access denial
  }
  ...
```

The non-ETR baseline is `0.25`: such ICE can still impose damage, taxes, or card disadvantage, but does not receive the high-rez-cost/high-strength bonus intended for access-denying ICE. Existing same-server, unrezzed, compatible-breaker, hosted-card, and central adjustments remain unchanged.

### 4.3 Why both changes landed together

The security floor alone stops every reproduced agenda install, including the newer Kessleroid logs where the ICE does contain ETR subroutines. The ETR-aware coarse value also landed because `_protectionScore()` feeds ICE placement and server ranking outside `_isAScoringServer()`; retaining the flat point would continue to overrate Tithe-style ICE elsewhere.

---

## 5. Tests

Follow `tests/fixtures/README.md`. Reconstruct the pre-decision board from the log around lines 75-84 (per the README's guidance for logs without `DecisionSnapshots`):

- `// PHASE: Phase_Main`
- `// OPTIONS:` confirm against a run at that point.
- Remote 0 with Tithe and Diviner installed, both rezzable but not yet rezzed.
- HQ and R&D each with one ICE, giving HQ a protection score in the same range as Remote 0's inflated score (so the fixture actually exercises the comparison, not just an obviously-worse HQ).
- Sericulture Expansion (or any agenda) in hand.
- `// SETUP:` credits/clicks matching the log (Corp 5 credits, 3 clicks left at the decision).

Fixtures to add under `tests/fixtures/corp-decisions/`:

| Fixture | Setup | Expected |
|---|---|---|
| `corp-no-agenda-behind-no-etr-ice` | Remote 0 guarded only by Tithe, with a nonempty Runner grip so its damage is survivable | `// EXPECT: !install`; passes by choosing `draw` |
| `corp-no-agenda-behind-conditional-etr-ice` | Remote 0 guarded only by Diviner; Corp-owned evaluation cannot assume its hidden-information condition succeeds | `// EXPECT: !install`; passes by choosing `draw` |

For unit-level coverage of §3.2/4.2 specifically, add a focused test (not a full decision fixture) asserting `_cardProtectionValue(tithe) < _cardProtectionValue(anETRIce)` for two otherwise-identical rez costs, in whichever suite already covers `_protectionScore`/`_cardProtectionValue` helpers (check `tests/corp-server-security.test.js` first).

Also run: `node tests/corp-server-security.test.js`, `node tests/decision-snapshots.test.js`, `node -c ai_corp.js`, then `node tests/run-all-tests.js`.

---

## 6. Watch-outs

- **Don't double-count with `_evaluateServerSecurity()`'s own ETR handling.** `_requiredSubroutineIndices()` / `_estimateBreakCost()` already model mandatory-vs-optional breaks correctly for the *security* verdict (§3.4). The fix in 4.2 only touches the separate, cruder `_cardProtectionValue()` heuristic used for relative scoring and ranking — keep the two paths conceptually distinct as the existing code comments intend ("kept deliberately crude, in the same spirit as `_cardProtectionValue`").
- **`_textEndsTheRun()` is a naive substring match** (`text.indexOf("nd the run") > -1`) and will match Diviner's conditional wording as if it were unconditional. `_iceHasETR()` inherits this. Wiring `_iceHasETR()` into `_cardProtectionValue()` per §4.2 will therefore still over-credit Diviner-style conditional-ETR ICE, just not Tithe-style zero-ETR ICE. See §7.1 — worth a separate, more careful fix, not bundled into this one.
- **Rebalancing `_cardProtectionValue()` can shift many other decisions** (ICE-install priority, `_bestProtectedRemote()`, `_serverToProtect()`, the general "Ranked server protection" numbers used throughout the log for tracing). Re-run the full fixture collection, not just the two new fixtures, before landing 4.2.

---

## 7. Related observations (not part of this fix)

1. **`_textEndsTheRun()` cannot distinguish conditional from unconditional ETR text.** Diviner's subroutine text contains "end the run" as a substring regardless of whether the trashed card's cost was actually odd. In this log the outcome was still correct by luck of `_evaluateServerSecurity()`'s separate mandatory-cost accounting reading the same flawed helper but landing on `secure:false` anyway (mandatory-break math evidently didn't hinge on Diviner's ETR here); a different board state could plausibly get an inflated `hasHardLockout` or `totalMandatoryBreakCost` from treating a conditional ETR as guaranteed. Worth a dedicated look at every call site of `_textEndsTheRun()` and `_iceHasETR()`'s conditional-vs-unconditional handling.
2. **This game never developed past its second Corp turn in the log**, so there's no evidence here about whether the AI would have added a real ETR piece to Remote 0 later, or whether it considered Tithe/Diviner "good enough" indefinitely. The short log makes this a clean, low-noise repro case rather than a broader behavioral study.

---

## 8. Acceptance criteria

- [x] The shared `_isAScoringServer()` security floor is applied.
- [x] `_cardProtectionValue()` calls `this._iceHasETR(card)`: ETR ICE retains the baseline/high-stat bonus and non-ETR ICE receives a `0.25` deterrence baseline.
- [x] `corp-no-agenda-behind-no-etr-ice` passes after the change.
- [x] `corp-no-agenda-behind-conditional-etr-ice` is added and passes because the Corp-owned security evaluator does not assume Diviner's hidden-information condition succeeds.
- [x] A focused unit test confirms equivalent no-ETR ICE scores below ETR ICE.
- [x] `node -c ai_corp.js` and `node tests/run-all-tests.js` pass (`21 test files passed`).
- [x] No card-specific decision workaround was added.

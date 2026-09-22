# Corp AI: `_iceWorthRezzing()` saves credits for unrezzed ice in another server on a tie, so it waves the Runner through HQ until the Runner is out of clicks

**Suggested location:** `documentation/bugs/` (move to `documentation/bugs/fixed/` once merged).
**Source:** `documentation/debug-logs/bug_raised/corp_didnt_rez_ice_when_it_would_force_runner_to_pay_credits_only_rezzed_ice_3_runs_later_on_same_server.txt`
**File:** `ai_corp.js` (line numbers are from `main` when this was written and will drift; search by function name).
**Status:** Fixed and regression-tested. See section 9 for the implementation record. The protection-value numbers in section 3.2 were worked out by hand from the code, not printed by the game.

---

## 1. Summary

When the Runner approaches an unrezzed piece of ICE, `Phase_Approaching` asks `_iceWorthRezzing()` whether to pay for it. That function has a "save credits for better ICE elsewhere" check. If the Corp can afford some other unrezzed ICE now but could not afford it after paying for this one, the AI compares the two servers and may decide not to rez.

In this game the Corp had 9 credits, Flyswatter (rez 2) unrezzed on HQ, and Mycoweb (rez 8) unrezzed on Archives. 2 + 8 = 10 > 9, so the check fired. Central servers all have a server value of 0 (`_serverValue()` only counts agendas, ambushes and hostiles in the server's *root*), so the comparison fell through to a tie-break on `_cardProtectionValue()`. That function gives a bonus to any ICE with rez cost above 4, so Mycoweb scored higher than Flyswatter and the AI decided to keep its credits for Mycoweb on Archives, a server the Runner was not running.

The Runner ran HQ four times in a row. Runs 1 to 3 logged `Rez cost not worth it, need to save it for Mycoweb in Archives`. On run 4 the AI rezzed Flyswatter. The only thing that changed was that the Runner had 0 clicks left, and the "other servers" part of the check is skipped when `runner.clickTracker` is 0. So the AI only rezzed once the Runner could no longer run anywhere else, after three free HQ runs.

**Proposed fix:** in `_iceWorthRezzing()`, only reserve credits for ICE in a *different* server when that server's value is strictly greater. Keep the protection-value tie-break for ICE further in *the same* server, where it makes sense.

---

## 2. What happened in the log

Corp: AU Co. Runner: René Loup Arcemont, with Buzzsaw installed (installed on the Runner's previous turn, log line 488). Buzzsaw is a Decoder with strength 3 that breaks up to 2 code gate subroutines for 1 credit, so it breaks Flyswatter (code gate, strength 0, one "End the run" subroutine) for 1 credit.

The board when the Runner's turn started (log line 586 onward, and the reproduction block at the end):

| Server | ICE | Rezzed? |
|---|---|---|
| HQ | Flyswatter (rez 2) | no |
| Archives | Mycoweb (rez 8, strength 5, 4 subroutines) | no |
| R&D | Karunā | no |
| Remote 0 | two pieces of ICE, Offworld Office in the root | no |

The Corp AI had **9 credits** and 4 cards in HQ (Spin Doctor x2, Anoetic Void, Anthill Excavation Contract), no agendas.

The Runner's turn, in order (the Runner has 4 clicks, and a click is spent *before* each run starts):

| Run | Runner clicks left | Corp credits | AI decision on approaching Flyswatter | Result |
|---|---|---|---|---|
| 1 (lines 591-604) | 3 | 9 | `Rez cost not worth it, need to save it for Mycoweb in Archives`, `Corp did not rez ice` | Runner passes for free, trashes Spin Doctor |
| 2 (lines 606-617) | 2 | 9 | same message, did not rez | Runner passes for free, trashes Anoetic Void |
| 3 (lines 618-630) | 1 | 9 | same message, did not rez | Runner passes for free, trashes Anthill Excavation Contract |
| 4 (lines 631-649) | **0** | 9 | `I will rez the approached ice` | Corp pays 2, Flyswatter rezzed, Runner pays 1 credit with Buzzsaw to break it, trashes Spin Doctor |

The Corp starts its next turn with 7 credits and 0 cards in hand (line 651). The four runs accessed and trashed its whole hand.

Rezzing on run 1 would not have stopped any of those accesses, because the Runner could always afford the 1-credit break. What it would have done is charge the Runner 1 credit on each of runs 1 to 3, 3 credits in total, which is exactly what the log file name describes.

Later in the log (lines 702-732) the game was rewound to before run 1 twice and the AI gave the same answer both times, so this is deterministic and not a random roll.

---

## 3. Root cause

### 3.1 The "save credits for other ICE" check reserves on a tie

**Where:** `_iceWorthRezzing()`, roughly lines 3678-3830. Called from one place only: `Phase_Approaching`, ~3934.

The check builds `iceToCompareList` (unrezzed ICE behind this one in the same server, plus unrezzed ICE in every other server if the Runner has clicks left), then loops over it (~3759-3790):

```js
if (CheckCredits(corp, rezCostToCompare, "rezzing")) {              // could afford that ICE now...
  if (!CheckCredits(corp, currentRezCost + rezCostToCompare, "rezzing")) {   // ...but not after paying for this one
    if (
      valueToCompare > thisServerValue ||
      (valueToCompare == thisServerValue &&
        this._cardProtectionValue(iceToCompare) > thisIceProtectionValue)
    ) {
      this._log("Rez cost not worth it, need to save it for " + iceToCompare.title + " in " + ServerName(serverToCompare));
      rezIce = false;
    } else
      this._log("Rez this is better than " + iceToCompare.title + " in " + ServerName(serverToCompare));
  }
}
```

In this game: `CheckCredits(9, 8)` is true (Mycoweb affordable), `CheckCredits(9, 2 + 8)` is false, so the inner comparison runs. It is only reached when the Corp's credits sit in a narrow band (here 8 to 9). At 10 or more credits the AI would have rezzed both and never hit it.

### 3.2 Why the comparison is a tie, and why Mycoweb wins the tie-break

`_serverValue()` (~983):

```js
_serverValue(server) {
  var ret = 0;
  for (var i = 0; i < server.root.length; i++) {
    if (this._isHVT(server.root[i])) ret++;
  }
  return ret;
}
```

It only looks at the root. Agendas, ambushes and hostiles can only be in a remote's root, so **HQ, R&D and Archives always have value 0**, whatever is in HQ or Archives. HQ and Archives were both 0 here, which sends the comparison to the `==` branch and `_cardProtectionValue()` (~1368):

| Step in `_cardProtectionValue()` | Flyswatter (HQ) | Mycoweb (Archives) |
|---|---|---|
| Base for any ICE | 1 | 1 |
| Bonus if `rezCost > 4` or strength > 3 | no (rez 2, strength 0) | **+1** (rez 8, strength 5) |
| Central server bonus | +2 | +2 |
| `0.1 * sqrt(iceInServer - 1)` | 0 (1 ICE) | 0 (1 ICE) |
| Unrezzed multiplier x1.5 | 4.5 | 6.0 |
| Compatible breaker installed x0.5 | 2.25 | 3.0 |

Both are code gates and Buzzsaw is a Decoder, so both get the x0.5. Mycoweb is affordable (9 >= 8), so it is not zeroed out by the "cannot afford to rez" rule at ~1374. 3.0 > 2.25, so the AI logs "not worth it" and sets `rezIce = false`. The comparison is close to arbitrary: the only reason Mycoweb wins is that a higher rez cost is treated as higher protection, not because Archives is worth more than HQ, and not because the Runner was running Archives.

### 3.3 Why run 4 rezzed

The other-server half of the list is only built when the Runner could still run another server (~3731-3732):

```js
//in another server (if Runner has clicks to potentially run it)
if (runner.clickTracker > 0) {
```

The Runner spent a click to start each run. During runs 1, 2 and 3 it had 3, 2 and 1 clicks left, so Mycoweb was in the list. During run 4 it had 0, so the whole block was skipped, nothing was left to save credits for, and `_iceWorthRezzing()` returned true.

### 3.4 The gate does not ask whether the "other server" run is real

Two separate weaknesses meet here:

- The check treats "Runner has a click left" as "Runner might run that server", with no sign that it is likely. In this game the Runner's second and third runs came right after a successful HQ run, and no run that turn ever targeted Archives.
- The Corp reserves credits for ICE it might rez on a hypothetical run, at the cost of not rezzing the ICE the Runner is standing in front of right now.

---

## 4. Proposed fix

### 4.1 Require a strictly higher server value for ICE in other servers

Ice further in the *same* server is a real ordering question ("which of these do I pay for first"), so the tie-break on protection value stays there. For ICE in a *different* server, a tie on server value is not a reason to skip a rez the Runner is about to walk past.

In the loop at ~3759-3790, replace the condition:

```js
var sameServer = serverToCompare === server;
var otherIceMatters =
  valueToCompare > thisServerValue ||
  (sameServer &&
    valueToCompare == thisServerValue &&
    this._cardProtectionValue(iceToCompare) > thisIceProtectionValue);

if (otherIceMatters) {
  this._log("Rez cost not worth it, need to save it for " + iceToCompare.title + " in " + ServerName(serverToCompare));
  rezIce = false;
} else
  this._log("Rez this is better than " + iceToCompare.title + " in " + ServerName(serverToCompare));
```

Nothing else in the function changes. The block for defensive upgrades in the same server (~3795-3822) is already same-server only and is left alone.

### 4.2 Behaviour change

| Unrezzed ICE that could not be afforded alongside this one | Old result | New result |
|---|---|---|
| Same server (behind this ICE), higher protection value | reserve | reserve (unchanged) |
| Other server, **strictly higher** server value (e.g. a remote holding an agenda) | reserve | reserve (unchanged) |
| Other server, **equal** server value (central vs central, empty remote vs central) | reserve if its protection value is higher | **rez this ICE** |
| Other server, lower server value | rez this ICE | rez this ICE (unchanged) |

Replaying the log with the fix: on run 1, HQ value 0 vs Archives value 0 gives `Rez this is better than Mycoweb in Archives`, then `I will rez the approached ice`. The Corp pays 2 (9 to 7) and Flyswatter is rezzed for the whole turn. The Runner pays 1 credit for Buzzsaw on each of the four runs instead of only the fourth, so **3 more credits** from the Runner. It does not stop the accesses.

### 4.3 Decision for the maintainer

- **Minimal (this document):** strict `>` for other servers, as above.
- **Also make `_serverValue()` see central-server contents:** count agendas in HQ (and agendas or face-down cards in Archives), so a real difference between central servers breaks the tie instead of rez cost. `_serverValue()` is only used by `_iceWorthRezzing()` (~3698 and ~3746), so the change is contained. It is a larger behaviour change and needs its own fixtures.
- **Add +1 to the value of the server currently being run:** the Runner has shown intent, so ICE in front of it beats ICE guarding an equally valuable server it is not running. This goes further than the minimal fix: it also changes the case where another server holds one agenda and this one holds none.

This document assumes the minimal change unless told otherwise.

---

## 5. Tests

Follow `tests/fixtures/README.md`. This decision is made in `Phase_Approaching` with `attackedServer` and `approachIce` set; current decision snapshots preserve that run state. Two options:

1. Try a fixture with `// PHASE: Phase_Approaching` and `// OPTIONS: rez, ...`, setting `attackedServer=corp.HQ; approachIce=0` in `SETUP`. The runner may need extra stubs (`CheckRez`, `RezCost`, `CheckCredits`, `ServerName`, `GetServer`, ...).
2. Call `ai._iceWorthRezzing(card, RezCost(card))` directly in the `tests/corp-server-security.test.js` sandbox. This avoids the encounter-state problem and is the more reliable option.

The reproduction block at the end of the log has no credits, clicks or phase, so the state must be supplied:

- Corp: HQ ICE Flyswatter (`35079`) unrezzed, Archives ICE Mycoweb (`35053`) unrezzed, `corp.creditPool=9`.
- Runner: Buzzsaw (`30005`) installed, `runner.clickTracker=3`, `runner.creditPool=9`.
- `attackedServer = corp.HQ; approachIce = 0`.

Use `--ids` on the fixture runner to look up any other card IDs (for the remote agenda case).

| Test | Setup | Expected |
|---|---|---|
| `rez-flyswatter-not-saved-for-archives-mycoweb` | as above, `clickTracker=3` | `_iceWorthRezzing(flyswatter)` is **true** (reproduces the bug: false before the fix, true after) |
| `rez-flyswatter-runner-out-of-clicks` | as above, `clickTracker=0` | true (already true today; guards the click gate) |
| `still-saves-for-agenda-remote` | same, but Mycoweb is on a remote with an agenda in its root, `corp.creditPool=9` | **false** (guards against over-fixing: a strictly higher server value still reserves) |
| `still-orders-ice-within-one-server` | two unrezzed ICE in the same server, credits for only one of them | unchanged from today |

Also run the existing suite: `node tests/corp-server-security.test.js`, and `node -c ai_corp.js` for syntax.

---

## 6. Watch-outs

- **Trade-off:** after Flyswatter is rezzed the Corp has 7 credits, so it cannot rez Mycoweb if the Runner then runs Archives this turn. With `_serverValue()` blind to central-server contents that is a low-value loss in this game, but it becomes a real cost if Archives holds agendas or face-down cards. That is the reason to consider the second option in 4.3.
- **Narrow trigger:** the bug only happens when the Corp's credits fall between "can afford the other ICE" and "can afford both". The fix changes the tie-break, not that band, so the same log messages will still appear in other games, now with `Rez this is better than ...`.
- **`_cardProtectionValue()` is unchanged.** It is also used by `_iceAndRootProtection()` (~1420) and elsewhere. Do not change its rez-cost bonus as part of this fix.

---

## 7. Related observations (not part of this fix)

These came up while tracing the log. They are unverified beyond what is noted.

1. **`_serverValue()` ignores what a central server holds.** HQ with 3 agendas in hand has the same value (0) as an empty Archives. This is the deeper reason the tie exists. It is only called from `_iceWorthRezzing()`.
2. **`_aCompatibleBreakerIsInstalled()` ignores strength and cost** (its own comment says so). Buzzsaw (strength 3, +1 for 3 credits) is cheap against Flyswatter (strength 0, 1 subroutine) and expensive against Mycoweb (strength 5, 4 subroutines), but `_cardProtectionValue()` halves both equally. `_evaluateServerSecurity()` does account for this; `_cardProtectionValue()` does not.
3. **The reproduction block has no credits, clicks or phase**, as the fixture guide says, so any test built from it has to set them (see section 5).

---

## 8. Acceptance criteria

- [x] In `_iceWorthRezzing()`, ICE in a different server only reserves credits when that server's value is strictly greater than this server's.
- [x] ICE further in the same server still uses the protection-value tie-break.
- [x] With the board from the log (Corp 9 credits, Flyswatter on HQ, Mycoweb on Archives, Runner with clicks left), `_iceWorthRezzing()` logs `Rez this is better than Mycoweb in Archives` and returns `true`; `Phase_Approaching` therefore follows its existing `I will rez the approached ice` path.
- [x] A remote server with an agenda in its root and unrezzed ICE it cannot afford alongside this one still makes the AI save credits.
- [x] New tests from section 5 fail before the change and pass after.
- [x] `node -c ai_corp.js` passes and existing tests still pass.
- [x] No other AI decision logic was changed.

---

## 9. Implementation record

Implemented the minimal fix proposed in section 4.1. The broader alternatives in section 4.3 were deliberately left out because they would change how central-server contents or current-run intent contribute to server value and need separate fixtures and balancing.

### 9.1 Code changes

- Added a `sameServer` check to the unaffordable-ICE comparison in `_iceWorthRezzing()`.
- ICE in another server now reserves credits only when that server's `_serverValue()` is strictly greater than the approached server's value.
- ICE behind the approached ICE in the same server still uses `_cardProtectionValue()` to break equal-server-value ties.
- The same-server defensive-upgrade comparison and all later rez heuristics were left unchanged.

No other Corp AI decision logic was changed.

### 9.2 Regression tests

Added four cases to `tests/corp-server-security.test.js`:

| Test | Coverage | Result |
|---|---|---|
| `approached Flyswatter does not save credits for equal-value Archives Mycoweb` | Reproduces the reported 9-credit HQ-versus-Archives decision with Buzzsaw installed and Runner clicks remaining | Returns `true` and logs `Rez this is better than Mycoweb in Archives` |
| `approached Flyswatter rezzes when Runner has no clicks left` | Guards the existing other-server click gate | Returns `true` |
| `approached Flyswatter still saves for Mycoweb on a higher-value remote` | Guards against over-fixing when the other ICE protects an agenda remote | Returns `false` |
| `same-server ICE ordering retains the protection-value tie-break` | Guards the intended ordering between Flyswatter and stronger inner Mycoweb in one server | Returns `false` |

The primary reproduction test failed before the code change (`false !== true`) and passes after it.

Two existing game-point tests previously used equal-value central ICE as their reservation setup. Their assertions were still useful, but that setup depended on the behavior removed by this fix. They now use an agenda remote with a strictly higher server value, so they continue to verify the game-winning-breach override and the non-stopping-ICE case against a reservation that remains valid.

### 9.3 Verification

- `node tests/corp-server-security.test.js` passes: **81 regression cases passed**.
- `node -c ai_corp.js` passes.
- `git diff --check` passes.

## 10. Follow-up design correction — 22 September 2026

The strict-higher-server rule fixed the reported central tie, but review found
that it still reserved credits for any ICE on a higher-value remote even when
that particular rez did not improve the breach outcome. That was another proxy
decision rather than evidence that the reservation was useful.

Cross-server reservation now requires both:

1. the other server has strictly higher `_serverValue()`; and
2. `_iceWouldSecureServer()` shows that rezzing the specific candidate changes
   that server from breachable to secure, using post-payment credits and a
   side-effect-free with/without comparison.

The same-server protection-value tie-break remains an ICE-ordering heuristic.
Regression coverage now distinguishes decisive Brân on an agenda remote (save
credits) from a redundant Mycoweb on an already-secure agenda remote (rez the
approached ICE). This supersedes the broader statement in section 9 that server
value alone is sufficient for another-server reservation.

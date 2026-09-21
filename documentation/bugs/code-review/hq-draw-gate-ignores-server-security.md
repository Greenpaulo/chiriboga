# Corp AI: click-draw gate ignores `_evaluateServerSecurity()`, so it draws agendas into a breachable HQ

**Suggested location:** `documentation/bugs/` (move to `documentation/bugs/fixed/` once merged).
**Source:** `documentation/debug-logs/corp_drew_3_agendas_even_though_hq_wasn't_secure.txt`
**File:** `ai_corp.js` (line numbers are from `main` when this was written and will drift; search by function name).
**Status:** Fixed and regression-tested. See section 9 for the implementation record.

---

## 1. Summary

The Corp AI's "draw a card" decision in `Phase_Main` uses an old ICE-counting heuristic, `_evaluateHQDanger()`, to decide whether drawing is safe. It never calls `_evaluateServerSecurity(corp.HQ)`, which is the newer and correct way to ask "can the Runner get into HQ this turn?".

Because the old heuristic counts any ICE as protection, a single ICE that the Runner breaks for 1 credit still counts as "HQ protected". The AI kept clicking to draw while the Runner was successfully running HQ every turn, and the Corp ended its turn with 3 agendas in a 5-card HQ.

A second safeguard (comparing HQ's protection score to R&D's) exists, but it only runs on the last click, and in this game the hand was already full by then.

**Proposed fix:** delete `_evaluateHQDanger()`. Make the draw gate use `_evaluateServerSecurity(corp.HQ).isSecure` plus the agenda count in HQ. `_evaluateHQDanger()` has exactly one caller, and its two inputs (ICE count, agenda count) are fully superseded by the security evaluator plus `_agendasInHand()`.

---

## 2. What happened in the log

Corp: AU Co. Runner: René Loup Arcemont, with Buzzsaw installed. Buzzsaw breaks Flyswatter (the only ICE on HQ) for 1 credit. HQ was run 17 times (`corp.HQ.AISuccessfulRuns=17` in the reproduction block) and the Runner had already stolen Proprionegation and Longevity Serum from HQ.

The Corp's last turn in the log:

| Step | Corp HQ before | Action | Agendas in HQ after | Log lines that matter |
|---|---|---|---|---|
| Start of turn | `[Regolith Mining License, Empiricist]` (15 credits) | Mandatory draw (not a decision) | 1 | `HQ WEAKER THAN R&D ... with 1 agenda(s)` |
| Click 1 (3 clicks left) | 3 cards | **Draw** | 2 | `Maybe could draw an economy card?` then `HQ Danger Evaluation - ICE: 1, Agendas: 1` then `HQ_SAFE` |
| Click 2 (2 clicks left) | 4 cards | **Draw** | 3 | `HQ Danger Evaluation - ICE: 1, Agendas: 2` then `HQ_SAFE` |
| Click 3 (1 click left) | 5 cards = max hand | Draw block skipped (hand full), `Nothing good to do...`, **gain credit** | 3 | none |

The Runner's hand at the start of its next turn confirms the result: HQ held `[Sericulture Expansion, Offworld Office, Proprionegation, Regolith Mining License, Empiricist]`.

Meanwhile the AI's own server ranking said HQ was in bad shape the whole time:

```
Ranked server protection: {HQ:{score:-13.857..., secure:false}, ... R&D:{score:3.90...}, archives:{..., secure:true}}
AI: HQ WEAKER THAN R&D: protection 1.5 vs 4.5 with 3 agenda(s) - protection score penalized
```

Two parts of the AI disagreed about HQ, and the part that decides whether to draw was the wrong one.

---

## 3. Root cause

### 3.1 The draw gate uses the wrong evaluator

**Where:** `Phase_Main` economy/draw fallback, roughly lines 3087-3165 (search for `Maybe could draw an economy card?`).

```js
var hqDanger = this._evaluateHQDanger();
var drawIsOK = true;

if (hqDanger === "HQ_CRITICAL_HAZARD") {
  drawIsOK = false;
} else if (hqDanger === "HQ_MODERATE_HAZARD" && this._clicksLeft() < 2) {
  drawIsOK = false;
} else if (this._clicksLeft() < 2) {
  if (this._protectionScore(corp.HQ, {returnArchivesLowerScoreForHQIfBackdoor: true}) <
      this._protectionScore(corp.RnD, {})) {
    drawIsOK = false;
    this._log("But no I don't want to draw right now");
  }
}
if (drawIsOK) return optionList.indexOf("draw");
```

`_evaluateHQDanger()` (~lines 1429-1473) decides purely from counts:

| Condition | Result |
|---|---|
| 0 ICE and 2+ agendas in HQ | `HQ_CRITICAL_HAZARD` |
| 0 ICE and 1 agenda | `HQ_MODERATE_HAZARD` |
| 1+ ICE and 3+ agendas | `HQ_MODERATE_HAZARD` |
| anything else | `HQ_SAFE` |

With Flyswatter on HQ, 1 or 2 agendas in hand gives `HQ_SAFE`, whatever the Runner can actually do. Nothing in this function considers the Runner's credits, breakers, or how cheaply the ICE gets broken.

### 3.2 The real safeguard only runs on the last click

The third branch (`HQ protection < R&D protection`, logging "But no I don't want to draw right now") sits under `else if (this._clicksLeft() < 2)`. In this log both draws happened with 3 and 2 clicks left, so it never ran. On the last click the hand was full, so the whole draw block was skipped.

### 3.3 `_evaluateServerSecurity()` is only reaching the draw gate indirectly

The function was working correctly. It never printed "HQ appears secure", because it only logs when `isSecure` is true and HQ was never secure. Its call sites:

| Call site | Use |
|---|---|
| `_protectionScore()` (~2489) | Adds **+2** to a server's score if secure; otherwise contributes nothing. It is not a penalty. |
| ~2585 | Sets the `secure:` flag in "Ranked server protection". |
| ~286 | Breach-risk detection for HQ and R&D. |
| ~3659 / ~3667 | Rez-value calculation (with/without ICE). |
| ~4830 | The *installed draw card* path (e.g. Spin Doctor). It correctly checks `!_evaluateServerSecurity(corp.HQ).isSecure` with 2+ agendas. |
| **Click-draw gate (~3135)** | **Not called. This is the bug.** |

So the installed-draw-card path already uses the new logic, and the click-draw path was never migrated.

---

## 4. Proposed fix

### 4.1 Delete `_evaluateHQDanger()` and inline the logic in the draw gate

Confirmed by a repo-wide search: `_evaluateHQDanger`, `HQ_CRITICAL_HAZARD`, `HQ_MODERATE_HAZARD` and `HQ_SAFE` appear only in `ai_corp.js`, in the function itself and in the draw gate. There are no other callers, tests, or docs that reference them.

Replace the `hqDanger` / `drawIsOK` block with:

```js
// Drawing raises agenda density in HQ. That only matters if the Runner can actually get into HQ.
var hqSecure = this._evaluateServerSecurity(corp.HQ).isSecure;
var agendasInHand = this._agendasInHand();
var drawIsOK = true;

if (hqSecure) {
  // Runner cannot breach HQ this turn: drawing is safe.
} else if (agendasInHand >= 2) {
  drawIsOK = false;
  this._log("HQ is breachable with " + agendasInHand + " agendas in hand: not drawing");
} else if (agendasInHand === 1 && this._clicksLeft() < 2) {
  drawIsOK = false;
  this._log("HQ is breachable with 1 agenda in hand on last click: not drawing");
} else if (
  this._clicksLeft() < 2 &&
  this._protectionScore(corp.HQ, { returnArchivesLowerScoreForHQIfBackdoor: true }) <
    this._protectionScore(corp.RnD, {})
) {
  drawIsOK = false;
  this._log("But no I don't want to draw right now");
}
if (drawIsOK) return optionList.indexOf("draw");
```

Then remove `_evaluateHQDanger()` and its two-line header comment (~1428-1429). Keep the existing comment that the gate should not return early and should let the normal decision loop handle priorities.

### 4.2 Behaviour change

| HQ state | Agendas in HQ | Old result | New result |
|---|---|---|---|
| Secure (Runner cannot afford or cannot break) | any | draw allowed (but last-click protection compare could block) | draw allowed |
| Breachable, ICE present | 0 | draw allowed; last-click protection compare | same as old |
| Breachable, ICE present | 1 | draw allowed | draw allowed until last click, then blocked |
| Breachable, ICE present | 2 | draw allowed | **blocked at any click** |
| Breachable, ICE present | 3+ | blocked on last click only | **blocked at any click** |
| Breachable, no ICE | 2+ | blocked | blocked |
| Breachable, no ICE | 1 | blocked on last click | blocked on last click |

Replaying the log with the fix: the mandatory draw gives 1 agenda, click 1 still draws (2 agendas), click 2 is blocked (breachable HQ with 2 agendas), and the AI falls through to `Nothing good to do...` and gains a credit. Result: **2 agendas in HQ instead of 3**. The fix reduces the flood but does not stop the first click draw.

### 4.3 Decision for the maintainer

Keep the thresholds above (minimal change), or make the 1-agenda case stricter by blocking draws on a breachable HQ whenever `_clicksLeft() < 3`. The stricter version would have prevented both click draws in this log. This document assumes the minimal change unless told otherwise.

---

## 5. Tests

Follow `documentation/fixtures/corp_ai_decision_fixtures_guide.md` (note: the guide refers to `tests/corp-decision-fixtures.test.js`, but the repo currently has the runner and template in `documentation/fixtures/`, so check where it should live before adding fixtures). Existing security tests live in `tests/corp-server-security.test.js`.

**Important:** the reproduction block at the end of the log is the state *after* the three draws, with HQ full at 5 cards. A draw fixture needs a hand with room, so build the pre-decision state:

- `// PHASE: Phase_Main`
- `// OPTIONS:` the engine's offered options at that point, probably `install, gain, draw` plus `play` if applicable. Confirm this against a run, since it is not in the log.
- HQ hand: Regolith Mining License, Empiricist, and **two** of the three agendas (Sericulture Expansion, Offworld Office, Proprionegation), so HQ has 4 cards. Use `--ids` on the runner to look up card IDs.
- HQ ICE: Flyswatter, rezzed.
- Runner: Buzzsaw installed; credits about 0-3 (the log had 0 at that point).
- `// SETUP: corp.clickTracker=2; corp.creditPool=15; runner.creditPool=0`

Fixtures to add:

| Fixture | Setup | Expected |
|---|---|---|
| `corp-no-draw-breachable-hq-two-agendas` | as above, HQ breachable, 2 agendas, `clickTracker=2` | `// EXPECT: !draw` (this reproduces the bug: fails before the fix, passes after) |
| `corp-draw-ok-when-hq-secure` | HQ protected by ICE with mandatory breaks and no capable breaker (e.g. a hard lockout, like the Karunā lines in the log), 2 agendas in hand, `clickTracker=2` | `// EXPECT: draw` |
| `corp-draw-ok-one-agenda-early` (optional, only if keeping the minimal thresholds) | breachable HQ, 1 agenda, `clickTracker=3` | `// EXPECT: draw` |

Also run the existing suite: `node tests/corp-server-security.test.js`, and `node -c ai_corp.js` for syntax.

---

## 6. Watch-outs

- **Log spam:** `_evaluateServerSecurity()` logs `... appears secure: ...` every time it returns secure. `_protectionScore()` already calls it repeatedly (the log shows the same line 6+ times in a row; this is item 4 in `documentation/bugs/bugs2.md`). The draw gate adds another call. Do not add caching in this change unless it is trivial, but do not make the log noise worse: call it once per decision (as in the sketch above).
- **Unrezzed ICE overstates security:** `_evaluateServerSecurity()` budgets each unrezzed ICE against the Corp's full credits independently (finding A2 in `documentation/backlog/corp_ai_review_findings.md`). That means `isSecure` can be true when it should not be. The draw gate will inherit this until that finding is fixed.
- **Blocking a draw does not protect HQ.** It only stops the AI making HQ worse. The AI still needs to install and rez ICE on HQ (see below).

---

## 7. Related observations (not part of this fix)

These came up while tracing the log. They are unverified beyond what is noted.

1. **Fallback draw is aimed at economy.** The block that decided to draw is the "draw for an economy card" fallback (`Maybe could draw an economy card?`), which only checks that there is room in hand. The Corp had 15-16 credits, and nothing in the block asks whether it needs economy. A separate change could skip this fallback when credits are already high.
2. **ICE in hand, not installed.** The Corp held Empiricist (ICE) while HQ was breachable and logged `No obvious install options` with 15 credits. It was not traced why the ICE install path came back empty. The comment at ~4828 says drawing is allowed in an HQ emergency "as the only route to finding protection", which does not apply when protection is already in hand.
3. **No agenda install target.** Every turn logs `Scoring windows for empty servers: []`. It looks like agendas are only installed into protected empty remotes, and none existed. Not traced.
4. **Other debug logs in `documentation/debug-logs/` look related** (by file name only; not read): `corp_didnt_choose_to_play_ice_to_secure_hq_even_though_its_unsecure.txt`, `secured_remote_asset_when_hq_wasn't_secure.txt`, `corp_secured_pointless_archives_when_hq_has_no_etr_and_3_agendas_in_hand.txt`, `corp_installed_agenda_in_an_unsecure_server.txt`. They may share the same pattern: decisions made with older heuristics instead of `_evaluateServerSecurity()`. Worth checking after this fix lands.

---

## 8. Acceptance criteria

- [x] `_evaluateHQDanger()` and its comment header are removed, and `grep -rn "_evaluateHQDanger\|HQ_CRITICAL_HAZARD\|HQ_MODERATE_HAZARD" --include="*.js" .` returns nothing.
- [x] The click-draw gate uses `this._evaluateServerSecurity(corp.HQ).isSecure` and `this._agendasInHand()`.
- [x] A breachable HQ with 2+ agendas in hand never chooses `draw` at any click count.
- [x] A secure HQ still allows `draw`.
- [x] New fixture(s) from section 5 fail before the change and pass after.
- [x] `node -c ai_corp.js` passes and existing tests still pass.
- [x] No other AI decision logic was changed.

---

## 9. Implementation record

Implemented the minimal-threshold version proposed in section 4.

### 9.1 Code changes

- Removed `_evaluateHQDanger()` and all uses of `HQ_CRITICAL_HAZARD`, `HQ_MODERATE_HAZARD`, and `HQ_SAFE` from `ai_corp.js`.
- Changed the click-draw gate to evaluate HQ once with `this._evaluateServerSecurity(corp.HQ).isSecure` and count agendas with `this._agendasInHand()`.
- A breachable HQ containing 2 or more agendas now blocks a basic draw at every click count.
- A breachable HQ containing 1 agenda blocks a basic draw only on the last click, preserving the existing minimal threshold.
- A secure HQ permits the draw without applying the old last-click HQ-versus-R&D protection comparison.
- When a draw is blocked, the AI continues through the normal decision ladder instead of returning early. In the reproduction fixture it chooses `gain`.

No other Corp AI decision logic was changed.

### 9.2 Regression fixtures

Added these fixtures under `documentation/fixtures/`:

| Fixture | Coverage | Result |
|---|---|---|
| `corp-no-draw-breachable-hq-two-agendas.txt` | Reproduces Flyswatter being cheaply broken by Buzzsaw with 2 agendas in HQ | Chooses `gain`, not `draw` |
| `corp-draw-ok-when-hq-secure.txt` | Uses the same HQ state without an installed decoder, making Flyswatter a hard lockout | Chooses `draw` |
| `corp-draw-ok-one-agenda-early.txt` | Confirms the retained minimal threshold with 1 agenda and 3 clicks | Chooses `draw` |

The fixture runner in `documentation/fixtures/corp-decision-fixtures.test.js` was also corrected to load the repository from its actual location, supply the engine helpers required by `Phase_Main`, discover fixtures from its current directory, and accept fixture filenames so focused subsets can be run.

### 9.3 Verification

- The three new decision fixtures pass: **3 passed, 0 failed**.
- `node tests/corp-server-security.test.js` passes: **73 regression cases passed**.
- `node -c ai_corp.js` passes.
- `git diff --check` passes.
- A JavaScript search for `_evaluateHQDanger`, `HQ_CRITICAL_HAZARD`, `HQ_MODERATE_HAZARD`, and `HQ_SAFE` returns no matches.

The complete decision-fixture collection still includes the pre-existing intentionally failing `mulligan-one-ice-three-economy.txt` fixture described in the fixture guide. That unrelated known-red case was not changed as part of this fix.

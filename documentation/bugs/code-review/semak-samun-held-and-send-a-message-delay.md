# Corp AI: holds Semak-samun while a breachable agenda remote needs another ICE layer

**Source:** `documentation/debug-logs/chiriboga-log-2026-09-19T22_44_37.628Z.txt`  
**Files:** `ai_corp.js`, `tests/corp-server-security.test.js`, `tests/corp-decision-fixtures.test.js`
**Status:** Fixed and regression-tested. The log exposed both a protection-layer gap and a scoring-plan commitment gap.

---

## 1. Summary

The log contains two related bugs plus one misleading detail about Nanomanagement.

After the Runner installed Buzzsaw, the Corp held Semak-samun with 10 credits. Send a Message was sitting in Remote 1 behind one unrezzed Bumi 1.0, and the AI evaluated that remote as insecure. It nevertheless logged `No obvious install options` and clicked for credits three times. The global economy reserve was unaffordable, and `_shouldInstallIceLayer()` only allowed its at-risk exception when the target had no unrezzed ICE. The existing, breachable Bumi therefore suppressed every additional ICE option.

The long delay before advancing Send a Message was also a bug. The AI installed it because `_scoringWindow()` returned **5.40**, almost exactly its five-advancement requirement, but immediately afterward the global economy reserve blocked advancement. It clicked for two credits instead of using the two remaining clicks to advance twice. That broke what should have been a two-turn plan: install plus two advances, then three advances and score next turn.

Nanomanagement could not score a zero-counter Send a Message in one turn: playing it spends one click and grants two, leaving four advancement clicks. That detail is correct, but it does not excuse the delay. The Corp did not need Nanomanagement to execute the ordinary two-turn line.

The fix both preserves an affordable scoring commitment despite the global rez reserve and lets a poor Corp consider another affordable ICE layer when the security evaluator says a server with an agenda or asset is still breachable. The normal economy gate remains in force for uncommitted actions and for empty or secure servers.

---

## 2. What happened in the log

The relevant sequence is:

| Log lines | State / decision |
|---|---|
| 1170-1234 | The Corp installs Spin Doctor in Remote 1. On the Runner's subsequent run, Spin Doctor rezzes and removes itself. This was not the delayed agenda. |
| 1241-1271 | The Corp starts on 7 credits with two Send a Message copies in HQ and installs one into the now-empty Remote 1. Bumi 1.0 is its only ICE. `_scoringWindow()` reports 5.40, indicating a viable five-advance window. |
| 1272-1303 | With 2 clicks and 7 credits left, the AI logs `Nothing to advance (can't afford it)` twice and clicks for 2 credits. It could instead have placed the first two counters. |
| 1322-1484 | Send a Message remains at zero counters. The AI repeatedly reports that it cannot afford to advance. Nanomanagement remains in HQ. |
| 1490-1492 | The Runner installs Buzzsaw, making the rezzed Scatter Field on HQ and the unrezzed Bumi protecting Remote 1 realistically breachable. |
| 1533-1565 | The Corp starts on 10 credits holding Semak-samun, Luminal Transubstantiation and Nanomanagement. It reports every important server as insecure, but returns `No obvious install options`, `I am feeling poor`, and gains 3 credits rather than installing Semak-samun. |
| 1567-1589 | The Runner breaches HQ, steals Luminal Transubstantiation, and trashes Nanomanagement with Carnivore. |
| 1623-1842 | With HQ emptied and the reserve gradually reduced as ICE is rezzed or trashed, the Corp advances Send a Message once, once again on the next Corp turn, then three times and scores it on the following turn. |

The first bad decision begins immediately after the install at line 1271: the agenda planner commits Send a Message, but the economy gate prevents the advancement needed to execute that plan. The second occurs on the Corp turn beginning at line 1533, when Semak-samun is affordable, Remote 1 contains a three-point agenda, and the AI's own ranking marks the server insecure.

---

## 3. Root causes

### 3.1 An installed agenda was not treated as a scoring commitment

The advancement block in `Phase_Main()` previously ran only when the Corp had sufficient global economy, or an agenda was already finishable that turn:

```js
if (
  (almostDoneAgenda || almostDoneHostileAsset || sufficientEconomy) &&
  optionList.indexOf("advance") > -1
) {
  // consider advancing
}
```

The global economy calculation reserves credits for installed cards across the board. Immediately after installing Send a Message, that reserve failed even though the Corp had the 5 actual credits needed to advance and score the agenda across two turns. Because the agenda had zero counters and could not be completed in the two clicks remaining that turn, it was not `almostDoneAgenda` either. The entire advancement loop was skipped.

That explains the repeated `Nothing to advance (can't afford it)` messages. The scoring-window calculation and the advancement economy gate made contradictory decisions: one committed the agenda, while the other refused to progress it.

### 3.2 Existing unrezzed ICE blocked another necessary layer

`_rankedInstallOptions()` asks `_shouldInstallIceLayer()` whether it may generate ICE choices for the server that most needs protection. Before this fix, the final decision was:

```js
var shouldInstall = this._unrezzedIce(server).length == 0;
var serverAtRisk =
  server != null &&
  !this._evaluateServerSecurity(server).isSecure &&
  this._serverHasStakes(server);

// ...the rezzed-ICE economy check...

return shouldInstall || economyIsSufficient;
```

`serverAtRisk` could stop a rezzed ICE from triggering the poor-economy veto, but it could not override `shouldInstall === false` when any unrezzed ICE was already present. Remote 1's Bumi caused exactly that state. The AI did not ask whether Bumi actually secured the agenda remote; the presence of an unrezzed card was enough to prevent a second layer.

This is narrower than the earlier HQ reserve bug documented in `hq-ice-install-blocked-by-economy-reserve.md`. That fix covered a breachable server with only rezzed ICE. This log supplies the missing case: a server with stakes whose existing unrezzed ICE is itself insufficient.

### 3.3 What Nanomanagement could and could not do

For a normal three-click Corp:

| Action | Clicks remaining | Advancement on a fresh Send a Message |
|---|---:|---:|
| Start turn | 3 | 0 |
| Play Nanomanagement, then gain 2 clicks | 4 | 0 |
| Spend all remaining clicks advancing | 0 | 4 |

Send a Message requires five counters, so the play is one advancement short. Once the agenda has one counter, Nanomanagement can finish it from four remaining advances, but the Runner trashed Nanomanagement before the AI placed the first counter. Seamless Launch did not solve this because Send a Message had been installed on an earlier turn.

The stronger line needed no operation: use the two clicks remaining on the install turn for two advances, then use the next turn's three clicks to finish and score. The existing remote-safety comparison still determines whether the Corp should begin revealing an installed agenda; the fix only prevents the unrelated global reserve from freezing an otherwise affordable plan.

---

## 4. Fix

### 4.1 Preserve an affordable installed-agenda commitment

When `_returnPreference()` chooses an agenda install, it marks that card as an AI scoring-plan commitment. Added `_installedAgendaCanBeCompleted()`, which checks only those committed installed agendas against their remaining advancement requirement using the existing potential-advancement search without a same-turn click limit. `Phase_Main()` may now enter the advancement decision block when such a commitment exists even if `_sufficientEconomy()` is false.

This does not blindly advance every installed agenda. The existing per-card logic still requires the remote to be protected strongly enough relative to the Runner or HQ before starting, still respects deception posture, and still checks that the Corp can actually pay the remaining advancement cost.

In the reconstructed post-install state, the AI now chooses `advance` with both remaining clicks. On the next turn the agenda has two counters, is finishable with three clicks, and follows the existing `almostDoneAgenda` path to score. The plan therefore takes two Corp turns rather than five.

### 4.2 Permit a necessary second ICE layer

`_shouldInstallIceLayer()` now returns true for `serverAtRisk` as well as for the two existing cases:

```js
return shouldInstall || economyIsSufficient || serverAtRisk;
```

This is deliberately constrained:

- `_serverHasStakes()` requires an agenda or asset in a remote (or an agenda in HQ).
- `_evaluateServerSecurity()` must say the server is breachable.
- `_iceInstallOptions()` still filters out ICE the Corp cannot afford to install and rez.
- Empty servers and already-secure servers still respect the economy reserve.

The result is that the Corp can add Semak-samun outside Bumi on the exposed Send a Message server instead of holding it merely because one unrezzed layer already exists.

The decision-fixture runner also gained `EXPECT_CARD`, so this regression checks the selected card as well as the command and destination. A missing `CheckCounters` engine stub was added because the reconstructed board contains Syailendra, and the runner now uses a deterministic non-bluff random value by default so unrelated agenda-posture rolls cannot make fixtures alternate between results.

---

## 5. Tests

Added `tests/fixtures/corp-decisions/corp-continues-send-a-message-scoring-plan.txt`, reconstructed immediately after the agenda install with two clicks and 7 credits remaining. It asserts that the AI advances despite the unaffordable global reserve. This is the decision that previously became the first two wasted credit clicks.

Added `tests/fixtures/corp-decisions/corp-layers-breachable-agenda-remote.txt`, reconstructed from the reported board immediately after Buzzsaw became active. It asserts:

- command: `install`
- card: `Semak-samun`
- server: `Remote 1`, containing Send a Message behind unrezzed Bumi 1.0

Before the logic change, the fixture did not choose Semak-samun for Remote 1. With the fix, it passes.

Added three direct regression cases to `tests/corp-server-security.test.js`:

1. A poor Corp may layer a breachable agenda remote that already has unrezzed ICE.
2. A poor Corp does not layer an empty remote in the same state.
3. A poor Corp does not layer a secure agenda remote in the same state.

Validation results:

- `node tests/corp-server-security.test.js`: all 85 cases passed.
- `node tests/corp-decision-fixtures.test.js`: all green fixtures pass; the unresolved mulligan case is isolated under `tests/fixtures/corp-decisions-pending/`.
- `node -c ai_corp.js`: passed.
- `node -c tests/corp-decision-fixtures.test.js`: passed.

---

## 6. Acceptance criteria

- [x] When a server containing an agenda or asset is breachable, an existing unrezzed ICE no longer blocks consideration of another affordable layer solely because the global reserve is unaffordable.
- [x] In the reconstructed bug state, the AI installs Semak-samun on the Send a Message remote.
- [x] After committing Send a Message with two clicks and enough actual credits remaining, the AI advances twice instead of clicking for credits.
- [x] On the following three-click turn, the two-counter Send a Message is handled by the existing finish-and-score path.
- [x] The global rez reserve no longer freezes an installed agenda that the Corp can afford to complete, while the existing remote-safety check remains active.
- [x] Only agendas selected by the AI as scoring installs receive the commitment exception; unrelated installed agendas do not outrank urgent defense.
- [x] Empty remotes do not receive the new economy exception.
- [x] Secure agenda remotes do not receive the new economy exception.
- [x] The fixture verifies the chosen command, card and server.
- [x] Nanomanagement is not treated as capable of scoring a fresh five-advancement agenda from zero counters with three starting clicks.
- [x] The Corp security regression suite and syntax checks pass.
- [x] No unrelated AI decision logic was changed.

---

## 7. Implementation record (2026-09-21)

Agenda install preferences now mark their card as a scoring-plan commitment. Added `_installedAgendaCanBeCompleted()` and used it as a narrow alternative entry condition for the agenda-advancement block. This reconnects the scoring-window install decision to an affordable multi-turn completion plan without removing the existing per-card safety checks or making unrelated installed agendas outrank urgent defense.

Expanded the existing `serverAtRisk` exception in `_shouldInstallIceLayer()` to cover servers that already contain unrezzed ICE. Kept the exception bounded by the security evaluator, the stakes check, and the existing affordability filter.

Added separate source-game fixtures for continuing the two-turn scoring plan and reinforcing the agenda remote. Extended the fixture runner with card assertions and the Syailendra counter stub, and added focused positive and negative unit coverage. Nanomanagement's one-turn limitation is documented separately from the now-fixed multi-turn delay.

# Corp AI: installs ICE on an empty Remote 0 instead of a breachable HQ the Runner has just robbed twice (stale protection allocation, made visible by a rewind)

**Suggested location:** `documentation/bugs/` (move to `documentation/bugs/fixed/` once merged).
**Source:** `documentation/debug-logs/corp_chose_to_secure_remote_instead-of_hq_even_though_stole_2_agendas_from_hq_last_turn.txtx.txt` (note the doubled `.txtx.txt` extension; worth renaming).
**File:** `ai_corp.js`, with supporting reads in `phase.js`, `init.js`, `utility.js` and `decks.js` (line numbers are from `main` at `bd9bd79`, 2026-09-21, and will drift; search by function name).
**Status:** Diagnosed and reproduced headlessly. The cause is already fixed on `main` by Fix 1 of `documentation/bugs/code-review/pointless-archives-ice-install.md`, so no new decision logic is proposed. This document adds the regression coverage that bug did not have and lists optional hardening. Not yet replayed in the graphical game.

---

## 1. Summary

On the last Corp turn in the log, HQ was protected by a single Flyswatter that the Runner's Buzzsaw breaks for 1 credit. The Runner had just run HQ three times in a row for 3 credits, stealing Proprionegation and Longevity Serum. The AI's own ranking put HQ at **-7.71**, the worst server by about 12 points. The Corp had 16 credits and two ICE in hand (Semak-samun, Empiricist).

It installed Semak-samun on **Remote 0**, which already had two unrezzed ICE, an empty root and no agenda in hand to put in it. It then installed Byte! into Remote 0's root and gained a credit. HQ was left as it was.

The server choice comes from `_serverToProtect()`, which skips any server on the per-turn list `_protectionInstallsThisTurn`. In the code that produced this log that list was never cleared in real games (Problem A in `pointless-archives-ice-install.md`), so HQ, allocated on turn 1, stayed excluded for the rest of the game. This log adds a detail the earlier document did not have. The game was rewound three times, and a rewind rebuilds every remote server as a new object, so the *live* Remote 0 was not on the list while HQ was. That is why the AI went to Remote 0 rather than falling back to the worst-ranked server (HQ).

On `main` the list is cleared at every Corp turn start, and the reconstructed decision installs on HQ.

---

## 2. What happened in the log

Corp: AU Co. Runner: René "Loup" Arcemont, with Buzzsaw installed. `corp.HQ.AISuccessfulRuns=15` in the reproduction block. The `Version reference` stamp (Sat Sep 19 2026 22:23:18) and the `HQ Danger Evaluation` lines on the last click both show the log was produced by code older than the HQ draw-gate and pointless-Archives fixes.

### 2.1 The protection installs over the game

Each one is the "first insecure server not yet on the list", even when a worse server exists.

| Turn | Log line | Install | Ranking at the time | List if never cleared |
|---|---|---|---|---|
| 1, click 1 | 21 | ICE on R&D | R&D 0 (worst) | R&D |
| 1, click 2 | 35 | ICE on HQ | HQ -5 (worst) | R&D, HQ |
| 2 | 111 | ICE on a new remote (creates Remote 0) | new-remote slot 1 | + `null` |
| 3 | 321 | ICE on Remote 0 | Remote 0 1.39 | + Remote 0 |
| 4 | 529 | ICE on **Archives** | HQ **-4.99** (worst), Remote 0 3.8, Archives 3 | + Archives |

Turn 4 is the tell: HQ was the worst-ranked server by 8 points and was skipped. Every `Ranked server protection` line in the file has `debt:0` (0 lines with a non-zero debt), which is what you get when the aging step that adds debt never runs.

### 2.2 The last Runner turn (after the last "Rewinding...", lines 1127-1170)

Fermenter for +4, then three runs on HQ, each breaking Flyswatter's only subroutine with Buzzsaw for 1 credit. It stole Proprionegation and Longevity Serum, and accessed Semak-samun.

### 2.3 The last Corp turn (lines 1172-1322)

| Step | State | Action | Log lines that matter |
|---|---|---|---|
| Start of turn | 16 credits. Hand `[Byte!, Semak-samun, Empiricist]`, then the mandatory draw adds Regolith Mining License. HQ ICE: Flyswatter (rezzed). Remote 0: Tithe and Empiricist (both unrezzed), empty root. | Mandatory draw | `Ranked server protection: {HQ:-7.71 (secure:false), Remote 0:4.80 (secure:false), R&D:6.15 (secure:true), archives:7.65 (secure:true)}`, `Scoring windows for empty servers: [17.7459955687164]` |
| Click 1 | 3 clicks left | **Install ICE (Semak-samun) on Remote 0**, 2 credits (install cost = 2 existing ICE) | `Nothing to advance`, then `Corp installed ice protecting a remote server`. Remote 0 becomes 8.64, secure. |
| Click 2 | 2 clicks left | Install Byte! in Remote 0's root | `Corp installed a card in root of a remote server` |
| Click 3 | 1 click left | `Maybe could draw an economy card?`, then `But no I don't want to draw right now`, then gain 1 credit | `HQ Danger Evaluation - ICE: 1, Agendas: 0` |

The Runner's next hand shows the outcome: HQ held `[Regolith Mining License, Empiricist]`, no agendas, so nothing was lost this turn. What is wrong is the posture: 15 successful runs, two agendas just stolen, Flyswatter alone, 15 credits, and ICE in hand.

---

## 3. Root cause

### 3.1 The server choice skips anything already "allocated" this turn

**Where:** `_serverToProtect()` (~2633), `_recordProtectionInstall()` (~2594), `_returnPreference()` (~4103), used by `_rankedInstallOptions()` (~3273).

`_serverToProtect()` returns the first insecure server, worst first, that is **not** in `_protectionInstallsThisTurn`. Only if every insecure server is on the list does it fall back to the worst-ranked one. `_returnPreference()` adds the target to the list whenever an ICE install (`AIProtectionInstall`) is chosen, whether or not the action then runs.

### 3.2 In the code that produced the log, the list was never cleared

This is Problem A from `pointless-archives-ice-install.md`: `_ageProtectionPriorities()` only ran from `Phase_EOT()`, which the engine skips when the Corp has nothing to do at that point. The evidence in section 2.1 (worst server skipped on turn 4, `debt:0` everywhere) matches that document's analysis. `main` moved the call into `_prepareProtectionPrioritiesForCorpTurn()`, called from the guaranteed `Corp 1.2` hook in `phase.js` (~411).

### 3.3 Why Remote 0, not a fallback to HQ

If the list had simply never been cleared, then by turn 4 it would hold every server and the fallback would return HQ. It did not, because of the rewinds.

- The log contains three `Rewinding...` lines (702, 722, 1126). The last one sits directly before the final Runner and Corp turns.
- The rewind handler (`init.js` ~74-100) removes every card. `MoveCard` destroys a remote server once it has no ICE and no root (`utility.js` ~2835). It then `eval`s the saved `ReproductionCode()`, and `CorpTestField` builds each remote with a fresh `NewServer("Remote " + j, false)` (`decks.js` ~380).
- Central servers (HQ, R&D, Archives) are not rebuilt. The AI object is not part of the snapshot.

So after a rewind the list still holds HQ, R&D and Archives, the `null` new-remote slot, and a dead pre-rewind Remote 0 object. The live Remote 0 is a different object, so it counts as "unallocated and insecure" (4.80), and HQ counts as "already handled".

This step is inferred. The list's contents are not printed in the log. The reproduction below shows which list states give the log's decision, and the log evidence (section 2.1) fits.

### 3.4 Reproduction

I rebuilt the state before click 1 from the log's final dump: Semak-samun and Byte! moved back into HQ, Remote 0's root emptied and its third ICE removed. I ran `Phase_Main` in the headless fixture runner against `main`. The reconstruction reproduces the log's numbers exactly (`HQ -7.712662235383064`, `Remote 0 4.800000000000001`, `R&D 6.145562941028226`, `archives 7.645562941028226`, scoring window `17.7459955687164`), which is the main reason to trust it.

| `_protectionInstallsThisTurn` at click 1 | Result on `main` |
|---|---|
| Empty (what the turn-start hook produces) | Install ICE on **HQ** |
| HQ, R&D, `null`, Archives, and a dead Remote 0 object (rewind-shaped) | Install ICE on **Remote 0**. This is the log. |
| HQ only | Install ICE on **Remote 0** (so the dead entry is irrelevant; what matters is that the live Remote 0 is missing) |
| HQ, R&D, `null`, live Remote 0, Archives (never cleared, no rewind) | Install ICE on **HQ** (fallback to worst-ranked) |
| The rewind-shaped list, then `_prepareProtectionPrioritiesForCorpTurn()` runs | Install ICE on **HQ** |

The last row is why this is already fixed on `main`. A rewind lands on a turn start, and the next `Corp 1.2` clears the list before any decision.

---

## 4. Proposed fix

### 4.1 No new decision logic

`main` already contains the fix (Fix 1 of `pointless-archives-ice-install.md`). With a clean list the AI picks HQ, and it would even at this log's credit level with no special handling: 16 credits pass the economy gate. Do not add another reset inside `_serverToProtect()`. The per-turn list is deliberate, so that three clicks in one turn protect three different servers.

### 4.2 Optional hardening: reset AI turn state when rewinding

The turn-start hook makes this unnecessary for the decision above. It would make the AI's state match the restored board directly instead of relying on the next turn start:

```js
// ai_corp.js
_resetProtectionAllocations() {
  this._protectionInstallsThisTurn = [];
  this._serverProtectionDebt = new Map();
}
```

```js
// init.js, in the rewind handler, after eval(rewindStates[0].code) and before Main()
if (corp.AI && typeof corp.AI._resetProtectionAllocations === "function")
  corp.AI._resetProtectionAllocations();
```

Trade-off: clearing the debt map also throws away accumulated aging, so servers that were starved before the rewind start from 0 again. That is small, and arguably right, since the board it was earned on no longer exists.

Not recommended: keying the list by `serverName` instead of by object. `NewServer("Remote " + j)` reuses names after a server is destroyed, so a name can refer to a different server.

### 4.3 Decision for the maintainer

Adopt 4.2, or rely on the turn-start hook alone and only add the tests in section 5. This document assumes the hook alone unless told otherwise.

---

## 5. Tests

Follow `documentation/fixtures/corp_ai_decision_fixtures_guide.md` (its paths say `tests/`, but the runner and fixtures currently live in `documentation/fixtures/`, so check where they should live before adding files). Existing security tests live in `tests/corp-server-security.test.js`.

**Important:** the reproduction block at the end of the log is the state *after* the turn. The pre-decision state needs Semak-samun and Byte! back in HQ, and Remote 0 with only its two original ICE and an empty root. `SETUP` supplies what the log omits.

Fixture `corp-protects-hq-after-agendas-stolen.txt` (clean allocation list). It passes on `main`, and guards against ICE going to Remote 0 again:

```
// PHASE: Phase_Main
// OPTIONS: gain, draw, install, play, advance, n
// EXPECT: install
// EXPECT_SERVER: HQ
// SETUP: corp.creditPool=16; corp.clickTracker=3; runner.creditPool=2
// NOTE: HQ (one rezzed Flyswatter, broken by Buzzsaw for 1) just robbed twice. Remote 0 has two unrezzed ICE and an empty root, and there is no agenda in hand. Expect ICE onto HQ.
RunnerTestField(30001, [30020,35026,30020,30007,30007], [35007,35004,30004,35007,35011,35007,35029,30030,35011,35004,35004,30030,35009,35009,30009,30030,30034,30008,30007,30027,30004,35010,30003,30008,30027,35009,30022,30013,30034], [30003,35010,35008], [35010,30009,30005], [35048,30044], cardBackTexturesRunner,glowTextures,strengthTextures);
CorpTestField(35046, [35072,30050,30053,30053,30053,30075,30048,30040], [30046,35054,30050,35054,35051,35051,30040,30048,35050,35048,35050,30067,35052,35051,35049,30047,30075,30075,35072,30048,30073,30073,35049,30040,30071,35072,35049,35048,30067], [35050,35054,35052,30071], [35053], [30047], [35079], [[30073,35052]], [30067], cardBackTexturesCorp,glowTextures,strengthTextures);
corp.HQ.ice[0].rezzed=true;
corp.HQ.AISuccessfulRuns=15;
```

Card IDs: 35050 Byte!, 35054 Semak-samun, 35052 Empiricist, 30071 Regolith Mining License, 35079 Flyswatter, 30073 Tithe, 30047 Karunā, 35053 Mycoweb, 30067 Offworld Office (scored). The runner's rig is Buzzsaw (30005), Cookbook (30009), Cacophony (35010).

| Test | Setup | Expected |
|---|---|---|
| `corp-protects-hq-after-agendas-stolen` (fixture above) | clean list | install, server HQ. Passes on `main`. |
| `stale-allocation-cleared-at-turn-start` (unit test in `corp-server-security.test.js`) | Record HQ and a *different* object standing in for the pre-rewind Remote 0 in `_protectionInstallsThisTurn`. Set `_hasReachedCorpMainPhase = true`. Call `_prepareProtectionPrioritiesForCorpTurn()`. | `_serverToProtect()` returns HQ, and the list is empty. Fails if the hook is removed. |
| `first-corp-turn-does-not-age` | `_hasReachedCorpMainPhase = false`, call the hook | list and debt unchanged (already covered by the sibling document; keep it) |
| `rewind-resets-allocation` (only if 4.2 is adopted) | Fill the list and debt, call `_resetProtectionAllocations()` | list empty, debt map empty |

Also run `node documentation/fixtures/corp-decision-fixtures.test.js`, `node tests/corp-server-security.test.js`, and `node -c ai_corp.js` (plus `node -c init.js` if 4.2 is adopted).

---

## 6. Watch-outs

- **Headless only.** The reproduction is in the fixture runner, not the graphical game. Before closing this, replay a game with a rewind and check that `debt:` values become non-zero and that the Corp protects its worst server first afterwards. The sibling document lists the same follow-up.
- **The list contents at the final turn are inferred**, not logged. Adding a one-line `_log` of `_protectionInstallsThisTurn` (server names, `null` shown as `new`) to `_serverToProtect(..., outputToLog)` would make this kind of diagnosis direct.
- **Reconstruction assumptions.** Which ICE are rezzed comes from the dump (only Flyswatter). The option list is assumed (`gain, draw, install, play, advance, n`). Runner credits are the 2 shown at turn start; the AI's `Runner credits 5` in the log is higher, and I did not trace why (presumably a projection).
- **CRLF.** `ai_corp.js` uses CRLF line endings. Preserve them when editing.
- **Log spam.** `HQ WEAKER THAN R&D` and `appears secure` lines repeat hundreds of times per turn (`documentation/bugs/bugs2.md` item 4). That makes the decisive lines hard to find in logs like this one.

---

## 7. Related observations (not part of this fix)

1. **The other two logs you asked about.**
   - `corp_didnt_choose_to_play_ice_to_secure_hq_even_though_its_unsecure.txt` is **the same game**. Its first 866 lines are byte-identical to this log, and it ends three Corp turns earlier. The decision there is a different bug: with 11 credits after Hedge Fund, Semak-samun and 2 agendas in hand, and HQ at -10.7, the AI logged `No obvious install options` and `I am feeling poor`, then gained a credit. That is Problem C (the "too poor for new layers" gate). I reconstructed that state from its dump. On `main` the AI installs on HQ. With the Fix 3 Option A exception removed in a scratch copy it chooses `gain` with those same two log lines. So that one is fixed on `main`, by Fix 3 rather than Fix 1.
   - `corp_secured_pointless_archives_when_hq_has_no_etr_and_3_agendas_in_hand.txt` is a **different game** (Tithe on HQ, different rig). It is where Problems A, B and C were found. This log is Problem A again, without B or C: the economy gate passed with 16 credits, and Remote 0 is not Archives.
2. **Discarded first attempt at the last Corp turn** (lines 1018-1119, before the `Rewinding...` at 1126). HQ held 4 agendas at -15.58, the Runner was tagged, and Semak-samun and Empiricist were in hand. The AI spent clicks 1 and 2 on basic-action resource trashes (2 credits each; Cacophony, then Cookbook) and click 3 on installing into a remote root. It never put ICE on HQ. It was not traced why trashing outranked ICE there, and the state was not reproduced. It may be worth its own log and fixture.
3. **Once HQ is protected, Remote 0 is next.** On `main`, after Semak-samun goes onto HQ (HQ becomes 4.7, secure), a second install targets Remote 0. That is the intended allocation order and not a bug. An empty protected remote is a prepared scoring server.
4. **Only the first ICE install was in question.** Semak-samun is a hard lockout for this Runner (`break cost Infinity`), so the Corp getting it onto HQ rather than Remote 0 would have made HQ secure for the evaluator. Nothing in this analysis looked at whether Semak-samun or Empiricist is the better ICE for HQ (the ICE order is hand order, per the source comment).

---

## 8. Acceptance criteria

- [ ] `corp-protects-hq-after-agendas-stolen.txt` chooses `install` with `EXPECT_SERVER: HQ` (already true on `main`; verified headlessly on 2026-09-21).
- [ ] A test with a rewind-shaped stale list (`HQ` plus a dead remote object) shows `_serverToProtect()` returns HQ after `_prepareProtectionPrioritiesForCorpTurn()`.
- [ ] If 4.2 is adopted: rewinding empties `_protectionInstallsThisTurn` and `_serverProtectionDebt`, and `node -c init.js` passes.
- [ ] A graphical replay with at least one rewind shows non-zero `debt:` values and the worst server protected first on the Corp's next turn.
- [ ] `node -c ai_corp.js` passes and the existing suites still pass (the decision-fixture collection still has the known-red `mulligan-one-ice-three-economy.txt`).
- [ ] No other AI decision logic was changed.

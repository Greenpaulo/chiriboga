# Corp AI: never considers installing ICE on an unsecure HQ holding 2 agendas (Semak-samun stays in hand all turn) because the "too poor for new layers" reserve is 16 credits

**Location:** `documentation/bugs/done/`.
**Source:** `documentation/debug-logs/bug_raised/corp_didnt_choose_to_play_ice_to_secure_hq_even_though_its_unsecure.txt`
**File:** `ai_corp.js` (line numbers are from `main` at `bd9bd79` and will drift; search by function name).
**Status:** Done. Validated against current `main` and covered by a regression fixture. Every bad decision in this log is already corrected by the fixes for `pointless-archives-ice-install.md`, `hq-draw-gate-ignores-server-security.md` and `rez-decision-saves-credits-for-other-server-on-tie.md`. No additional AI decision-logic change is needed. Live graphical validation of the shared protection-debt mechanism is tracked separately in [`ice-install-remote-over-hq-stale-allocation.md`](../ice-install-remote-over-hq-stale-allocation.md).

---

## 1. Summary

On the last Corp turn in the log, HQ held 2 agendas (Longevity Serum, Proprionegation) and one piece of ICE in hand (Semak-samun, rez 3). HQ was guarded by a single Flyswatter, which the Runner's Buzzsaw breaks for 1 credit. The AI's own ranking scored HQ at **-10.71**, more than 11 points below the next-worst server, and `_evaluateServerSecurity(corp.HQ).isSecure` was `false`.

The Corp still never considered installing Semak-samun. All three clicks logged `No obvious install options` and `I am feeling poor`. It drew a card, played Hedge Fund, gained a credit, and ended the turn with 12 credits and Semak-samun still in hand.

**Is this the same problem as `pointless-archives-ice-install.md`? Yes.** It is that document's Problem C (the "too poor for new layers" gate) for the final turn, and Problems A and B (stale allocation list, Archives as a fallback target) for the Corp's earlier turn in the same game, where it put an 8-cost Mycoweb on an empty Archives. Both are fixed on `main` (`86a898f`).

The mechanism on the last turn: the ICE-install check requires `Credits(corp) >= (rez cost of every unrezzed ICE on the board, capped at 12) + 4`. Karunā (R&D, 4), Mycoweb (Archives, 8), Tithe (Remote 0, 1) and Empiricist (Remote 0, 7) total 20, which caps to 12, so the Corp needed **16 credits** before it would add a layer to a server that already had a rezzed ICE. It had 7, then 11, then 12. The gate never asked whether HQ could actually be breached or what was in it.

**How I checked this:** I rebuilt the state before click 1 from the log's final `CorpTestField`/`RunnerTestField` dump (recipe in section 5) and ran it in the fixture runner at three commits. On `1480509` (before any of today's fixes) it reproduces the log's decisions and its HQ ranking score to 15 significant figures. On `main` it chooses `install` Semak-samun onto HQ. With only the `serverAtRisk` exemption in `_shouldInstallIceLayer()` disabled, `main` goes back to not installing, so that exemption is what fixes this turn.

---

## 2. What happened in the log

Corp: AU Co. Runner: René Loup Arcemont, with Buzzsaw, Cookbook, Cacophony and a Fermenter installed. The log rewinds twice (lines 702 and 722), so the Runner's fourth turn is replayed. The Corp turn analysed below is the final pass (lines 787-866). The first pass (lines 650-701) makes the same decisions with HQ scored -9.71 instead of -10.71.

Board at the start of the last Corp turn:

| Server | ICE | Rezzed? | Rez cost |
|---|---|---|---|
| HQ | Flyswatter | Yes (rezzed on the Runner's 4th run, line 771) | 2 |
| R&D | Karunā | No | 4 |
| Archives | Mycoweb | No | 8 |
| Remote 0 | Tithe, Empiricist (Offworld Office in the root) | No | 1, 7 |

The three turns that matter:

| Turn | Log lines | State | What the AI did |
|---|---|---|---|
| Corp, turn before | 493-585 | 8 credits. Runner has 9 and has just installed Buzzsaw (line 488). HQ ranked -4.99, breachable, 1 agenda in hand. | Click 1: installs Mycoweb (rez 8) on an **empty Archives** (line 529). Click 2: installs Offworld Office in Remote 0's root (line 560). Click 3: `No obvious install options`, `I am feeling poor`, declines to draw, gains a credit. |
| Runner | 586-649 | Corp has 9 credits. Flyswatter and Mycoweb both unrezzed. | Four HQ runs. Runs 1-3 log `Rez cost not worth it, need to save it for Mycoweb in Archives` (lines 593, 608, 621). It rezzes only on run 4 (line 634). The Runner trashes the Corp's whole hand. |
| Corp, last turn | 787-866 | 7 credits, 0 cards. AU Co. adds 2 cards to HQ, then the mandatory draw: hand is `[Longevity Serum, Proprionegation, Semak-samun]`. Runner has 3 credits. | Click 1: `No obvious install options`, `I am feeling poor`, draws (Hedge Fund). Click 2: same two lines, plays Hedge Fund (11 credits). Click 3: same two lines, `But no I don't want to draw right now`, gains a credit (12). **Semak-samun is never installed.** |

The ranking line for the last turn (same at all three clicks):

```
Ranked server protection: {HQ:{score:-10.71..., secure:false}, null:{score:1}, archives:{score:2.64...}, Remote 0:{score:2.8...}, R&D:{score:6.14..., secure:true}}
```

`debt:` is 0 in every ranking line of this log (17 lines, 74 values), which is the symptom of Problem A from the pointless-archives document.

---

## 3. Root cause

### 3.1 The last turn: the economy reserve gate (Problem C)

**Where:** `_rankedInstallOptions()` (~3335-3342, search for `_shouldInstallIceLayer`), `_shouldInstallIceLayer()` (~3257), `_sufficientEconomy()` (~3153).

```js
var iceInstallEconomyCheck = this._sufficientEconomy(false, 4);   // "the 4 is arbitrary"
var serverToInstallTo = this._serverToProtect();
if (this._shouldInstallIceLayer(serverToInstallTo, iceInstallEconomyCheck)) {
  // ...only now are ICE cards in hand considered for serverToInstallTo
}
```

Inside `_sufficientEconomy()`:

```js
if (totalCost > 12 && Credits(corp) > Credits(runner)) totalCost = 12; //reduce chance Corp will get stuck
if (Credits(corp) < totalCost + buffer) return false;
```

The arithmetic for this turn (printed from the reconstruction; I also swept the Corp's credits and 16 is the lowest value that passes):

| Term | Value |
|---|---|
| Unrezzed ICE anywhere: Karunā 4 + Mycoweb 8 + Tithe 1 + Empiricist 7 | 20 |
| Capped because it is above 12 and the Corp (7) has more credits than the Runner (3) | 12 |
| Buffer passed by the ICE-install check | +4 |
| **Credits needed** | **16** |
| Corp credits at clicks 1 / 2 / 3 | 7 / 7 (11 after Hedge Fund) / 11 |

`iceInstallEconomyCheck` was therefore false every click. The old situation check then set `iceInstallSituationCheck = false` because HQ already had a **rezzed** ICE (Flyswatter) and the Corp was "poor". `_iceInstallOptions()` was never called, so Semak-samun was never a candidate, and the AI fell through to `No obvious install options`.

The gate never consulted `_evaluateServerSecurity(corp.HQ)` (`isSecure` was false because Buzzsaw breaks Flyswatter for 1 credit), never counted the 2 agendas in HQ, and treated a Flyswatter that costs the Runner 1 credit as adequate protection.

### 3.2 The reserve is inflated by ICE that protects nothing

The global reserve includes ICE on servers with nothing to lose (Mycoweb on Archives) and ICE the Runner is not attacking (Karunā on R&D, Empiricist and Tithe in front of an unadvanced agenda).

The Archives install is **not** what caused the last-turn block. Without Mycoweb the total is 4 + 1 + 7 = 12, which is not above 12, so there is no cap and the threshold is still 12 + 4 = 16. I confirmed this by rebuilding the state without Mycoweb: the pre-fix code still returns `draw`. Problem C stands on its own.

The cap matters: it is the only thing keeping the threshold at 16. If the Runner had had more credits than the Corp, the uncapped 20 would have made it 24.

### 3.3 The earlier turn: stale allocation list (Problems A and B)

On the turn before, the Corp had 8 credits and drew Mycoweb. `_serverToProtect()` returned Archives, so Mycoweb went there. The cause is Problem A/B from the pointless-archives document: `_protectionInstallsThisTurn` still held HQ and R&D (turn 1), the new remote slot (turn 2) and Remote 0 (turn 3), so Archives was the only "unallocated" insecure server. Every `debt:` value in the log is 0, which means the aging hook never ran.

Reconstruction of that turn (HQ -4.99, Archives 3, Remote 0 3.8, R&D 6.26; the log has -4.985 and 6.265, so it is close but not exact because I did not rebuild the Runner's virus counters):

| Code | Allocation list | Chosen install |
|---|---|---|
| `1480509` (before today's fixes) | stale (as in the log) | Mycoweb onto **Archives** (matches line 529) |
| `1480509` | clean | Offworld Office into Remote 0 |
| `main` | stale | Offworld Office into Remote 0 |
| `main` | clean | Offworld Office into Remote 0 |

### 3.4 How the pieces chain in this game

1. Problems A/B put Mycoweb (rez 8) on Archives.
2. The rez decision (`_iceWorthRezzing()`) then kept credits back "for Mycoweb in Archives" and waved the Runner through HQ for three free runs, trashing the Corp's hand (`rez-decision-saves-credits-for-other-server-on-tie.md`).
3. AU Co. refilled HQ with agendas, and the click-draw gate called HQ safe with 2 agendas in hand (`hq-draw-gate-ignores-server-security.md`).
4. Problem C then stopped the Corp installing the one ICE it held.

---

## 4. Proposed fix

### 4.1 No new code is needed for the decisions in this log

Each bad decision is covered by a fix already on `main`:

| Decision in the log | Cause | Fixed by |
|---|---|---|
| Mycoweb onto empty Archives (line 529) | A + B | `86a898f`: turn-start aging hook, `_nothingWorthProtecting()` |
| Flyswatter not rezzed for 3 runs (lines 593-621) | Rez tie-break | `bd9bd79` |
| Draw with 2 agendas in a breachable HQ (line 816) | Old ICE-count heuristic | `d12c5ec` |
| No ICE onto HQ on the last turn (lines 810, 832, 856) | C | `86a898f`: `_serverHasStakes()` and `_shouldInstallIceLayer()` (Fix 3 Option A) |

Reconstruction of the last turn (Corp 7 credits, 3 clicks, Runner 3 credits):

| Code | Result |
|---|---|
| `1480509` (before today's fixes) | `draw` (log line 816). `No obvious install options`, `I am feeling poor`, `HQ_SAFE`. |
| `d12c5ec` (after the draw-gate fix) | `gain`. The draw is blocked but nothing is installed. |
| `main` (`bd9bd79`) | `install` Semak-samun onto **HQ**. |
| `main` with the `serverAtRisk` term in `_shouldInstallIceLayer()` disabled | `gain` |

The last row is the important one: Fix 3 Option A is the single piece that fixes this turn.

### 4.2 Behaviour of the gate now

This is `_shouldInstallIceLayer()` on `main`. The rows marked "this log" are the ones this document reproduces.

| Server state | Corp can afford the reserve | Old gate | Gate on `main` |
|---|---|---|---|
| HQ breachable, agendas in hand, only **rezzed** ICE (this log, last turn) | No | no layer | **layer** |
| HQ breachable, agendas in hand, has **unrezzed** ICE (this log, turn before) | No | no layer | no layer (see 4.3) |
| HQ breachable, no agendas in hand, rezzed ICE | No | no layer | no layer |
| HQ secure, rezzed ICE | No | no layer | no layer |
| Any | Yes | layer | layer |

### 4.3 Decisions for the maintainer

1. **Should the at-risk exemption also cover a server whose ICE is all unrezzed?** On the turn before, HQ had an unrezzed Flyswatter, 1 agenda in hand and a Runner with Buzzsaw, and `main` still installs nothing on HQ (`_unrezzedIce(HQ).length > 0` and the reserve is unaffordable). I recommend leaving this alone. The missing behaviour there was rezzing the existing ICE, which `bd9bd79` fixed, and the only ICE in hand was Mycoweb (rez 8) against 8 credits, so stacking another unrezzed layer would not have helped.
2. **Option B from the pointless-archives document (evidence-based reserve) now has a second data point.** The "poor" verdict here came from 20 credits of ICE on servers the Runner was not attacking and one server with nothing in it. Option A works around that only for servers with agendas at stake. I would keep Option B as a follow-up, not part of this change.

---

## 5. Tests

Follow `tests/fixtures/README.md` and use `tests/corp-decision-fixtures.test.js`.

**Fixture A: `corp-protects-hq-when-reserve-exceeds-credits.txt` (required).** Build it from the last two lines of the log (`RunnerTestField(...)` and `CorpTestField(...)`):

```
// PHASE: Phase_Main
// OPTIONS: gain, draw, install, play, advance, n
// EXPECT: install
// EXPECT_SERVER: HQ
// SETUP: corp.creditPool=7; corp.clickTracker=3; runner.creditPool=3
RunnerTestField(...)      <- copied unchanged from the log
CorpTestField(...)        <- copied from the log, with 30075 (Hedge Fund) removed from the FIRST list (Archives)
corp.HQ.ice[0].rezzed=true;
corp.HQ.AISuccessfulRuns=9;
```

The other property lines at the end of the log (`faceUp`, `host`, `cardsInstalledThisTurn`, `runner.rig.programs[0].virus`) are not needed. `corp.HQ.AISuccessfulRuns=9` is needed to reproduce the ranking score exactly. Hedge Fund is drawn at click 1 and played at click 2 (lines 816 and 837), so the state before click 1 has it in R&D, not in Archives or hand.

Expected: passes on `main`; returns `draw` on `1480509` and `gain` on `d12c5ec`; returns `gain` on `main` if the `serverAtRisk` term is disabled.

**Fixture B: `corp-no-ice-on-empty-archives-mycoweb.txt` (optional).** The turn before, from the same dump: Archives cards `[]`, Archives ICE `[]`, HQ hand `[30067,35072,30053,30050,30053,35053]`, Remote 0 `[[30073,35052]]`, Runner hand without Hantu (`[30003,35010]`), no `corp.HQ.ice[0].rezzed` line, `corp.HQ.AISuccessfulRuns=0`.

```
// SETUP: corp.creditPool=8; corp.clickTracker=3; runner.creditPool=9; reviewAI._protectionInstallsThisTurn=[corp.HQ,corp.RnD,null,corp.remoteServers[0]]
// EXPECT: install
// EXPECT_SERVER: !Archives
```

This needs a small runner extension so `EXPECT_SERVER` accepts a leading `!`, like `EXPECT: !draw`. Do **not** pin the server to Remote 0: that is the questionable agenda install in section 7. The existing `corp-protects-hq-not-archives-stale-allocation.txt` already covers the Archives choice, so this only adds the 8-cost ICE case.

Also run `node tests/corp-decision-fixtures.test.js`, `node tests/corp-server-security.test.js` and `node -c ai_corp.js`.

---

## 6. Watch-outs

- **The fixture is a reconstruction.** The dump is the state after the turn. The hand at click 1 is certain from line 813 (`ICE: 1, Agendas: 2, Non-Agendas: 1`) and the end-of-turn hand on line 868. Corp and Runner credits come from lines 788-789. The reconstruction matches the log's HQ score exactly (-10.712662235383064), which is the main reason to trust it.
- **The turn-before reconstruction is approximate** (HQ -4.993 against -4.985 in the log, R&D 6.257 against 6.265) and is only used to confirm the Archives install. Treat Fixture B as optional for that reason.
- **The check is on decision only.** Both fixtures verify the chosen command and server at click 1. I have not replayed the change in the graphical game, so the next real log is still useful confirmation (in particular that `debt:` values are no longer all 0).
- **The cap in `_sufficientEconomy()` decides the threshold.** With the Corp richer than the Runner it is 16; with the Corp poorer than the Runner it would have been 24 here. Anyone tuning the reserve should test both cases.
- **Only agendas count as "stakes" for HQ.** `_serverHasStakes(corp.HQ)` is `_agendasInHand() > 0`. The Runner trashed Spin Doctor x2, Anoetic Void and Anthill Excavation Contract in this log, but a hand of assets alone would not trigger the exemption.

---

## 7. Related observations (not part of this fix)

1. **Agenda into an insecure remote.** On the turn before, `main` still installs Offworld Office into Remote 0 (reason string `HVT into scoring server`). Buzzsaw had just been installed and Remote 0 was ranked 3.8 and `secure:false` behind two unrezzed ICE. I did not trace why. `corp_installed_agenda_in_an_unsecure_server.txt` looks like the same pattern (by name only).
2. **Rewinds in the log.** The Runner's fourth turn was replayed twice (lines 702, 722). The AI's decisions were identical each time, so this is deterministic and not a random roll.
3. **Other logs show the same telltale lines.** `corp_chose_to_secure_remote_instead-of_hq_even_though_stole_2_agendas_from_hq_last_turn.txtx.txt` has 13 `No obvious install options` and 8 `I am feeling poor` lines, `secured_remote_asset_when_hq_wasn't_secure.txt` has 6 and 4, and `corp_installed_agenda_in_an_unsecure_server.txt` has 17 and 0. Every ranking line in all three has `debt:0`. I have not read them in detail. They are worth re-running after the next real game with the fixes in place.
4. **AU Co. floods HQ.** Its "look at top 3" adds 2 cards to HQ before the AI acts, so agenda density can jump before the first click. Nothing in the AI models this; not traced further.

---

## 8. Acceptance criteria

- [x] Fixture A is added under `tests/fixtures/corp-decisions/` and passes on `main`.
- [x] Fixture A fails (returns `gain`) when the `serverAtRisk` term in `_shouldInstallIceLayer()` is temporarily disabled, confirming it guards the right behaviour.
- Optional follow-up: add Fixture B with `EXPECT_SERVER` extended to accept `!`; this is additional coverage, not a closure requirement.
- [x] `node tests/corp-decision-fixtures.test.js` passes; the unresolved `mulligan-one-ice-three-economy.txt` case is isolated from the green suite.
- [x] `node tests/corp-server-security.test.js` and `node -c ai_corp.js` pass.
- [x] No AI decision logic is changed unless the maintainer chooses otherwise in section 4.3.
- Live graphical confirmation of non-zero protection debt is owned by [`ice-install-remote-over-hq-stale-allocation.md`](../ice-install-remote-over-hq-stale-allocation.md) and is not a closure requirement for this reproduced HQ decision.

---

## 9. Implementation record (2026-09-21)

Reviewed the report against the current `_shouldInstallIceLayer()` implementation and the source log. The diagnosis and recommendation in section 4.3 still hold: the existing `serverAtRisk` exemption is the correct fix for this state, while broadening it to servers that already have unrezzed ICE or replacing the global reserve remains out of scope.

Added `tests/fixtures/corp-decisions/corp-protects-hq-when-reserve-exceeds-credits.txt` from the source log's final board dump, with Hedge Fund removed from Archives to reconstruct the state before click 1. The fixture reproduces the logged HQ score exactly (`-10.712662235383064`) and selects `install`, Semak-samun, on HQ. With only the `serverAtRisk` exemption disabled in memory, it fails by selecting `gain`, confirming that it covers the intended behaviour.

Validation results:

- `node tests/corp-decision-fixtures.test.js`: all green fixtures pass; the unresolved mulligan fixture is kept in the pending directory.
- `node tests/corp-server-security.test.js`: all 81 regression cases passed.
- `node -c ai_corp.js`: passed.

No AI decision logic was changed. Fixture B remains optional. The separate
[`ice-install-remote-over-hq-stale-allocation.md`](../ice-install-remote-over-hq-stale-allocation.md)
ticket owns the future real-game check of the shared debt-aging path; this
ticket is complete because its reported decisions are reproduced and protected
by the passing fixtures above.

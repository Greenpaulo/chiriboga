# Corp AI: installs ICE on an empty Archives while an agenda-heavy HQ with no end-the-run stays exposed

**Suggested location:** `documentation/bugs/` (move to `documentation/bugs/fixed/` once merged).
**Source log:** `documentation/debug-logs/corp_secured_pointless_archives_when_hq_has_no_etr_and_3_agendas_in_hand.txt`
**File:** `ai_corp.js` (line numbers are from `main` as of 2026-09-20 and will drift; search by function name). One small engine change is also proposed in `phase.js`.
**Status:** Fixed and regression-tested. See section 10 for the implementation record. The reconstructed decision now installs ICE on HQ in both the clean and stale-allocation variants; the change has not yet been played in the graphical game.

---

## 1. Summary

On the last Corp turn in the log, HQ held 3 agendas and was protected by a single Tithe (a sentry with no end-the-run). The Runner had just run HQ twice for free. The AI's own ranking scored HQ at **-10.075**, far worse than any other server. The Corp had 5 credits and two ICE in hand (Semak-samun, Karunā). It installed Semak-samun on **Archives**, which was empty.

Three separate problems combine to produce this:

| #   | Problem                                                                                                                                                                                                                                            | Where it comes from                                                                                               |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| A   | The "already protected this turn" list (`_protectionInstallsThisTurn`) is never cleared in real games, so every server that matters looks "already handled" and the AI falls through to the least important one.                                   | **This fork** (Layer 3.5, commit `82d1387`, 2026-09-16)                                                           |
| B   | Archives is an eligible ICE-install target even when it holds nothing worth protecting.                                                                                                                                                            | The fallback in `_serverToProtect()` (fork code) plus the +3 deprioritisation in `_protectionScore()` (upstream)  |
| C   | The "too poor for new layers" gate refuses to add ICE to a server that already has any rezzed ICE, however weak that ICE is, whenever the Corp's credits are below a global reserve. It ignores how breachable the server is and what is at stake. | **Upstream** (`bobtheuberfish/chiriboga`), unchanged in `drbo6/chiriboga`, present since this repo's first commit |

Fixing A and B stops the Archives install. Fixing C is what makes the AI protect HQ at low credits instead of doing nothing.

---

## 2. What happened in the log

Corp: AU Co. Runner: René "Loup" Arcemont (rig: DZMZ Optimizer, Carnivore, Leech, Rising Tide, which is a fracter). HQ ICE: one rezzed Tithe. The Runner ran HQ 4 times in the game (`corp.HQ.AISuccessfulRuns=4`).

Last Corp turn (log lines ~848-914):

| Step          | State / decision                                                                                                     | Notes                                                                                                                                                                                         |
| ------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Start of turn | 5 credits, hand `[Longevity Serum, Anthill Excavation Contract, Hedge Fund, Proprionegation, Semak-samun]`           | AU Co. "look at top 3" added 2 cards to HQ and trashed 1; then the mandatory draw. **Inferred** hand at click 1 (8 cards): the five above plus Spin Doctor, Karunā, a second Proprionegation. |
| Click 1       | `Ranked server protection: HQ -10.075, null 1, archives 3, R&D 4.375`, then `Corp installed ice protecting Archives` | Semak-samun (rez 3) went on Archives.                                                                                                                                                         |
| Click 2       | `I am feeling poor`, plays Hedge Fund (+4 net, 9 credits)                                                            | The new unrezzed Semak-samun raised the "reserve", so the Corp now counted as poor.                                                                                                           |
| Click 3       | `No obvious install options`, gains a credit                                                                         | 9 credits, HQ still at -10.075, Karunā still in hand.                                                                                                                                         |
| Runner turn   | Corp has 10 credits and 5 cards: `[Spin Doctor, Karunā, Proprionegation, Longevity Serum, Proprionegation]`          | HQ still has one Tithe.                                                                                                                                                                       |

The `HQ WEAKER THAN R&D ... protection score penalized` line and the -10.075 score show the evaluator knew HQ was in trouble the whole time. The decision about where to install ICE ignored it.

---

## 3. How this was reproduced

The log's final `RunnerTestField(...)`/`CorpTestField(...)` dump is the state **after** the turn. I rebuilt the state before click 1 from it (Semak-samun moved back from Archives into HQ, Hedge Fund and Anthill moved from Archives to HQ, HQ hand of 8) and ran `Phase_Main` in the fixture runner (`tests/corp-decision-fixtures.test.js`). The full fixture is in Appendix A.

The reconstruction reproduces the log's ranking exactly (`HQ -10.075, null 1, archives 3, R&D 4.375`), which is the main reason to trust it. The hand contents and which ICE were rezzed are inferred (see Appendix A notes).

Results (Corp credits 5, clicks 3 unless noted):

| Scenario | Allocation list                                      | Code                               | Result                                                                                                                              |
| -------- | ---------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1        | Empty (clean)                                        | baseline                           | **No install at all** (`No obvious install options`). HQ stays exposed. This is problem C.                                          |
| 2        | Empty (clean), **9 credits**                         | baseline                           | Installs Semak-samun on **HQ**.                                                                                                     |
| 3        | HQ, R&D, new-remote slot and Remote 0 already marked | baseline                           | `_serverToProtect()` returns Archives; installs Semak-samun on **Archives**. **This is exactly the log.** This is problems A and B. |
| 4        | Empty (clean)                                        | prototype gate change (Appendix C) | Installs Semak-samun on HQ at 5 credits.                                                                                            |
| 5        | HQ, R&D, new-remote slot and Remote 0 already marked | both prototype changes             | Installs Semak-samun on HQ.                                                                                                         |

Scenario 3 shows the Archives choice needs stale allocations. Scenario 1 shows that even without them the AI would have done nothing useful for HQ at 5 credits.

---

## 4. Root causes

### 4.1 Problem A: the allocation list is never reset in real games

**Where:** `_serverToProtect()` (~2675), `_recordProtectionInstall()` (~2642), `_ageProtectionPriorities()` (~2651), `Phase_EOT()` (~4016, call at ~4070).

`_serverToProtect()` returns the first insecure server that is **not** in `_protectionInstallsThisTurn`, and only falls back to the worst-ranked server if every insecure server is on that list. `_returnPreference()` adds a server to the list whenever the AI chooses an ICE install for it (`AIProtectionInstall`).

The list is only cleared inside `_ageProtectionPriorities()`, which has exactly one caller: the end of `Phase_EOT()`. The Layer 3.5 roadmap entry says this is meant to run "at the end of the Runner turn".

`Phase_EOT` runs only when the engine asks the Corp AI to act in "Runner 2.2" (the Runner's discard-phase response). In `init.js`, `Main()` computes `autoExecute = optionList.length == 1` and skips the AI when the only option is "n". So when the Corp has nothing to rez or trigger at that point, `Phase_EOT` is never called, and `_ageProtectionPriorities()` never runs.

Evidence that this is what happens in real games:

- `debt` is **0 in every ranking line in all 14 logs in `documentation/debug-logs`** (0 of 299 lines). `_ageProtectionPriorities()` adds debt to every insecure, unallocated server each time it runs, and HQ was insecure and unprotected for several Runner turns in this log.
- Allocations from turn 1 (HQ, R&D) and turn 2 (new remote) therefore stay on the list for the rest of the game, which leaves Archives as the only "unallocated insecure" server.

**Not yet verified:** I did not step through the running game to confirm `Phase_EOT` is skipped on those specific turns. The evidence above is strong but circumstantial. The implementing agent should add a `console.log` at the top of `_ageProtectionPriorities()` and replay the log's game to confirm before changing anything.

### 4.2 Problem B: Archives is a valid fallback target even when pointless

**Where:** `_serverToProtect()` (~2675), `_protectionScore()` (~2507).

Archives is always in `_rankedServersToProtect()`. `_protectionScore()` adds +3 to deprioritise it (unless it is a backdoor into HQ), but a deprioritised entry is still "unallocated and insecure", so it wins as soon as every other server is on the allocation list. An empty Archives with no agendas in it has nothing to protect.

### 4.3 Problem C: the "too poor for new layers" gate

**Where:** `_rankedInstallOptions()` (~3330-3360), `_sufficientEconomy()` (~3211).

Not added in this fork: the gate, its comment (`//too poor? don't spend frivolously on new layers`) and `_sufficientEconomy(false, 4)` with the comment "the 4 is arbitrary" are in upstream `bobtheuberfish/chiriboga` and `drbo6/chiriboga`, and this repo's history starts with an "Initial clean commit" (`97dfdfa`, 2026-09-14) that already contains them, so `git blame` cannot go further back.

What it actually does:

```js
var iceInstallEconomyCheck = this._sufficientEconomy(false, 4); // "the 4 is arbitrary"
var serverToInstallTo = this._serverToProtect();
var iceInstallSituationCheck = this._unrezzedIce(serverToInstallTo).length == 0;
if (!iceInstallEconomyCheck && this._rezzedIce(serverToInstallTo).length > 0)
  iceInstallSituationCheck = false; // "too poor" gate
if (iceInstallSituationCheck || iceInstallEconomyCheck) {
  /* consider ICE for serverToInstallTo */
}
```

It is not a fixed "under 8 credits" rule. `_sufficientEconomy(false, 4)` requires `Credits(corp) >= (sum of rez costs of EVERY unrezzed installed ICE, asset and upgrade) + (reserved use costs for a 13-title table, remotes only) + 4`. In the reconstructed board that sum is R&D Tithe (1) + Remote 0's unrezzed Semak-samun (3) = 4, so the threshold happens to be 8. I confirmed 5, 6, 7 credits fail and 8+ pass. The threshold moves whenever any ICE anywhere on the board is unrezzed.

Why it misfires here:

1. **It treats any rezzed ICE as adequate protection.** The gate only asks "does this server already have a rezzed ICE?", not "can the Runner walk through it?". Tithe has no end-the-run and the Runner passed it for free twice. `_evaluateServerSecurity(HQ).isSecure` is `false`, but the gate never consults it.
2. **It ignores stakes.** HQ held 3 agendas. The gate has no notion of what a breach would cost.
3. **The reserve is global.** Unrezzed ICE on other servers (R&D, a remote) block reinforcing the most vulnerable server. The reserve is meant to make sure the Corp can rez what it has, but there is no comparison between the value of that reserve and the value of closing a hole in HQ.
4. **It compounds.** After the Archives install, the extra unrezzed 3-cost ICE raised the threshold to 11 (by my arithmetic: 1 + 3 + 3 + 4). At click 3 the Corp had 9 credits after Hedge Fund, so HQ was blocked again even though 9 credits would have passed before the pointless install.

You are right that this should be based on how insecure the server is and what is at stake. See Fix 3.

---

## 5. Proposed fixes

### Fix 1 (required): make the allocation reset and aging run every turn

Move `_ageProtectionPriorities()` out of `Phase_EOT` and into the engine's existing start-of-turn bookkeeping in `phase.js` (the block that runs on `"Corp 1.2"`/`"Runner 1.2"` and already does the `AITurnsInstalled++` aging and the `SPOILER: At start of ...` logging). That block always runs, regardless of whether the AI is asked to act.

```js
// phase.js, in the start-of-turn block, for the Corp's turn only:
if (
  currentPhase.identifier == "Corp 1.2" &&
  corp.AI &&
  typeof corp.AI._ageProtectionPriorities === "function"
) {
  corp.AI._ageProtectionPriorities(); // end of the Runner turn = start of the Corp turn
}
```

Requirements:

- Remove the call at the end of `Phase_EOT()`. Otherwise turns where `Phase_EOT` does run age twice.
- Guard against the very first Corp turn: at game start nothing has been allocated, so the function would give every insecure server +1 debt before the Corp has acted. Only age if the Corp has already had an action phase (for example a flag set in `Phase_Main`).
- Keep the engine change tiny and guarded (`corp.AI` may be null when a human plays the Corp).

**Risk:** this will make the Layer 3.5 debt mechanism run in real games for the first time. Its calibration follow-up (Layer 3.5.1 in `corp_ai_improvement_roadmap.md`) has never been exercised on real play, so install decisions may shift in other situations. Watch for `debt:` values in ranking logs after the change (they should now become non-zero) and re-check the other debug logs in `documentation/debug-logs`.

An AI-only alternative (if you would rather not touch `phase.js`): in `Phase_Main`, when `corp.actionsCompletedThisTurn === 0` (the engine resets it in `corpActionStart.Init` and increments it in `corpPostAction.Init`), clear the list and age once per round using a stored round marker.

### Fix 2 (required): Archives is only a target when it has something to protect

Exclude an Archives that holds no agendas and is not a backdoor into HQ from the "unallocated insecure" candidates in `_serverToProtect()`. If everything else is allocated, fall back to `ranked[0]` (the worst server) as the code already does for an empty candidate list. Prototype in Appendix C (`_nothingWorthProtecting()`).

### Fix 3: replace "any rezzed ICE = fine when poor" with an evidence-based test

**Option A (small, prototyped):** a breachable server with something to lose is never "frivolous" to reinforce. Skip the gate when `!_evaluateServerSecurity(target).isSecure` and the target has stakes (HQ with agendas in hand, or a remote with an agenda or asset in its root). In the reconstruction this makes the AI install on HQ at 5 credits. Prototype in Appendix C.

**Option B (recommended direction, needs a design decision):** decide whether a layer is a good use of credits from the security evaluator and the stakes, instead of a global reserve plus a buffer of 4.

1. **How insecure is the target?** Use `_evaluateServerSecurity(target)`: `isSecure`, and how far `totalBreakCost` is below the Runner's effective credit pool. A server the Runner can breach for free needs a layer far more than one that costs 6 to break.
2. **What is at stake?** HQ: agendas in hand (and hand size). Remote: agenda or asset value and advancement. Archives: agendas in it, or being a backdoor to HQ. R&D: no hidden-information shortcut, so keep the current handling.
3. **Would this specific ICE change the answer?** Compare the evaluator before and after a hypothetical install (the install-decision roadmap already requires hypothetical evaluation to be side-effect free; use the same overlay).
4. **Can we afford it?** Install cost plus rez cost against current credits (plus expected income if it can wait a click). Only reserve credits that are _needed_ for rezzing ICE that protects something, and compare that reserve against the gap being closed, rather than blocking outright.
5. Keep the old frugality only for servers that are already secure or have nothing to lose.

Related: `documentation/backlog/corp_ai_review_findings.md` item 8 already flags `_sufficientEconomy()`'s hard-coded reserve table (`AIReserveCredits` proposal). This gate is a separate problem, but a shared redesign of the reserve would help both.

**Recommendation:** ship Fix 1 and Fix 2 with Fix 3 Option A now (all three prototypes together fix this log), and treat Option B as a follow-up in the install-decision roadmap.

---

## 6. Tests

Use the fixture runner (`tests/corp-decision-fixtures.test.js`; see `tests/fixtures/README.md`) and `tests/corp-server-security.test.js`.

Fixture A (Appendix A) reproduces the log. The runner currently checks only the chosen command name, so it needs a small extension to also check the install target. Add an `// EXPECT_SERVER: HQ` directive that compares `ai.preferred.serverToInstallTo.serverName` after `Phase_Main` returns.

| Test                                             | Setup                                                                                                                                                                                 | Expected                                                      |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `corp-protects-hq-not-archives-stale-allocation` | Appendix A, plus `SETUP: reviewAI._protectionInstallsThisTurn=[corp.HQ, corp.RnD, null, corp.remoteServers[0]]`                                                                       | install, server HQ (fails before Fix 2, currently Archives)   |
| `corp-protects-hq-when-poor`                     | Appendix A, 5 credits, clean allocation                                                                                                                                               | install, server HQ (fails before Fix 3, currently no install) |
| `corp-no-ice-on-empty-archives`                  | Unit test in `corp-server-security.test.js`: `_serverToProtect()` never returns Archives when Archives holds no agenda and is not a backdoor, even if every other server is allocated | HQ (worst server)                                             |
| `corp-archives-with-agenda-still-protectable`    | Same, with an agenda in Archives                                                                                                                                                      | Archives allowed                                              |
| `corp-gate-still-skips-secure-server`            | Target server secure, Corp poor                                                                                                                                                       | no extra layer (old behaviour preserved)                      |
| `allocation-reset-each-turn`                     | Unit test: after the turn-start hook, `_protectionInstallsThisTurn` is empty and debt reflects the previous round exactly once                                                        | passes with and without a `Phase_EOT` call                    |

Also run `node -c ai_corp.js`, `node -c phase.js`, and the existing suite.

---

## 7. Watch-outs

- **Fix 1 changes behaviour everywhere.** The debt mechanism has effectively been dead code in real games; turning it on can shift protection choices in every game. Re-check the other related logs afterwards.
- **Stub gaps in the harness.** To run `Phase_Main` on this state I had to add `PlayerHand`, `MaxHandSize`, `Link`, `Shuffle` and `AllCards` stubs (Appendix B). `FullCheckPlay` is still missing, which stopped the run after the install decision, so the run past that point is untested. Keep the stubs in sync with `tests/corp-server-security.test.js`.
- **Hand contents are inferred.** I reconstructed the 8-card hand at click 1 from the start-of-turn hand and the end-of-turn hand. The exact 3 new cards are certain to be Spin Doctor, Karunā and a Proprionegation only because of those two snapshots.
- **ICE choice on the corrected target.** With Fix 1-3 the AI installs Semak-samun on HQ first (the option list is in hand order; the source comment says "for now we make no effort to sort them"). Against this Runner (only a fracter, no killer), Karunā (a sentry that does 2 net damage) may be the better pick. That is a separate ICE-selection issue.

---

## 8. Related observations (not part of this fix)

1. **`using arbitrary option` in the log is harmless.** At Corp 2.1 the option list contains neither "gain" nor "install", so `Phase_Main` falls through to `return 0`, which is "proceed". The real decision is made on the following call at Corp 2.2. It is log noise, not a bug, and could be silenced by returning the "n" index explicitly.
2. **Other debug logs may share these root causes.** `corp_didnt_choose_to_play_ice_to_secure_hq_even_though_its_unsecure.txt` and `corp_chose_to_secure_remote_instead-of_hq_even_though_stole_2_agendas_from_hq_last_turn.txtx.txt` look like the same pattern (I have not read them). Re-check them after Fix 1 and Fix 3.
3. **Repeated `HQ WEAKER THAN R&D` log lines** (hundreds in this log) are emitted from `_protectionScore()` on every evaluation. Consider logging it once per decision (`documentation/bugs/bugs2.md` item 4 is the same class of problem).

---

## 9. Acceptance criteria

- [x] `_ageProtectionPriorities()` is called exactly once per round from an engine hook that always runs, is not called from `Phase_EOT`, and does nothing before the Corp's first action phase.
- [x] `_serverToProtect()` never returns an Archives that has no agenda and is not a backdoor to HQ.
- [x] A breachable HQ holding agendas gets a layer even when the Corp is under the old "reserve + 4" threshold.
- [x] A secure server (or one with nothing to lose) still respects the old economy gate.
- [x] Fixture A passes with `EXPECT: install` and `EXPECT_SERVER: HQ` under both allocation states.
- [x] After the change, protection debt increases for skipped insecure servers, resets for protected servers, and the per-turn allocation list is cleared by the turn-start path.
- [x] `node -c ai_corp.js`, `node -c phase.js`, and `node tests/corp-server-security.test.js` all pass.
- [x] No unrelated AI decision logic was changed.

---

## 10. Implementation record

Implemented Fixes 1 and 2 plus Fix 3 Option A, as recommended in section 5.

### 10.1 Code changes

- Moved protection-priority aging out of `Phase_EOT()` and into the guaranteed Corp `1.2` start-of-turn hook in `phase.js`.
- Added `_hasReachedCorpMainPhase` and `_prepareProtectionPrioritiesForCorpTurn()` so the first Corp turn does not age priorities before the Corp has made any allocation decisions.
- Excluded a valueless Archives from both the normal unallocated choice and the ranked fallback. This is slightly stronger than the Appendix C prototype and guarantees `_serverToProtect()` cannot return an empty Archives unless it is a backdoor to HQ. Archives remains eligible when it contains an agenda.
- Added `_serverHasStakes()` and `_shouldInstallIceLayer()` to make the low-economy exception explicit and independently testable. A breachable HQ with an agenda, or a breachable remote containing an agenda or asset, may receive another ICE layer despite failing the old global reserve check. Secure and low-stakes servers retain the old frugality rule.
- Marked the allocation only through the existing `AIProtectionInstall` path; no ICE-choice or unrelated install priorities were changed.

### 10.2 Regression coverage

- Extended `tests/corp-decision-fixtures.test.js` with `EXPECT_SERVER`, so a fixture can verify the install destination as well as the command. Also added the missing deterministic `Shuffle` stub needed by this reconstruction.
- Added `corp-protects-hq-when-poor.txt`: with 5 credits and a clean allocation list, the AI chooses `install` targeting HQ.
- Added `corp-protects-hq-not-archives-stale-allocation.txt`: with HQ, R&D, the new-remote slot and Remote 0 already allocated, the AI still chooses `install` targeting HQ rather than Archives.
- Added unit coverage for empty Archives exclusion, Archives containing an agenda, the poor/breachable versus poor/secure economy rule, and the opening-turn aging guard.

### 10.3 Verification

- `node -c ai_corp.js`: passes.
- `node -c phase.js`: passes.
- `node tests/corp-server-security.test.js`: **77 regression cases passed**.
- The two new decision fixtures: **2 passed, 0 failed**.
- `git diff --check`: passes.

The complete fixture directory reports **6 passed, 1 failed**. The one failure is the pre-existing, intentionally documented `mulligan-one-ice-three-economy.txt` case; it is unrelated to this fix.

The code-level behavior and reconstructed decision are verified. A real graphical-game replay remains useful follow-up coverage, particularly to observe non-zero `debt:` values in live ranking logs now that the previously skipped aging path runs.

---

## Appendix A: reconstructed fixture (`corp-protects-hq-not-archives.txt`)

This is the log's final dump with the end-of-turn changes reversed (Semak-samun back in HQ instead of Archives, Hedge Fund and Anthill back in HQ). The implemented clean and stale-allocation variants are saved under `tests/fixtures/corp-decisions/`.

```
// PHASE: Phase_Main
// OPTIONS: gain, draw, install, play, advance, n
// EXPECT: install
// EXPECT_SERVER: HQ
// SETUP: corp.creditPool=5; corp.clickTracker=3; runner.creditPool=4
// NOTE: HQ (1 rezzed Tithe, no ETR) with 3 agendas in hand; Runner has run it 4 times. Expect ICE onto HQ, never Archives.
// NOTE: for the stale-allocation variant add to SETUP: ;reviewAI._protectionInstallsThisTurn=[corp.HQ,corp.RnD,null,corp.remoteServers[0]]
RunnerTestField(30001, [30030,30020,35026,30003,35010,30034], [35029,30007,35008,35007,30009,30020,30013,35007,30034,30007,35004,30004,35011,30027,30030,30009,30008,30027,35010,35004,35010,30007,30030,30005,35009,35004,35007,35009,30004], [35011], [30022,30003,30008,35009], [35049], cardBackTexturesRunner,glowTextures,strengthTextures);
CorpTestField(35046, [30048,35050,30040,30071,30040], [35072,30040,35051,35049,30071,30075,30053,35051,35072,35052,30067,35050,35053,35050,35051,30048,30075,35052,30048,35054,30050,35049,35052,35048,30067,35079,30047,30067,30050], [30044,35072,30075,35048,35054,30053,30047,35048], [], [30073], [30073], [[30053,30046,30073,35054]], [], cardBackTexturesCorp,glowTextures,strengthTextures);
corp.HQ.ice[0].rezzed=true;
corp.remoteServers[0].ice[0].rezzed=true;
corp.remoteServers[0].ice[1].rezzed=true;
corp.remoteServers[0].AISuccessfulRuns=1;
corp.HQ.AISuccessfulRuns=4;
runner.rig.programs[0].virus=3;
```

Card IDs: 30044 Longevity Serum, 35072 Anthill Excavation Contract, 30075 Hedge Fund, 35048 Proprionegation (x2 in hand), 35054 Semak-samun, 30053 Spin Doctor, 30047 Karunā, 30073 Tithe, 30046 Diviner, 35046 AU Co.

Assumptions in this reconstruction: HQ hand of 8 as described in section 2; only the remote's first two ICE are rezzed (as in the final dump); Spin Doctor in Remote 0 is unrezzed (as in the final dump); Archives holds the 5 cards left after removing Hedge Fund and Anthill.

## Appendix B: harness notes from diagnosis

These were the missing stubs identified during diagnosis. The needed equivalents, including deterministic `Shuffle`, are now present in `corp-decision-fixtures.test.js`; `FullCheckPlay` was not needed to verify the selected install command and target.

```js
context.PlayerHand = (p) => (p === corp ? corp.HQ.cards : runner.grip);
context.MaxHandSize = (p) => 5;
context.Link = () => 0;
context.Shuffle = (a) => a;
context.AllCards = () => [];
// still needed to get past the install decision to the economy branch (was missing when I stopped):
// context.FullCheckPlay = ...
```

To print the chosen install target from the runner, after `ai[phase](options.slice())`:

```js
if (ai.preferred)
  console.log(
    "preferred",
    ai.preferred.command,
    ai.preferred.cardToInstall && ai.preferred.cardToInstall.title,
    ai.preferred.serverToInstallTo === null
      ? "NEW"
      : ai.preferred.serverToInstallTo &&
          ai.preferred.serverToInstallTo.serverName,
  );
```

## Appendix C: prototype patch (Fix 2 and Fix 3 Option A only)

Tested against the Appendix A reconstruction (scenarios 4 and 5) and `tests/corp-server-security.test.js` (73 passed before and after). This is a sketch for the agent to adapt, not final code. Fix 1 is not in the diff.

```diff
--- a/ai_corp.js
+++ b/ai_corp.js
@@ _serverToProtect
     var unallocatedInsecure = ranked.filter(
       (entry) =>
         !entry.isSecure &&
-        !this._protectionInstallsThisTurn.includes(entry.server),
+        !this._protectionInstallsThisTurn.includes(entry.server) &&
+        !this._nothingWorthProtecting(entry.server),
     );
@@ (new helper, next to _bestProtectedRemote)
+  _nothingWorthProtecting(server) {
+    //Archives with no agenda in it and no route into HQ is not worth an ICE install
+    if (server !== corp.archives) return false;
+    if (this._archivesIsBackdoorToHQ()) return false;
+    for (var i = 0; i < corp.archives.cards.length; i++)
+      if (CheckCardType(corp.archives.cards[i], ["agenda"])) return false;
+    return true;
+  }
@@ (new helper, next to _rankedInstallOptions)
+  _serverHasStakes(server) {
+    //something the Runner would gain from breaching this server
+    if (server == corp.HQ) return this._agendasInHand() > 0;
+    if (typeof server.cards !== "undefined") return false; //other centrals: keep old behaviour
+    for (var i = 0; i < server.root.length; i++)
+      if (CheckCardType(server.root[i], ["agenda", "asset"])) return true;
+    return false;
+  }
@@ _rankedInstallOptions, the "too poor" gate
     //too poor? don't spend frivolously on new layers
+    //a breachable server with something to lose is never 'frivolous' to reinforce
+    var serverAtRisk =
+      serverToInstallTo != null &&
+      !this._evaluateServerSecurity(serverToInstallTo).isSecure &&
+      this._serverHasStakes(serverToInstallTo);
     if (
       !iceInstallEconomyCheck &&
-      this._rezzedIce(serverToInstallTo).length > 0
+      this._rezzedIce(serverToInstallTo).length > 0 &&
+      !serverAtRisk
     )
       iceInstallSituationCheck = false;
```

Note: `ai_corp.js` uses CRLF line endings. Preserve them when editing.

## 11. Remediation

During live testing it was noticed that the corp now never protects archives even after several redirection events that accessed HQ through archives, many runs to archives just to gain creds through "successful run" text on events or to get virus counters on cards like `Leech`. See `documentation/bugs/action-needed/chiriboga-log-2026-09-21T12_47_27.790Z.txt`

So it's not just "no agenda in archives, no need to protect". It's more complicated than that.

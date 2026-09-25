# Corp AI: Review Findings (not yet in either roadmap)

Source: read-through of `ai_corp.js` at commit `80b94dd` (line numbers drift as the file changes). Findings come from reading the code, not from running the game or the tests.

Each item ends with **Belongs in:** the roadmap or doc where it fits best.

---

## A. Security evaluator

### 1. Global end-the-run treated as a permanent lockout
- **Where:** `_hasGlobalETR()` (~1566), used by `_evaluateServerSecurity()` (~2386).
- **Problem:** Any scored agenda with 1 or more agenda counters and an "end the run" ability sets `hasHardLockout` for every server.
  - Each counter ends only one run, so a Runner with several clicks just makes another run. It is a run tax, not a lockout.
  - _Nisei MK II_'s own Corp code (`sets/systemupdate2021.js`) offers the ability only on the final approach and only if `_runnerMayWinIfServerBreached()` is true. The evaluator credits it with securing servers where the card is written never to fire.
- **Fix:** Add a hook such as `AIGlobalETRUses(server) -> number` (uses the Corp will actually spend against a run on that server).
  - The card's `Enumerate` and the evaluator both read it, so they cannot disagree.
  - Compare capacity with the Runner's projected click allotment (currently computed inside `_effectiveRunnerCreditPool()`; extract it as a helper). Hard lockout only if capacity >= projected runs.
  - Otherwise add `capacity x route mandatory cost` to `totalMandatoryBreakCost`.
- **Tests:**
  - One counter and 4 projected clicks: no lockout, plus one extra route cost.
  - Counters >= projected runs: lockout.
  - A server where a breach cannot win gets no credit under Nisei-style policy.
  - Hidden Grip changes nothing.
- **Belongs in:** Security roadmap, new `#### Layer 2.1 ... [FOLLOW-UP]`, placed before `### Layer 3`.
- **Also fix Layer 2's text:** it names "_Ash 2X3301_", but the real title is _Ash 2X3ZB9CY_. Ash and Caprice Nisei exist only in `carddata/carddata.json` and have no implementation in `sets/`. The only `AIPreventBreach` declarations are on Runner cards (_Bank Job_, _Chastushka_, _Security Testing_), and `_hasDefensiveUpgrade()` reads only `server.root` and `ActiveCards(corp)`. So the defensive-upgrade path is untested by any real Corp card. Both cards are trace/psi based, so a deterministic boolean would overstate them.

### 2. Unrezzed ICE budgeted independently
- **Where:** `_evaluateServerSecurity()` (~2402).
- **Problem:** Each unrezzed ICE is checked against the Corp's full credits on its own. Two 4c ICE with 5 credits both count as active security, but only one can be rezzed. The result overstates security and can mark a server secure when it is not.
- **Fix:** Walk the route in encounter order (highest `server.ice` index first) with a running budget. Rezzed ICE cost nothing. An unrezzed ICE counts only if it fits the remaining budget. Use a local counter and no state mutation. Log skipped ICE in `reasons`.
  - This matches what `Phase_Approaching()` can actually do.
  - Every caller inherits the fix: protection scores, `_iceWorthRezzing()` and critical defense.
- **Tests:**
  - 2x4c ICE with 5 credits: only the outer ICE counts.
  - Same ICE with 8 credits: both count.
  - Rezzed ICE consumes no budget.
  - Live credits, `rezzed` flags and `server.ice` are unchanged after evaluation.
- **Belongs in:** Security roadmap, new `#### Layer 1.1 ... [FOLLOW-UP]`, placed before `### Layer 2`. Add a one-line cross-reference to Install Phase 2, scenario 4 ("consume the evaluator fix, do not reimplement it").

---

## B. Decision quality

### 3. Purge is a random roll
- **Where:** `Phase_Main` (~5238).
- **Problem:** Rolls `RandomRange(2, 10)` per Runner card against its virus counters, with a `Clot` title check. It ignores whether the counters matter and spends all three clicks on a coin flip. The tactical purge in `_criticalBreachDefenseAction()` (~4950) is already evidence-based, but only for central pressure.
- **Fix:** Add `_purgeValue()`.
  - Use a guarded hypothetical that zeroes the virus counters on installed Runner cards and restores them exactly (see item 11).
  - Compare `_evaluateServerSecurity()` before and after, plus `_centralBreachLossRisk(server, { afterPurge: true })`.
  - Weight by server value. Purge only above a threshold. Drop the RNG and the `Clot` check.
  - Virus counters currently matter through `_virusCountersReduceStrength()`, hosted virus breakers, and `AICentralPressureAfterPurge`.
- **Tests:**
  - Counters that make a route breakable: purge chosen.
  - Counters the evaluator does not model: no purge, whatever the count.
  - Same state gives the same decision with `Math.random` stubbed.
  - Counters are restored even if the evaluator throws.
- **Belongs in:** Security roadmap, new `#### Layer 7.3 ... [FOLLOW-UP]`, after 7.2. Add a Phase 7 note in the install roadmap: purge and tag-trash sit above install in the `Phase_Main` ladder, so they must be part of the install-vs-other-actions comparison.

### 4. Mulligan is aggressive and redundant
- **Where:** `Phase_Mulligan` (~3533).
- **Problem:**
  - It mulligans unless the hand has at least 2 affordable ICE and no more than 2 agendas. With 15 ICE in 45 cards, about 45% of opening hands have fewer than 2 ICE, and the affordability filter makes it more.
  - Economy cards are ignored.
  - Condition 2 and the later `< 2` check are already covered by Condition 3.
  - It never compares the hand with the alternative, a fresh five.
- **Fix:** Score the hand (ICE by cost, economy, agenda count) and compare it with the expected value of a fresh hand computed from the Corp's own deck composition. Calibrate with the harness (item 12).
- **Belongs in:** Install roadmap, new `### Phase 10: Opening-Hand Evaluation and Mulligan [PROPOSED]`, after Phase 9.

### 5. Over-advance hold has no win exemption
- **Where:** `Phase_Score` (~4176).
- **Problem:** For `AIOverAdvance` cards it returns "don't score yet" until `AIAdvancementLimit`, even when scoring wins the game.
- **Fix:** If `AgendaPoints(corp) + card points >= AgendaPointsToWin()`, always score.
- **Belongs in:** `documentation/backlog/bugs.md`.

---

## C. Small bugs and contract mismatches

### 6. Typo: ICE over-advance check never fires
- **Where:** `Phase_Main` ~5452, `installedCards[i].advancement.AIOverAdvance`.
- **Problem:** `advancement` is a number, so this is always `undefined`. It is latent: no ICE currently sets `AIOverAdvance`.
- **Fix:** `installedCards[i].AIOverAdvance`.
- **Belongs in:** `bugs.md`.

### 7. `AIOverAdvance` is boolean in the docs but a function on two cards
- **Where:** `documentation/ai.md` (~1528) says boolean. _Project Ingatan_ and _Sericulture Expansion_ (`sets/elevation.js`) define it as a function returning 2.
- **Problem:** `ai_corp.js` and `phase.js` only test truthiness, so the "2" is ignored. Neither card declares `AIAdvancementLimit`, so I don't see anything capping their advancement. The other 7 cards using the hook are boolean and pair it with `AIAdvancementLimit`.
- **Fix:** Either honour the numeric value in `_advancementLimit()` or change the cards to boolean plus `AIAdvancementLimit`. Update `ai.md` to match.
- **Belongs in:** `bugs.md`.

### 8. Reserved credits: title tables, and central roots skipped
- **Where:** `_sufficientEconomy()` (~3211) and `_iceWorthRezzing()` (~3713).
- **Problem:**
  - `rootUseCosts` is a 13-title table. Non-zero costs: _Aggressive Secretary_ 2, _Project Junebug_ 1, _Snare!_ 4, _Manegarm Skunkworks_ 2, _Hokusai Grid_ 2, _SanSan City Grid_ 6, _Crisium Grid_ 3.
  - Its loop walks only `corp.remoteServers[i].root`, so central-server upgrades such as _Hokusai Grid_ and _Crisium Grid_ never reserve credits.
  - `_iceWorthRezzing()` hardcodes _Snare!_ = 4 again in `costyAmbushes`, and that one does inspect `server.cards`.
- **Fix, bug half:** Walk central roots too. This goes in `bugs.md`.
- **Fix, design half:** Add `AIReserveCredits(server) -> number`, sitting beside `AIPunishesAccess`. Both consumers read it, and the tables go away.
- **Belongs in:** `bugs.md` (bug half). Install roadmap, new `#### Phase 5.1: Declarative Reserved-Credit Hook [PROPOSED]` before Phase 6 (design half). Document the hook in `ai.md` when it ships.

### 9. Randomness bypasses the injectable `_random`
- **Where:** `Shuffle(assetDestinations)` (~3389) and the purge `RandomRange` (~5250).
- **Problem:**
  - Both use global `Math.random`, so seeded runs are not reproducible.
  - `Shuffle` mutates in place. `assetDestinations` can be the same array as `emptyProtectedRemotes`, which is documented as strongest-first. Only its length is used afterwards, so this is latent.
  - `_rankedInstallOptions()` runs several times per click, and each run reshuffles.
- **Fix:** Use `this._random`. Shuffle a copy. Roll the asset-destination tie-break once per decision.
- **Belongs in:** `bugs.md` (in-place mutation). Foundations doc F1 (RNG).

### 10. Unguarded hypothetical in `Phase_Main`
- **Where:** ~5512.
- **Problem:** `corp.creditPool += this._clicksLeft() - 1` is rolled back manually, not in try/finally. `_icePreventsGameWinningBreach()` and `_criticalBreachDefenseAction()` do it correctly. `_iceInstallScore()` (~121, currently unused) mutates without a guard too.
- **Problem, second part:** `rankedInstallOptions < this._rankedInstallOptions(...)` compares arrays with `<`. It works only because plain objects stringify to "[object Object]".
- **Fix:** Compare `.length`. Route all hypotheticals through one guarded helper (item 11).
- **Belongs in:** `bugs.md` (the `<` comparison). Foundations doc F2 (guarded helper).

---

## D. Infrastructure

### 11. Evaluate once per decision
- **Problem (from reading, not profiled):** `_evaluateServerSecurity()` is called repeatedly for the same board.
  - `_rankedServersToProtect()` runs `_protectionScore()`, which runs the evaluator, then runs it again per server.
  - `Phase_Main` calls `_serverToProtect(false, true)` on entry (~5091) just for debug logging.
  - `_rankedInstallOptions()` calls `_serverToProtect()` up to 3 more times, and can itself run 2-3 times per click.
- **Fix:**
  - Add a per-decision cache keyed to the state and cleared on `Choice()` entry or state change. Bypass it during hypotheticals.
  - Gate the debug call behind a debug flag.
  - Add one guarded `_withHypothetical()` helper. Precedents already exist: `AIIceEncounterSaveState` / `AIIceEncounterRestoreState`, and `AIPrepareHypotheticalForRC` / `AIRestoreHypotheticalFromRC`.
- **Tests:** Decisions are identical with the cache on and off. Evaluator call counts per `Phase_Main` drop.
- **Belongs in:** Foundations doc F2 (helper) and F3 (cache). It pairs with roadmap Layer 8.4 posture epochs and the Phase 9 latency metric.

### 12. No seeded AI-vs-AI batch harness
- **Problem:** Every acceptance gate says "seeded simulations", but I found no runner for them.
  - `decks.js` (~780) has a fast AI-vs-AI debug mode.
  - `tests/corp-server-security.test.js` stubs the engine in `vm`.
  - `gauntlet.php` seeds the solo campaign only.
  - `deck/seedrandom.min.js` exists, and `CorpAI.GameEnded(winner)` is an empty stub that is a natural collection hook.
  - I may have missed a runner.
- **Fix:** Build a headless or browser-driven runner that:
  - seeds with `Math.seedrandom(seed)`;
  - uses fixed deck pairs;
  - logs points scored and stolen, wins and per-decision latency;
  - stores a baseline before Install Phase 1.
- **Belongs in:** Foundations doc F4. Install Phase 0 should reuse it rather than build its own.

### 13. Card-title lists still in `Phase_Main` and the economy helpers
- **Problem:** Both roadmaps say "prefer hooks over titles", but about 25 title comparisons and 14 `_copyOfCardExistsIn("...")` calls remain.
  - The lists cover economy and draw cards, rez timing, kill combos, and fast-advance.
  - New-set cards do nothing there unless someone edits `ai_corp.js`.
- **Inventory (line numbers approximate):**

| Function | Titles | Suggested replacement |
|---|---|---|
| `_economyCards` (~2909) | Celebrity Gift, Subliminal Messaging, Government Subsidy, Hedge Fund, Hansei Review, Marilyn Campaign, Regolith Mining License, Nico Campaign, PAD Campaign, Predictive Planogram | New `AIEconomyCard`, already mentioned in a code comment and in `documentation/backlog/deckbuilder-economy-draw-classification-backlog.md` |
| `_bestMainPhaseEconomyOption` (~2945, ~3092) | Oaktown Renovation; Spin Doctor, Sprint, Daily Business Show, Predictive Planogram (draw list) | New draw-card hook alongside `AIEmergencyDraw` |
| `_sufficientEconomy` (~3211) | 13-title reserve table | `AIReserveCredits` (item 8) |
| `_iceWorthRezzing` (~3713) | Snare! | `AIReserveCredits` (item 8) |
| `_potentialDamageOnBreach` (~857) | Jinteki: Personal Evolution, Urtica Cipher, House of Knives, Snare!, Hokusai Grid | New `AIAccessDamage(server)`, separate from `AIPunishesAccess`, which is documented as a planning weight and not expected damage |
| `Phase_Movement` / `Phase_EOT` (~3991-4047) | Spin Doctor; EOT rez list: Marilyn Campaign, Nico Campaign, PAD Campaign, Clearinghouse, Daily Business Show, Corporate Town | New `AIRezTiming` ("eot", "postAction", "ifDuplicate"), beside `AIWouldRezBeforeScore` |
| `Phase_PostAction` (~4078) | SanSan City Grid, Regolith Mining License, Ronin, Reversed Accounts | `AIRezTiming` |
| `_potentialOperationDamageDirections` / `ThisTurn` (~4284-4410) | Neurospike, Punitive Counterstrike, Biotic Labor, Archived Memories | Extend `AIDamageOperation` |
| `_potentialAdvancementDirections` (~4528-4648) | Weyland: Built to Last, Oaktown Renovation, Seamless Launch, Psychographics, Trick of Light, Biotic Labor | Extend `AIFastAdvance` |
| `_useWhenTaggedCard` (~5050) | Retribution, Predictive Planogram | Existing `AITagPunishment` for Retribution; a hook for Planogram |
| `Phase_Main` (~5198-5399) | Punitive Counterstrike, Neurospike, Public Trail, Archived Memories; Clot (item 3); Orbital Superiority, Haas-Bioroid: Precision Design, Offworld Office, Hostile Takeover, Biotic Labor | `AIWouldPlay` / `AIFastAdvance`, and item 3 for Clot |
| `_advancementLimit` (~638) | SanSan City Grid | Check whether the engine's `AdvancementRequirement(card)` already includes the modifier. If so, delete the case instead of migrating it. |
| `_cardProtectionValue` (~1380) | Ice Wall | Declarative value hook |
| `_emptyProtectedRemotes` (~2732) | Trick of Light | Hook on the operation |
| `_iceIsDisabled` (~16) | Femme Fatale | Runner-card hook |
| `_iceInstallScore` (~134) | Palisade | Delete with Install Phase 2. The function is unused. |
| `_iceWorthRezzing` (~3865) | Inside Job | Runner-event hook |
| `_iceWorthRezzing` (~3891-3899) | Cell Portal, Chum | Inside a commented-out block, so delete or migrate |
| `_iceInstallOptions` (~3501) and `_bestNonAgendaTutorOption` (~815) | Snare! | `AIPunishesAccess` / `AIReserveCredits` |

- **Belongs in:** Install roadmap, new `## Appendix A: Legacy Title Special Cases`, appended at end of file. Tick rows off as each phase migrates them.

---

## Suggested foundations doc

Items 9, 10, 11 and 12 depend on shared infrastructure that neither roadmap should own. Put them in one short new file, `documentation/corp-ai/roadmaps/corp_ai_foundations_roadmap.md`:
- F1: injectable, seedable randomness (item 9)
- F2: one guarded `_withHypothetical()` helper (items 10, 11)
- F3: per-decision evaluation cache (item 11)
- F4: seeded AI-vs-AI batch harness (item 12)

Then add a one-line pointer to it in each roadmap: security roadmap "Regression Validation and Current Limits", install roadmap "Status" and Phase 0.

## Two doc corrections

1. The install roadmap's Status paragraph points to `documentation/corp_ai_improvement_roadmap.md`. The file is at `documentation/corp-ai/roadmaps/corp_ai_improvement_roadmap.md`.
2. Security roadmap Layer 2 uses the wrong Ash title and implies a working defensive-upgrade path. See the end of item 1.

## Suggested order

1. Harness (12).
2. Quick fixes (5, 6, 7, 8 bug half, 10).
3. Evaluator fixes (1, 2), because they feed everything else.
4. Install Phase 2.
5. Then 3, 4, 11 and 13.

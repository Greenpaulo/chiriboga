# Corp AI: never installs ICE on Archives all game, even with Baker's redirect-to-HQ backdoor active and an agenda floating in Archives

**Suggested location:** `documentation/bugs/` (move to `documentation/bugs/done/` once merged).
**Source log:** `documentation/debug-logs/corp_not_protecting_archives_when_i_have_baker_to_redirect_to_hq.txt`
**File:** `ai_corp.js` (line numbers are from `main` at `512a8f3`, 2026-09-24, and will drift; search by function name). One confirming reference in `utility.js`.
**Status:** Diagnosed, not yet fixed.

---

## 1. Summary

Across the whole game in the log, the Corp installs exactly two pieces of ICE (one on R&D, one on HQ, both on its first turn) plus two non-ICE assets in a remote's root. **Archives is never iced once**, and it is run down three separate times for real cards (`Phật Gioan Baotixita`, `Urtica Cipher`, `Mycoweb` all get accessed there across the log). Two of those runs go through the Runner's Baker (which can turn "run Archives" into "run HQ" for 1 stealth credit) and one goes in unredirected via Red Team, straight into an empty Archives.

The AI does have code that specifically reacts to Baker: `_archivesIsBackdoorToHQ()` (line 287) detects it and, once true, makes `_protectionScore()` treat Archives with the same agenda-aware urgency formula as HQ (lines 2882-2907) instead of the ordinary +3 "don't bother" deprioritisation it gives Archives otherwise (lines 2876-2880). So the filename's hypothesis — "the AI should know Baker makes Archives dangerous" — is correct as far as the scoring formula goes.

The reason Archives (and, in this log, R&D too) never actually gets protected is downstream of that scoring, in `_shouldInstallIceLayer()`. It exempts a server from the Corp's "too poor to add another ICE layer" reserve gate only when `_serverHasStakes(server)` returns true — and `_serverHasStakes()` (lines 3700-3707) has a bug that makes it return `false` for R&D and Archives unconditionally, regardless of what is at risk in them:

```js
_serverHasStakes(server) {
  if (server == corp.HQ) return this._agendasInHand() > 0;
  //R&D and Archives retain the existing economy behaviour here.
  if (server == null || typeof server.cards !== "undefined") return false;
  for (var i = 0; i < server.root.length; i++)
    if (this._isHVT(server.root[i])) return true;
  return false;
}
```

`typeof server.cards !== "undefined"` is meant to read as "this is a remote, so check its root for an HVT" — but `NewServer()` (`utility.js:1103-1113`) only omits `.cards` for **remote** servers; it sets `newServer.cards = []` for every central server, HQ included. So for R&D and Archives the check is backwards: it returns `false` immediately, before the HVT-root loop it was guarding ever runs. The comment ("R&D and Archives retain the existing economy behaviour here") describes intent that the code doesn't deliver — there is no meaningful "existing economy behaviour" left for either central server, just an early `false`. HQ is the only server that can ever be `serverAtRisk`.

The consequence, confirmed against this log's numbers: whenever the Corp's economy sits under the reserve threshold used by `_shouldInstallIceLayer()` — which is most of the game, per the repeated `AI: I am feeling poor` / `No obvious install options` lines — Archives and R&D are both permanently ineligible for a defensive ICE layer, no matter how their `_protectionScore()` ranks them or how much `_serverProtectionDebt` they accumulate. Baker's backdoor correctly makes the *score* say Archives matters; it never reaches the gate that decides whether the Corp is actually allowed to act on that score.

---

## 2. What happened in the log

Corp hand across the game included three ICE the AI never installed on Archives or R&D: Diviner, Empiricist, Mycoweb (all affordable ICE — cost 2-5 — confirmed against `carddata/carddata.json`, `type_code: "ice"`). Baker was installed by the Runner at line 74, after which `_archivesIsBackdoorToHQ()` is true for the rest of the game.

| Turn (approx. line) | `Ranked server protection` (adjusted scores) | What Corp did |
|---|---|---|
| 23 (before Baker) | R&D 0, HQ 1.5, **archives 3** | Installed ICE on R&D |
| 30 (before Baker) | HQ -7, **archives 3**, R&D 3.01 | Installed ICE on HQ |
| 267-301 (after Baker) | HQ -3.66 (secure), **R&D 0.4-1.43**, **archives 1-3**, Remote 0 secure | `No obvious install options` / `I am feeling poor`, twice |
| 352-378 | HQ -3.46 (secure), **R&D -0.27**, **archives 0-2**, null 1 | `No obvious install options` / `I am feeling poor`, three times; one root-asset install |
| 429-470 | HQ -3.47 (secure), **R&D -1.29 (debt 4-5)**, **archives -1 (debt 2-3)**, Remote 0 secure | `No obvious install options` / `I am feeling poor`; one root-asset install; one 1-point advance |

Meanwhile the Runner accessed Archives three times unopposed:

```
Using Baker: ... Attacked server changed to HQ ... Run successful ... Mycoweb accessed
Using Red Team: Run initiated attacking Archives ... Run successful ... Phật Gioan Baotixita accessed / Urtica Cipher accessed
Using Red Team: Run initiated attacking Archives ... Run successful ... Urtica Cipher accessed / Phật Gioan Baotixita accessed
```

(The Baker-redirected run actually lands on HQ, which is consistent with what Baker does — it is the two direct, non-Baker Archives runs via Red Team that show the server sitting open. The Corp never rezzed anything there because it never installed anything there.)

By the last recorded turn (line 429 onward), both R&D and Archives are carrying real `_serverProtectionDebt` (up to 5 and 3 respectively) from being ranked insecure and un-allocated turn after turn — so the debt-aging mechanism is working — but debt only changes *ranking*, not *eligibility*. `_shouldInstallIceLayer()` still vetoes both servers every time the Corp's cheap-and-cheerful `_sufficientEconomy(false, 4)` check comes back false, which it does on nearly every click in this log.

---

## 3. Root causes

### 3.1 `_serverHasStakes()` returns `false` for R&D and Archives unconditionally (the actionable bug)

**Where:** `_serverHasStakes()`, lines 3700-3707. Confirmed against `NewServer()` in `utility.js:1103-1113`, which sets `.cards = []` for every central server (`isCentral` is true for HQ, R&D and Archives — see the three `NewServer(...)` calls in `init.js`), not just remotes. `ServerName()` (`utility.js:1124-1135`) uses the same `typeof server.cards == "undefined"` idiom explicitly to mean "this is a remote," which is the correct reading `_serverHasStakes()` inverted.

Effect: the `server == null || typeof server.cards !== "undefined"` branch is `true` for R&D and Archives (both have `.cards`), so the function returns `false` before it can ever reach the HVT-root loop below it. That loop — checking `server.root` for an installed HVT — is only reachable for remotes, which is presumably not what was intended, since remotes already have other install-priority paths (`_isHVT()` checks in `_rankedInstallOptions()`) and central servers are exactly the case a "does this server have something worth defending" check ought to cover.

### 3.2 `_shouldInstallIceLayer()` has no other way to reinforce a central server that already has one rezzed ICE

**Where:** `_shouldInstallIceLayer()`, lines 3709-3727.

```js
_shouldInstallIceLayer(server, economyIsSufficient) {
  var shouldInstall = this._unrezzedIce(server).length == 0;
  var serverAtRisk =
    server != null &&
    !this._evaluateServerSecurity(server).isSecure &&
    this._serverHasStakes(server);
  if (
    !economyIsSufficient &&
    this._rezzedIce(server).length > 0 &&
    !serverAtRisk
  ) {
    shouldInstall = false;
  }
  return shouldInstall || economyIsSufficient || serverAtRisk;
}
```

Because `serverAtRisk` can never be `true` for R&D or Archives (§3.1), the only way either server gets a second (or, for Archives all game, first-ever) layer while the Corp is "poor" is `economyIsSufficient` being true — and per the `Ranked server protection` lines and repeated `I am feeling poor`, that was false on nearly every click after the opening turn. HQ does not have this problem, because `_serverHasStakes(corp.HQ)` has its own, correctly-implemented branch (`this._agendasInHand() > 0`) that never falls into the buggy `.cards` check.

This is the same reserve gate documented as "Problem C" in `documentation/bugs/done/pointless-archives-ice-install.md` and fixed there for HQ specifically, via this same `serverAtRisk` exemption. That fix only ever helps HQ, because `_serverHasStakes()` was never given a working path for R&D or Archives. This log shows the gap it left behind: once Baker makes Archives dangerous, and R&D already has an agenda plus a lone rezzed ICE, neither server can use the exemption that was built for exactly this situation.

### 3.3 `_archivesIsBackdoorToHQ()` correctly detects Baker, but its effect is confined to `_protectionScore()`

**Where:** `_archivesIsBackdoorToHQ()`, lines 287-305; consumed in `_protectionScore()`, lines 2830, 2861, 2867-2873, 2877, 2882-2884, 2912-2917, and in `_nothingWorthProtecting()`, line 3108.

This part of the AI is working as intended: once Baker is on the board, Archives stops getting the ordinary +3 "don't bother" deprioritisation and instead inherits HQ's agenda-aware, R&D-relative urgency formula, and `_nothingWorthProtecting()` refuses to write Archives off as valueless. That correctly explains why Archives shows a competitive, sometimes quite low (urgent) adjusted score in the log after Baker is installed (e.g. archives -1 at line 429, only marginally behind R&D's -1.29). The gap is that nothing downstream of that score change (§3.1, §3.2) is able to act on it under the "poor" economy the Corp was in for most of this game.

### 3.4 `_serverToProtect()`'s rotation guard was not the deciding factor here, but is worth a second look

**Where:** `_serverToProtect()`, lines 3057-3102, specifically the override at lines 3078-3082:

```js
if (selected && selected.server == corp.archives) {
  var naturalInsecure = eligibleRanked.find((entry) => !entry.isSecure);
  if (naturalInsecure && naturalInsecure.server != corp.archives)
    selected = naturalInsecure;
}
```

In every `Ranked server protection` line in this log, Archives never actually has the single lowest adjusted score (R&D, a fresh remote, or `null` always undercuts it), so `selected.server == corp.archives` never becomes true and this guard never fires in this particular game. It is not what stopped Archives from being iced here — §3.1/§3.2 are. It is included because it is the other place `_archivesIsBackdoorToHQ()`-aware behaviour could plausibly break in a game where Archives *does* naturally win the comparison: the guard does not special-case the backdoor, so a genuinely-most-urgent backdoored Archives can still be demoted in favour of any other merely-insecure server. Worth a fixture once §3.1/§3.2 are fixed, to confirm it doesn't become the next bottleneck.

---

## 4. Proposed fixes

1. **Fix `_serverHasStakes()` for R&D and Archives.** The `.cards`-based remote check is backwards for this use; it should distinguish "is this a remote" the same way `ServerName()` does, and then give R&D and Archives their own real stakes definitions instead of falling through the remote-only HVT loop:
   - Archives: an agenda in `corp.archives.cards`, or `_archivesIsBackdoorToHQ()` being true (Baker et al. make any card there — not just agendas — a real stake), or the same recent-run-pressure signal `_nothingWorthProtecting()` already computes via `_serverRunPressure()`.
   - R&D: at minimum, whether an agenda is known/likely to be near the top (existing agenda-tracking helpers may already estimate this elsewhere in the file — reuse rather than re-derive) or, conservatively, whether R&D is currently the Corp's best-defended central server per the same "weaker than the alternative" comparison already used for HQ at lines 2889-2906.
   - Keep the remote-only HVT-root loop, but only reach it when the server is actually a remote.
2. **Re-verify `_serverToProtect()`'s rotation guard (§3.4) against a backdoored Archives that does win the natural comparison**, once (1) makes that reachable in practice. It may need an explicit `archivesIsBackdoorToHQ` exemption analogous to the one already threaded through `_protectionScore()`.
3. Do **not** change `_archivesIsBackdoorToHQ()` or the `_protectionScore()` formula — both already behave as this report's filename expects; the bug is entirely downstream in eligibility, not in scoring.

---

## 5. Tests

Follow `tests/fixtures/README.md` and `tests/corp-decision-fixtures.test.js`.

1. **Fixture from this log.** The log's final `RunnerTestField(...)`/`CorpTestField(...)` dump (last ~20 lines of the source file) plus the property-setter lines is a state snapshot after the last recorded action, not before click 1 — rebuild the pre-click-1 state the way `pointless-archives-ice-install.md` §3 and `hq-ice-install-blocked-by-economy-reserve.md` §3 did, using Baker present, one agenda in R&D, `corp.RnD.ice[0].rezzed=true`, low Corp credits, and at least one affordable ICE (e.g. Diviner) in `corp.HQ.cards`. Expect `install` targeting R&D or Archives, not `gain`/`draw`.
2. **Unit-level coverage for `_serverHasStakes()`:** call it directly (or via the smallest reachable AI entry point) for R&D holding an agenda, R&D holding nothing, Archives with Baker active and empty, Archives with Baker active and an agenda in it, and Archives with no backdoor and nothing valuable in it — confirming only the last returns `false`.
3. **Regression for `_shouldInstallIceLayer()`:** a poor-economy Corp with one rezzed ICE and no other unrezzed ICE anywhere, targeting R&D with an agenda in hand, should now select `install` rather than falling through to `gain`/`draw`.
4. Re-run the existing `corp-no-agenda-behind-conditional-etr-ice`-style fixtures and the fixtures from `pointless-archives-ice-install.md` / `hq-ice-install-blocked-by-economy-reserve.md` to confirm HQ's existing exemption is untouched.
5. `node -c ai_corp.js` and `node tests/run-all-tests.js` (or `corp-decision-fixtures.test.js` + `corp-server-security.test.js` if that's the full suite name on this branch).

---

## 6. Watch-outs

- **This is a reconstruction risk, same as the two related "done" reports.** The log's final state dump is *after* the last logged action, and hand contents at each click are partly inferred from the `SPOILER:` lines rather than known with certainty. Treat any fixture built from this log the same way those reports flagged theirs — trustworthy where it reproduces the log's exact scores, approximate elsewhere.
- **Don't let the Archives fix reopen `pointless-archives-ice-install.md`.** That report's Problem B (Archives as a valueless fallback target) is still guarded by `_nothingWorthProtecting()`'s backdoor/agenda/run-pressure checks (line 3104-3115), which this report does not propose touching. Giving Archives real "stakes" in `_serverHasStakes()` only affects the economy-reserve exemption, not whether Archives is eligible to be picked at all.
- **R&D's new stakes definition needs care.** Unlike HQ, R&D's agenda content is normally hidden from the Corp's own AI-facing state in the same way it should stay hidden from the Runner; make sure whatever signal is used (recent successful runs, board-visible ICE asymmetry, etc.) doesn't require the Corp AI to peek at cards it wouldn't otherwise know are agendas.
- **The reserve threshold itself (`_sufficientEconomy(false, 4)`) is unchanged by this fix.** A Corp that is *only* thin because of an oversized global reserve (as diagnosed in `pointless-archives-ice-install.md` Problem C / Option B) will still read as poor; this report's fix only widens which servers can bypass that verdict when they're genuinely at risk, not the verdict's arithmetic.

---

## 7. Related observations (not part of this fix)

1. **`_serverProtectionDebt` is now non-zero in this log** (up to 5 on R&D, 3 on Archives) — the debt-aging fix from `pointless-archives-ice-install.md` Problem A appears to be working in this game. It doesn't help here because debt changes ranking, not eligibility (§3.2).
2. **Two direct Red Team runs on Archives access different cards than the one Baker-redirected run**, which is a useful reminder for anyone fixing this that "Baker is installed" does not mean "every Archives run gets redirected" — the Runner chooses per-run whether to spend the stealth credit, so an un-iced Archives is exploitable both with and without Baker in play.
3. The repeated `ERROR: Value above (.corpAbilities) is unsupported in ValueToString.` lines throughout the log (tied to `{text:[click], 2[c]: Trash Rotary.}`) look unrelated to this report but recur on almost every phase boundary; worth its own ticket if not already tracked.

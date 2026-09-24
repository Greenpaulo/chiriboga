# Corp AI: installs agendas into a remote server its own security evaluator has never marked secure, because the "scoring server" gate compares protection to HQ instead of checking `_evaluateServerSecurity()`

**Review location:** `documentation/bugs/code-review/`.
**Original source:** `documentation/debug-logs/bug_raised/corp_installed_agenda_in_an_unsecure_server.txt` (`Version reference: Sat Sep 19 2026 22:23:18 GMT+0100`).
**Additional verified logs:** [`corp_played_agenda_into_unsecure_server_after_agenda_was_stolen_from_that_server_last_turn.txt`](../../debug-logs/bug_raised/corp_played_agenda_into_unsecure_server_after_agenda_was_stolen_from_that_server_last_turn.txt) and [`same_again_install_agenda_into_insecure_server.txt`](../../debug-logs/bug_raised/same_again_install_agenda_into_insecure_server.txt). The latter is an extended continuation/replay of the former rather than an independent game; both show the same insecure Kessleroid remote being admitted because HQ's heuristic score was lower.
**File:** `ai_corp.js` (line numbers are from `main` as of this writing and will drift; search by function name).
**Status:** Fixed on `23Sept-fixes`, awaiting code review. `_isAScoringServer()` now requires `_evaluateServerSecurity(server).isSecure` before any installed-HVT shortcut or relative protection comparison. The already-computed result is passed into `_protectionScore()` to avoid immediately evaluating the candidate twice.

---

## 1. Summary

Over the course of this game the Corp AI installed two different agendas into the same remote server (Remote 0), twice choosing it as a "scoring server" even though `_evaluateServerSecurity(Remote 0).isSecure` was `false` at every single point it was logged, from the moment the remote got its first piece of ICE until the log ends. Both agendas (Above the Law, then later Send a Message) were run and stolen the next time the Runner had a spare click and enough credits to break the remote's ICE.

The decision comes from `_isAScoringServer()` (~line 561), which gates whether an empty, ICE-protected remote is good enough to receive an agenda. Instead of asking "can the Runner get in?" via `_evaluateServerSecurity()`, it asks "is this remote's protection score at least as good as HQ's?":

```js
var minProt = this._protectionScore(corp.HQ, {
  returnArchivesLowerScoreForHQIfBackdoor: true,
}); //new method: just needs to be at least as strong as HQ
...
if (protScore < minProt) return false;
```

HQ's own protection score was mediocre-to-negative for almost the entire game (it swings from 6.0 down to -10.3 as the log goes on, because HQ never receives a second ICE layer). Since `minProt` is pinned to whatever HQ happens to be doing, a barely-defended remote easily clears the bar the moment HQ is having a bad turn — which, in this log, is most of the game. `_evaluateServerSecurity()` is never consulted, even though it is already being called (and logged) constantly elsewhere in the same decision cycle to describe the exact same remote as insecure.

**Implemented fix:** `_isAScoringServer()` now has an absolute floor—a remote cannot become a scoring server while `_evaluateServerSecurity(server).isSecure` is `false`, regardless of how it compares to HQ. The relative HQ comparison remains as a secondary tiebreaker once the absolute check passes.

---

## 2. What happened in the log

Corp: Weyland Consortium (mulliganed for 0 ICE in hand). Runner: René Loup Arcemont, with Buzzsaw and Rising Tide installed for most of the game. `Version reference` and the `HQ Danger Evaluation` log lines (e.g. line 89: `HQ Danger Evaluation - ICE: 1, Agendas: 2, Non-Agendas: 2` → `HQ_SAFE`) show this log predates the `_evaluateHQDanger()` removal in `hq-draw-gate-ignores-server-security.md`, so it is not evidence for or against that fix — it is a separate code path.

### 2.1 Remote 0's security never changes

Remote 0 is created at line 415 (first ICE) and gets a second piece of ICE at line 526. From that point on, every "Ranked server protection" snapshot marks it `secure:false`:

| Log line | Remote 0 `score` | `secure` |
|---|---|---|
| 527 | 0.40 | false |
| 534 | 1.40 | false |
| 591/597/603 | 0.60 | false |
| 852 | 0.60 | false |
| 953 | -4.40 | false |
| 984/996 | -3.40 | false |

It is never once reported secure. Remote 0's two pieces of ICE are Kessleroid and Syailendra — both of which the Runner's Rising Tide (paying 1 credit per subroutine) or advancement-triggered ability reliably breaks through for a handful of credits, as shown directly in the runs below.

### 2.2 First agenda: Above the Law

| Step | Log lines | Event |
|---|---|---|
| Corp installs 2nd ICE on Remote 0 | 526 | `Corp installed ice protecting a remote server` |
| Corp installs an agenda into Remote 0's root | 532-533 | `Corp spent one click` / `Corp installed a card in root of a remote server` — hand tracking (`Above the Law` present at 483, absent from 514 onward) identifies the card |
| Runner runs Remote 0 | 550-578 | Rising Tide breaks Kessleroid's `End the run` twice for 1 credit each; Syailendra fires for 2 credits and 1 net damage but doesn't stop the run; **`Above the Law accessed` / `Above the Law stolen`** |

The Corp advanced the agenda once (line 540) before the Runner arrived, for no benefit — it was stolen at zero extra counters.

### 2.3 Second agenda: Send a Message

Between the first theft and the second install, HQ's protection collapses further (`Ranked server protection` at line 926: `HQ: -8.26`; at 941: `-10.26`), and the AI explicitly recognizes HQ is undefended:

```
AI: Critical server has no available ICE; seeking protection for HQ
AI: Rezzing emergency draw to find ICE
Corp rezzed Spin Doctor
Corp drew 2 cards
```
(lines 933-936)

It finds no usable ICE for HQ. Two clicks later, with HQ still at -8.26 and Remote 0 at -3.40 — both firmly `secure:false` — it installs a second agenda into Remote 0's root anyway (line 980), because -3.40 clears a `minProt` bar of -8.26. The same run pattern repeats: Runner breaks Kessleroid twice with Rising Tide, and **`Send a Message accessed` / `Send a Message stolen`** (lines 1011-1035).

Both thefts follow the identical shape: an empty remote that passed the *relative* bar gets an agenda, the security evaluator has been saying `secure:false` about that exact remote for many decisions in a row, and nothing in the install-target code reads that flag.

---

## 3. Root cause

### 3.1 `_isAScoringServer()` uses a relative bar, not an absolute one

**Where:** `_isAScoringServer()`, ~lines 561-605.

```js
//no if its protection is too weak
var protScore = this._protectionScore(server, {});
var minProt = this._protectionScore(corp.HQ, {
  returnArchivesLowerScoreForHQIfBackdoor: true,
}); //new method: just needs to be at least as strong as HQ
if (this._agendasInHand() > MaxHandSize(corp) - 1) {
  //if it's going to be thrown out, it just has to be better protection than Archives
  minProt = this._protectionScore(corp.archives, {
    ignoreBackdoorFromArchives: true,
  });
}
if (protScore < minProt) return false;
```

The comment ("just needs to be at least as strong as HQ") states the intent plainly: this was designed as a relative comparison against whatever else the Corp has going on, not as a check that the Runner is actually locked out. `_evaluateServerSecurity()` — the function every other part of the AI calls to answer "can the Runner get in right now" — does not appear anywhere in this function.

### 3.2 The bar tracks HQ's health, which was poor for most of the game

Because `minProt` is HQ's own protection score, a remote only has to be as bad as HQ to qualify. In this log HQ spent most of its turns unprotected or under-protected (see the score table in §2.3), so the bar Remote 0 needed to clear kept falling — down to a threshold of roughly -8, which a remote sitting at -3 to -4 clears easily despite never being secure in absolute terms. The two servers' insecurity became mutually reinforcing: a poorly-defended HQ doesn't just leave HQ exposed, it actively lowers the standard for putting agendas somewhere else.

### 3.3 `_emptyProtectedRemotes()` has no security floor either

**Where:** `_emptyProtectedRemotes()`, ~lines 3086-3125.

```js
if (corp.remoteServers[i].ice.length > 0 && hasRoom) {
  ...
}
```

The only requirement to be considered a candidate remote at all is `ice.length > 0` — any ICE, rezzed or not, strong or trivially broken. This feeds `_isAScoringServer()`, so the pool of candidates is already unfiltered by security before the relative-to-HQ check even runs.

### 3.4 `_evaluateServerSecurity()` was being computed for the same remote the whole time

The log lines quoted in §2.1 come from the AI's own repeated protection-ranking calls in the same decision cycles that chose to install the agendas (e.g. lines 527/534 bracket the line-533 install directly; lines 953/984 bracket the line-980 install directly). The information that the install logic needed was already being computed and logged on the same turn — it just wasn't read by the code that picks where an agenda goes.

### 3.5 Where agendas enter this path

**Where:** `_rankedInstallOptions()` (or equivalent), ~lines 3758-3770.

```js
var scoringServers = this._scoringServers(emptyProtectedRemotes);
...
for (var i = 0; i < cards.length; i++) {
  if (this._isHVT(cards[i])) {
    //loop through scoring servers
    for (var j = 0; j < scoringServers.length; j++) {
      serverToInstallTo = scoringServers[j];
      intoServerOptions.push({
        cardToInstall: cards[i],
        serverToInstallTo: serverToInstallTo,
        reason: "HVT into scoring server",
      });
    }
  }
  ...
}
```

`_isHVT()` (~line 1145) returns `true` for agendas, ambushes, and hostiles. Every server in `scoringServers` (i.e. every server `_isAScoringServer()` approved) becomes a candidate destination for every agenda in hand, with no further security check at this stage either.

---

## 4. Implemented fix

### 4.1 Added an absolute security floor to `_isAScoringServer()`

Before the installed-card shortcuts and relative HQ comparison, the server must actually be secure:

```js
//no if the Runner can currently get in, however it compares to HQ
var security = this._evaluateServerSecurity(server);
if (!security.isSecure) return false;

//no if its protection is too weak relative to what else is defended
var protScore = this._protectionScore(server, {}, security);
var minProt = this._protectionScore(corp.HQ, {
  returnArchivesLowerScoreForHQIfBackdoor: true,
});
if (this._agendasInHand() > MaxHandSize(corp) - 1) {
  minProt = this._protectionScore(corp.archives, {
    ignoreBackdoorFromArchives: true,
  });
}
if (protScore < minProt) return false;
```

This preserves the existing relative comparison (still useful for choosing *among* genuinely secure remotes, and for the hand-overflow exception) but stops an insecure remote from ever being offered as a scoring destination, independent of how bad HQ looks. Applying the floor before the installed agenda/ambush/scoring-upgrade shortcuts also keeps the helper's meaning consistent for all callers.

### 4.2 Hand-overflow behavior

The existing overflow comparison against Archives remains, but it is subject to the same absolute security floor. An insecure remote is not made acceptable merely because HQ is full.

### 4.3 Behaviour change

| Remote 0 state at decision time | Old result | New result |
|---|---|---|
| `secure:false`, protection ≥ HQ's protection | scoring server: **yes** | scoring server: **no** |
| `secure:false`, protection < HQ's protection | scoring server: no | scoring server: no (unchanged) |
| `secure:true`, protection ≥ HQ's protection | scoring server: yes | scoring server: yes (unchanged) |
| `secure:true`, protection < HQ's protection | scoring server: no | scoring server: no (unchanged) |

Replaying this log with the fix: at line 533's decision, Remote 0 is `secure:false` and is excluded from `scoringServers`. With no scoring server and (per the log) no empty protected remote otherwise usable, the AI would need to fall through to another action — installing more ICE on Remote 0, holding the agenda, or (via `_serverToProtect()`) building a fresh protected remote instead. This document does not trace that fallback path in detail; it should be covered by the fixtures in §5.

---

## 5. Tests

Follow `tests/fixtures/README.md`. The fixture runner is `tests/corp-decision-fixtures.test.js`; the security-focused suite is `tests/corp-server-security.test.js`.

The reproduction block at the end of the log is the end-of-game state, well after both installs. A fixture needs the pre-decision board reconstructed from the log around lines 526-533 (or 953-980), per the README's guidance for older logs without `DecisionSnapshots`:

- `// PHASE: Phase_Main`
- `// OPTIONS:` confirm against a run at that point (probably `install, gain, draw, advance` plus `play`).
- Remote 0 with two ICE installed (Kessleroid, Syailendra for the first instance), both unrezzed, `secure:false` per `_evaluateServerSecurity`.
- HQ with weak or no ICE, so its protection score sits below Remote 0's.
- An agenda in HQ (Above the Law or Send a Message).
- `// SETUP:` matching credits/clicks from the log at that decision point.

Fixtures added under `tests/fixtures/corp-decisions/`:

| Fixture | Setup | Expected |
|---|---|---|
| `corp-no-agenda-into-insecure-remote` | Kessleroid is affordable but breachable by an installed Cleaver; the remote otherwise outranks HQ | `// EXPECT: !install`; failed before the fix by choosing `install`, now passes by choosing `draw` |
| `corp-agenda-into-secure-remote-still-ok` | same shape but no capable breaker, so Kessleroid provides a hard lockout | `// EXPECT: install`, Remote 0, Send a Message |

Note `tests/fixtures/corp-decisions/corp-layers-breachable-agenda-remote.txt` already exists and covers a related-but-different situation (installing *ICE* onto a remote that already holds an exposed agenda, from `semak-samun-held-and-send-a-message-delay.md`). It is not a duplicate of the fixtures above, which are about the *initial choice to install the agenda* into an insecure remote in the first place.

Also run: `node tests/corp-server-security.test.js`, `node tests/decision-snapshots.test.js`, and `node -c ai_corp.js` for syntax, then the complete collection with `node tests/run-all-tests.js`.

---

## 6. Watch-outs

- **Unrezzed ICE overstates security.** `_evaluateServerSecurity()` budgets each unrezzed ICE against the Corp's full credit pool independently (finding A2 in `documentation/backlog/corp_ai_review_findings.md`). Gating on `isSecure` inherits this: a remote with two unrezzed ICE that would actually be cheap to break in sequence can still read as secure. This fix does not correct that finding; it only stops the AI from ignoring `isSecure` altogether.
- **Fewer scoring servers could stall agenda placement entirely.** If no remote is ever secure (as in much of this game, where HQ also never got proper protection), the AI may end up holding every agenda instead of scoring any of them. That is a strictly safer failure mode than handing them to the Runner, but it means this fix alone doesn't solve the underlying problem — the Corp in this log needed a second ICE layer, not just a smarter placement rule. See §7.
- **Log spam.** `_evaluateServerSecurity()` already logs on every call that returns secure (noted in `hq-draw-gate-ignores-server-security.md` §6 and `leo-secure-ice-and-duplicate-security-logging.md`). If that fix has landed on `main`, this change is unaffected either way; if it hasn't, this adds one more call site to the existing noise, not a new pattern of noise.
- **`_isAScoringServer()` is called per-candidate, potentially per-server per-decision.** Confirm the cost of an added `_evaluateServerSecurity()` call here is acceptable; see `corp_ai_finding_11_evaluate_once_per_decision.md` in the backlog, which already flags this function as one of several independently re-deriving overlapping security/protection information.

---

## 7. Related observations (not part of this fix)

These came up while tracing the log. They are unverified beyond what is noted.

1. **HQ never receives a second ICE layer for the whole game.** HQ's protection score degrades from 6.0 to -10.3 over the log and is repeatedly flagged (`HQ WEAKER THAN R&D`, `Critical server has no available ICE; seeking protection for HQ`) without ever being resolved. This is the same shape of problem documented and fixed for a different game in `hq-ice-install-blocked-by-economy-reserve.md`; worth checking whether that fix, if not yet applied to the code that produced this log, would have prevented HQ's protection score from cratering and, indirectly, from lowering the bar in §3.2. The `HQ Danger Evaluation` / `HQ_SAFE` lines in this log (e.g. line 90, 611, 894) confirm this log predates that fix.
2. **The Spin Doctor emergency-draw ability (lines 933-948) didn't find any ICE to protect HQ**, drawing 2 cards and shuffling 2 back without installing anything. Not traced further — could be a supply issue (no ICE left in R&D at that point) or a separate decision gap.
3. **This exact log was already predicted by name.** `hq-ice-install-blocked-by-economy-reserve.md` (§7.1) and `hq-draw-gate-ignores-server-security.md` (§7.4) both flagged `corp_installed_agenda_in_an_unsecure_server.txt` as likely sharing the "decision made without `_evaluateServerSecurity()`" pattern, based on the filename alone. This document confirms that prediction and gives the fix location.

---

## 8. Acceptance criteria

- [x] `_isAScoringServer()` calls `this._evaluateServerSecurity(server)` and returns `false` immediately when `isSecure` is false, before shortcuts or the relative comparison.
- [x] A remote with `secure:false` never appears in `_scoringServers()`'s return value, regardless of its protection score relative to HQ or Archives.
- [x] A remote with `secure:true` still uses the existing relative comparison.
- [x] The insecure fixture failed before the change and passes after; the secure control continues to install.
- [x] `node -c ai_corp.js` and the complete regression collection pass (`21 test files passed`).
- [x] The hand-overflow exception is subject to the same floor.
- [x] No unrelated Corp AI decision path was changed by this ticket.

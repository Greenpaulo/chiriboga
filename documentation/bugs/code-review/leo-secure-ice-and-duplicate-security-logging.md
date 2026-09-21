# Corp AI: preserve secure Bioroid ICE, defend valuable servers, and log security once per decision

**Source:** `documentation/debug-logs/chiriboga-log-2026-09-19T23_31_40.898Z.txt`  
**Files:** `ai_corp.js`, `sets/elevation.js`, `tests/corp-server-security.test.js`  
**Status:** Fixed and regression-tested on 21 September 2026. This write-up covers bugs 3 and 4 in `documentation/bugs/bugs2.md`.

---

## 1. Summary

The reported game exposed four bad-looking Corp decisions and one diagnostic problem:

1. The Corp repeatedly declined to rez Bumi 1.0 on HQ because it was reserving the same credits for Semak-samun on Archives and later R&D.
2. Brân 1.0 already made Remote 3 secure, but LEO Construction immediately trashed Brân to end the current run. The Runner had another click, ran the now-naked remote again, and stole Offworld Office.
3. The Corp protected an empty Archives instead of the vulnerable HQ.
4. On a later turn it put another ICE on R&D while HQ held an agenda and remained vulnerable.
5. The same `Remote 3 appears secure...` message was printed 29 times around one Corp turn.

Items 1, 3, and 4 were manifestations of the already-fixed cross-server rez tie-break, empty-Archives selection, stale protection allocation, and low-economy layer gate. The remaining gameplay defect was LEO's card-specific `AIWouldTrigger()`: it valued ending the current run without asking whether the Bioroid being trashed already guaranteed that result and provided persistent protection.

The repeated message was not a gameplay loop. `_evaluateServerSecurity()` was called by several scoring and planning paths, and it logged on every call even though it is fundamentally a query. The calculation could therefore run many times while the AI compared actions and print the same result each time.

---

## 2. What happened in the log

### 2.1 Bumi was passed repeatedly

On the three HQ runs at lines 476-511, `_iceWorthRezzing()` logged:

```text
AI: Rez cost not worth it, need to save it for Semak-samun in Archives
```

The same pattern recurred at lines 591-616 with Semak-samun on both Archives and R&D. The AI compared central servers as equal value and formerly used the other ICE's protection value as a tie-break, reserving credits for an attack that was not happening. The existing strict cross-server comparison now rezzes the approached Bumi instead of saving for equal-value ICE elsewhere.

### 2.2 LEO destroyed a lock the Runner could not pass

At lines 323-335 the Corp rezzed Brân 1.0 on Remote 3. The security evaluator correctly found that the Runner could not deal with its mandatory subroutines. LEO nevertheless trashed Brân to end that run. Because the Runner still had one click, it immediately ran the unprotected server and stole Offworld Office.

LEO's old heuristic returned `true` whenever the attacked remote contained an agenda. It selected the cheapest rezzed Bioroid and never consulted server security. Thus the fact that Brân itself had already locked the Runner out was ignored.

### 2.3 Archives and later R&D received protection before HQ

After the remote was lost, the Corp installed Semak-samun on empty Archives (lines 340-348). Later, while HQ held an agenda and remained breachable, it installed another Semak-samun on R&D (lines 545-566) and kept Brân in hand.

These decisions came from the protection allocation bugs already corrected in `pointless-archives-ice-install.md` and `hq-ice-install-blocked-by-economy-reserve.md`:

- protection allocations are now aged and reset from the guaranteed Corp turn-start hook;
- Archives is excluded when it contains no agenda and is not a backdoor to HQ;
- a breachable HQ holding an agenda can receive an affordable layer even when the global rez reserve is unmet.

### 2.4 The security message was repeated 29 times

Between lines 244 and 280, the exact Remote 3 security message occurs 29 times. Calls came from protection scoring, ranked-server construction, scoring-window checks, and other candidate evaluation. This was repeated computation during one decision, not recursion or a stuck loop.

The defect was that `_evaluateServerSecurity()` mixed a pure calculation with logging. Every caller produced a line even when it only needed `isSecure` or a break-cost value.

---

## 3. Fix

### 3.1 Do not use LEO when the attacked server is already secure

`LEO Construction: Labor Solutions.AIWouldTrigger()` now asks the Corp security evaluator about the attacked server after finding a legal Bioroid. If the installed protection already creates a deterministic lockout, the identity declines to trash it.

This is deliberately narrower than disabling LEO whenever ICE is present:

- Brân with mandatory subroutines the Runner cannot handle is preserved.
- A Bioroid whose subroutines do not stop the breach may still be trashed to save an agenda.
- Bumi can still be used as LEO fuel when its damage/program-trash subroutines do not prevent the breach.
- The identity's once-per-turn and legal-target checks are unchanged.

### 3.2 Make security evaluation side-effect free

`_evaluateServerSecurity()` no longer logs. It only returns the structured security result.

The ranked protection report retains the useful explanation through `_logServerSecurityEvaluation()`. `_rankedServersToProtect()` stores the security result on each ranked entry, and `_serverToProtect(..., true)` prints at most one detailed security line per secure server immediately before the single `Ranked server protection` summary.

This preserves diagnostics while preventing internal hypothetical and repeated scoring calls from flooding the game log.

The safe local duplicate work was also removed. `_rankedServersToProtect()` now evaluates each included real server once and passes that exact result into `_protectionScore()`, instead of evaluating once for the score and again for `isSecure`. `_bestProtectedRemote()` likewise scores each candidate once rather than rescoring every new leader.

Broader reuse across all helpers in one `Phase_Main()` decision is intentionally tracked in `documentation/backlog/corp_ai_finding_11_evaluate_once_per_decision.md`. That work needs explicit invalidation around hypothetical ICE, credit, counter, and server mutations; a global server-keyed cache would risk stale AI decisions.

### 3.3 Existing fixes that complete bug 3

No duplicate changes were added for behavior already corrected:

| Reported behavior | Existing correction |
|---|---|
| Bumi saves credits for Semak-samun on an equal-value central | Other-server ICE must protect a strictly higher-value server before credits are reserved (`rez-decision-saves-credits-for-other-server-on-tie.md`) |
| ICE installed on empty Archives | Empty Archives is not an eligible protection target (`pointless-archives-ice-install.md`) |
| HQ with an agenda is left breachable because of the economy reserve | Breachable servers with stakes can receive a layer under the reserve (`hq-ice-install-blocked-by-economy-reserve.md`) |
| Later protection allocations ignore HQ | Allocation state is aged once per turn and HQ danger participates in ranked protection |

---

## 4. Acceptance criteria

- [x] The approached HQ Bumi is not left unrezzed merely to reserve credits for Semak-samun on equal-value Archives or R&D.
- [x] LEO does not trash Brân when Brân already makes the attacked agenda remote secure.
- [x] LEO still uses a rezzed Bioroid to end the run when that Bioroid does not secure an agenda remote.
- [x] Empty Archives is not chosen over a vulnerable HQ as an ICE-install target.
- [x] A breachable HQ containing an agenda can be reinforced despite the old global economy reserve.
- [x] Repeated internal calls to `_evaluateServerSecurity()` do not write duplicate log lines.
- [x] A ranked protection report still provides one detailed reason for each server reported secure.
- [x] A ranked protection pass evaluates security once per included real server.
- [x] `_bestProtectedRemote()` calculates each candidate's protection score once.
- [x] Regression and syntax checks pass.

---

## 5. Regression coverage

Six focused cases cover this report:

| Test | Expected result |
|---|---|
| Approached HQ Bumi with Semak-samun on Archives and R&D | `_iceWorthRezzing()` returns `true` |
| LEO with a rezzed Brân locking an agenda remote | `AIWouldTrigger()` returns `false` |
| LEO with a non-stopping Bioroid protecting an agenda remote | `AIWouldTrigger()` returns `true` |
| Repeated security calculations followed by one ranked report | calculations log nothing; report logs one security detail and one ranking summary |
| Ranked protection over HQ, R&D, and Archives | exactly three security evaluations |
| Best-protected-remote selection over two candidates | exactly two protection-score calculations |

The existing fixture coverage also verifies that the Corp protects HQ rather than empty Archives and layers a breachable HQ/agenda remote under the former reserve threshold.

---

## 6. Verification

- `node -c ai_corp.js`: passes.
- `node -c sets/elevation.js`: passes.
- `node tests/corp-server-security.test.js`: **91 regression cases passed**.
- Corp decision fixtures: the nine AI decision fixtures unrelated to the known mulligan expectation pass. `mulligan-one-ice-three-economy.txt` still expects `n` while its own note says current behavior is to choose `m`; this pre-existing mismatch is outside bugs 3 and 4.
- `git diff --check`: passes.

---

## 7. Watch-outs

- `isSecure` is deterministic: hard lockout or mandatory break cost above the Runner's effective public credit/click resources. LEO may still fire when ICE is merely expensive or punishing but does not stop the breach.
- The change does not suppress the single ranked security explanation. It suppresses only logs caused by using the evaluator as an internal query.
- The original log predates the related protection and rez fixes, so a new graphical replay will not follow the same board sequence. The focused tests reconstruct each decision independently instead.

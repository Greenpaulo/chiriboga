# Corp AI: conditional end-the-run text receives the same coarse protection value as a reliable ETR

**Suggested location:** `documentation/bugs/` (move to `documentation/bugs/done/` once merged).
**Source:** Follow-up from `documentation/bugs/code-review/agenda-scored-behind-ice-with-no-etr.md` §§6-7 and the review of commit `fa1182c` in `documentation/code-reviews/code-review-fa1182c-scoring-server.md`.
**Files:** `ai_corp.js`, conditional-ETR card definitions such as Diviner (`sets/systemgateway.js`), and `tests/corp-server-security.test.js`.
**Status:** Diagnosed, not yet fixed. This is separate from the completed scoring-server security-floor fix: the security evaluator already treats Diviner conservatively through its `AIImplementIce` policy, but the coarser `_cardProtectionValue()` path does not.

---

## 1. Summary

Commit `fa1182c` correctly made `_cardProtectionValue()` distinguish ICE with no end-the-run effect from ICE that can end the run:

```js
if (this._iceHasETR(card)) {
  ret++;
  if (card.rezCost > 4 || Strength(card) > 3) ret++;
} else {
  ret += 0.25;
}
```

However, `_iceHasETR()` recognizes ETR by looking for the substring `"nd the run"` in printed text. It therefore returns `true` for both an unconditional subroutine such as `End the run.` and a conditional effect such as Diviner's:

> Do 1 net damage. If you trash a card with a printed play or install cost that is an odd number, end the run.

Diviner consequently receives the full reliable-ETR baseline in `_cardProtectionValue()`, even though its ETR depends on the unknown card trashed from the Runner's grip and may not fire. The Corp must not inspect that hidden information or assume that the condition will resolve in its favour.

This no longer causes the agenda-install bug fixed by `fa1182c`: `_isAScoringServer()` now separately requires `_evaluateServerSecurity(server).isSecure`. It can still distort every other coarse protection-score consumer, including server ranking, ICE placement, best-protected-remote selection, and same-server ICE-rez tie-breaks.

---

## 2. Current behaviour and root cause

### 2.1 `_textEndsTheRun()` is deliberately broad

`_textEndsTheRun()` currently performs a substring match:

```js
_textEndsTheRun(text) {
  if (typeof text == "undefined" || text == null) return false;
  return text.toString().toLowerCase().indexOf("nd the run") > -1;
}
```

`_iceHasETR()` applies that check to every printed subroutine and then to `cardText`. This answers "does the text mention an ETR?", not "does this ICE provide a reliable ETR for Corp planning?" Those questions are equivalent for simple ICE but not for conditional effects.

### 2.2 Diviner already exposes more accurate semantics

Diviner's `AIImplementIce()` distinguishes calculator ownership:

- A Runner-owned calculator may use the Runner's actual grip to estimate whether the conditional ETR is likely to fire.
- A Corp-owned calculator deliberately avoids hidden grip information and reports only the known net-damage effect.

The server-security path consumes that representation through `_securityIceAI()` and `_requiredSubroutineIndices()`. For cards with an `AIImplementIce` hook, mandatory ETR is counted only when every represented branch includes `endTheRun`. That is why the existing `corp-no-agenda-behind-conditional-etr-ice` fixture correctly rejects Diviner as a secure scoring-server defence.

`_cardProtectionValue()` bypasses this representation and calls `_iceHasETR()` directly, losing the distinction.

### 2.3 Relevant call sites

Audit these together rather than changing the substring match globally:

- `_cardProtectionValue()` calls `_iceHasETR()` and is the confirmed faulty consumer.
- `_requiredSubroutineIndices()` uses the structured `AIImplementIce` result when available and raw text only as a fallback. Its existing hidden-information and mandatory-cost behaviour must not regress.
- `_countETRSubroutines()` also uses raw text but currently has no production caller. Either leave it explicitly coarse, align it with the new semantics, or remove it if a repository-wide audit confirms it is dead.
- `_iceHasETR()` may still be useful as a broad "can ever ETR" predicate. Avoid silently redefining it if another consumer needs capability rather than reliability; a separately named reliability helper may be clearer.

---

## 3. Proposed direction

Give `_cardProtectionValue()` a conservative, Corp-visible measure of ETR reliability instead of treating any ETR substring as unconditional.

Prefer the existing structured ICE representation when a card supplies `AIImplementIce`. For a Corp-owned evaluation, a subroutine should receive reliable-ETR credit only when its public representation guarantees `endTheRun` across the relevant branches. Preserve a conservative fallback for simple cards without hooks.

The implementation may use a boolean reliable-ETR helper or a small graded value. A conditional ICE may reasonably retain more than the `0.25` no-ETR deterrence baseline, but it must not automatically receive the same full baseline and high-cost/high-strength bonus as a reliable ETR solely because its text contains the words "end the run".

Do not solve this with a Diviner title check or by reading the Runner's grip from Corp AI code. If a new or changed card hook is introduced, place it with the existing AI hooks at the bottom of the card object and document it in `documentation/ai.md` in the same change.

---

## 4. Tests

Add focused coverage to `tests/corp-server-security.test.js`:

1. A Corp-owned classification of Diviner does not read hidden Runner grip properties or reuse the Runner's private calculator.
2. Diviner does not receive the same reliable-ETR protection credit as an otherwise comparable unconditional ETR ICE merely because its printed text contains `end the run`.
3. A simple unconditional printed ETR retains its existing protection value.
4. ICE whose reliable ETR is described by a structured `AIImplementIce` hook remains recognized.
5. No-ETR ICE retains the `0.25` deterrence treatment introduced by `fa1182c`.

Keep the existing decision fixtures green, especially:

- `corp-no-agenda-behind-conditional-etr-ice.txt`
- `corp-no-agenda-behind-no-etr-ice.txt`
- `corp-agenda-into-secure-remote-still-ok.txt`
- `corp-no-agenda-into-insecure-remote.txt`

Run `node -c ai_corp.js`, focused security tests during iteration, and finally `node tests/run-all-tests.js`.

---

## 5. Watch-outs

- **Hidden information:** Corp evaluation must not inspect card identities, printed costs, or other properties in the Runner's grip. Retain the existing ownership boundary in `AIImplementIce`/`_securityRunCalculator()`.
- **Capability versus reliability:** A conditional ETR is not the same as no ETR. The correction should prevent full guaranteed-lockout credit without requiring every conditional ICE to score identically to harmless ICE.
- **Encounter effects:** Do not regress ICE that ends the run outside an ordinary printed subroutine. Test the structured representation rather than relying only on subroutine text.
- **Security and coarse ranking are distinct:** `_evaluateServerSecurity()` determines whether the Runner can breach; `_cardProtectionValue()` is a graded ranking heuristic. Reuse semantic data where practical, but do not replace the security verdict with the coarse score or double-count its adjustments.
- **Broad decision impact:** `_cardProtectionValue()` feeds several planning and rez-choice paths. The complete decision fixture and snapshot suites are required before landing the change.

---

## 6. Acceptance criteria

- [ ] `_cardProtectionValue()` no longer awards full reliable-ETR credit solely because conditional printed text contains `end the run`.
- [ ] Corp-owned conditional-ETR classification uses no hidden Runner grip information.
- [ ] Diviner is covered by a focused regression test demonstrating the corrected coarse protection value.
- [ ] Reliable printed and structured-hook ETR cases retain appropriate protection credit.
- [ ] No-ETR ICE retains a lower deterrence value than reliable ETR ICE.
- [ ] The existing scoring-server security fixtures continue to pass unchanged.
- [ ] Any new or changed AI card hook is placed with existing AI hooks and documented in `documentation/ai.md`.
- [ ] `node -c ai_corp.js` and `node tests/run-all-tests.js` pass.
- [ ] No card-title workaround or Corp-side hidden-information read is introduced.

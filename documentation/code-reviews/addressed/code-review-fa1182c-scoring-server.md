# Code Review: `fa1182c` — installing agendas into an unsecure remote

**Repo:** Greenpaulo/chiriboga
**Commit:** [`fa1182c`](https://github.com/Greenpaulo/chiriboga/commit/fa1182c34cfb0299c913161ef5bb440fed409c96)
**Tickets:** `documentation/bugs/code-review/agenda-scored-behind-ice-with-no-etr.md`, `documentation/bugs/code-review/corp-installs-agendas-into-a-never-secure-remote.md`

> These two tickets started life in a folder literally named `documentation/bugs/fix-together/`, and the commit does exactly that — both root causes get fixed in one pass and the tickets explicitly cross-reference each other. Unlike the earlier finding-9 commit, this bundling is the tickets' own stated intent, not something to flag.

## Verdict

Approve. Two independent root causes were feeding the same symptom (agendas landing in remotes the Runner could walk into), and both are fixed correctly: an absolute security floor on `_isAScoringServer()`, and an ETR-aware protection value so non-access-denying ICE stops inflating a remote's score in the first place.

## Root cause 1 — `_isAScoringServer()` had no absolute floor

```js
var security = this._evaluateServerSecurity(server);
if (!security.isSecure) return false;

//yes if it has a scoring upgrade, an agenda or an ambush installed
for (var j = 0; j < server.root.length; j++) { ... }
```
The important detail here — and the thing that would've been easy to get only half-right — is that the floor is checked **before** the installed-agenda/ambush/scoring-upgrade shortcut loop, not just before the relative-to-HQ comparison. Under the old code, a remote that already had an agenda sitting in it (from an earlier turn) would short-circuit straight to `return true` via that loop without ever touching `_evaluateServerSecurity()` — so if the remote had since become insecure (Runner installs a breaker, a strength-reducer, whatever), the AI could still treat it as a valid scoring destination purely because of what's already installed there. Moving the floor above that shortcut closes that specific gap, and matches what the doc says it did ("keeps the helper's meaning consistent for all callers").

The hand-overflow branch (dropping the bar to Archives' protection when the hand is about to overflow) is also subject to the same floor now — correctly reasoned in the ticket: an agenda about to be discarded gains nothing from being placed in a remote that's guaranteed to be run and stolen instead.

**Small but real efficiency/consistency detail:** the already-computed `security` result is threaded into `_protectionScore(server, {}, security)` rather than left to recompute internally. This isn't new plumbing — `_protectionScore` already accepted this as an optional third parameter before this commit (it's used the same way at another call site elsewhere in the file) — so this is reusing an established pattern rather than inventing one, and it guarantees the floor check and the `+= 2` "server is secure" bonus inside `_protectionScore` are looking at the exact same evaluation rather than two separate calls that could theoretically disagree.

## Root cause 2 — `_cardProtectionValue()` credited any affordable ICE equally

```js
if (this._iceHasETR(card)) {
  ret++; //1 point for ice that can actually stop the run
  if (card.rezCost > 4 || Strength(card) > 3) { ret++; }
} else {
  ret += 0.25;
}
```
`_iceHasETR()` was already implemented and just unused before this — checked its body directly rather than trusting the doc's description: it scans printed subroutines for end-the-run text via `_textEndsTheRun()`, and falls back to checking `cardText` for the encounter-effect case (specifically called out for Tollbooth, which ends the run without a printed subroutine). That fallback matters here — a naive subroutine-only check would've misclassified Tollbooth as non-ETR. Wiring in an existing, already-correct helper here is the right move rather than writing new detection logic.

The `0.25` deterrence value for non-ETR ICE (Tithe-style — punishes a run but doesn't deny access) versus `0` is a reasonable middle ground and the doc is explicit that it's a tunable constant, not treated as load-bearing precision.

**Worth noting for regression-safety:** this change silently affects every other caller of `_protectionScore()`/`_cardProtectionValue()`, not just `_isAScoringServer()` — the commit's own reasoning for doing both fixes together acknowledges this. The existing `'same-server ICE ordering retains the protection-value tie-break'` test had to swap out its test ICE (Mycoweb → Tollbooth) because Mycoweb isn't ETR-capable and would've silently dropped to the `0.25` baseline, breaking the tie-break assumption the test relied on. Good that this was caught and fixed rather than left to bit-rot, but it's a good sign of how far this change's blast radius reaches — worth keeping an eye on other ICE-ranking tests as this codebase grows.

## Test coverage

Strong, and structured to isolate each root cause independently before testing them together:

- **Unit-level, `_cardProtectionValue`:** a same-strength ETR vs non-ETR ICE pair confirms the value ordering directly, without going through server security at all.
- **Unit-level, `_isAScoringServer`:** two tests that mock `_evaluateServerSecurity`/`_protectionScore`/`_emptyProtectedRemotes` to isolate the function completely — one proves an insecure remote is excluded from `_scoringServers()` *even when its mocked protection score is 10x HQ's*, the other proves a secure remote still correctly uses the relative comparison (and, by flipping the mocked score mid-test, confirms the floor doesn't override that comparison when security is fine — this is the test that most directly guards against a "we fixed it by making the AI too conservative" regression).
- **Fixture-level (decision reproductions):** four new fixtures — a Tithe (no ETR) remote, a Diviner (conditional ETR) remote, an affordable-but-breachable Kessleroid remote reproducing the actual logged bug, and a positive control (hard-lockout Kessleroid) confirming secure remotes still get used for scoring. The Diviner fixture is a nice detail: its note makes explicit that Corp-side evaluation must not assume a hidden-information condition (Runner's grip contents) will resolve in the Corp's favor — that's an existing property of `_evaluateServerSecurity()`, not new in this diff, but this fixture is the first thing to actually exercise it against the new floor.

That positive control matters more than it might look — without it, nothing in this diff would catch a fix that "worked" by making `_isAScoringServer()` return false too often.

## Docs

`documentation/ai.md`'s hook reference is updated for both `_isAScoringServer()` (now describing the absolute-floor-then-relative-comparison behavior) and `_cardProtectionValue()` (documented for the first time here, as far as this diff shows). Matches the implementation.

## Scope

Both tickets' acceptance criteria are checked off, and I don't see anything in the diff outside `_isAScoringServer()`, `_cardProtectionValue()`'s ICE branch, docs, and tests — consistent with both tickets' explicit "no unrelated Corp AI decision path changed" criterion.

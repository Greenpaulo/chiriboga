# L3.5.1 Value-weighted protection debt

**Roadmap item:** L3.5.1 · **Depends on:** F4 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`

## Goal
Let a repeatedly skipped high-consequence server gain protection urgency faster than an ordinary empty server, without recreating starvation in the opposite direction. Flat debt treats an agenda-rich HQ and an empty remote alike, so the server whose breach costs most waits as long as the one whose breach costs nothing.

## Current behaviour
`_rankedServersToProtect()` keeps the full ordered target list; during a Corp turn protection installs rotate through not-yet-protected insecure servers, and at the end of the Runner turn skipped insecure servers gain a flat, bounded protection-debt adjustment while protected or secure servers reset theirs. The HVT redirect remains authoritative. See [architecture: protection allocation](../corp-ai/architecture.md#protection-allocation).

## Design
- Add `_protectionDebtIncrement(entry)` in `ai_corp.js` and use it when aging an insecure server.
- Start with a narrow, bounded range rather than multiplying the complete protection score: a base increment plus a small public-information consequence bonus.
- Candidate consequence signals: agenda points exposed by a breach, whether a remote contains an advanced agenda, whether a breach could win the game, and whether Archives is a live backdoor.
- Existing protection-score inputs must not be counted twice.
- An active deception posture (an agenda bluff or trap bait on that server) suppresses or exempts the debt increment for that server while the bluff is active, so the Corp does not immediately panic-protect a server it deliberately left light.
- Keep the present flat-debt behaviour as the fallback until the acceptance gate is met.

## Safety and information boundary
- Same-turn rotation remains authoritative; weighting affects only cross-turn debt.
- Cap both the per-turn increment and the total accumulated debt.
- Every continuously insecure server must still have a maximum waiting time.
- Secure, protected, removed or repurposed servers must clear or decay their debt.
- Use public Corp knowledge only; never inspect hidden Runner cards.

## Test scenarios
1. Equal-risk insecure servers still rotate within the same turn.
2. A repeatedly skipped agenda-rich HQ or game-winning remote accumulates debt faster than an empty remote.
3. A low-value insecure server is selected within the configured maximum wait despite competing with a high-value server.
4. Installing protection or becoming secure resets debt; destroying a remote removes stale debt.
5. Archives gains extra urgency only while it is an active backdoor.
6. Results are unchanged when hidden Runner Grip contents change without any corresponding public-information change.
7. A remote under an active deception posture does not gain the weighted debt increment while the bluff is active.

## Acceptance gate
Telemetry comes before tuning. Add opt-in logging (normal games stay quiet) that records, for each protection decision: raw score, security result, current debt, debt increment, adjusted score, chosen server, available ICE, and whether the server was breached before the next Corp turn. Aggregate protection share, time to first protection, successful breaches, stolen agenda points and win-causing breaches by server class.

Using the F4 harness, compare the flat-debt baseline against candidate weightings across this simulation matrix: simultaneous naked centrals, HQ agenda flood, an advanced scoring remote, an HVT remote, an Archives backdoor, a poor Corp with one affordable ICE, and a Corp with no installable ICE. Run fixed seeds for reproducibility, then broader randomized batches to detect allocation bias.

Adopt weighted debt only if it reduces high-consequence breaches without increasing any continuously insecure server's worst-case wait beyond the configured cap.

## Things to consider
- The deception exemption is here rather than in L8.2 because the tension only exists once weighted debt exists: L3.5.1 raises urgency on high-value, under-protected servers, which is exactly what an agenda bluff deliberately creates. The exemption must not lift the maximum-wait cap or the match-winning safety guard.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.

# L3.5.1 Value-weighted protection debt

**Roadmap item:** L3.5.1 · **Depends on:** F4, L7.1 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`
**Verified against code:** 376f32c (2026-09-25)

## Goal
Let a repeatedly skipped high-consequence server gain protection urgency faster than an ordinary insecure server, and give every continuously insecure server a real maximum wait, without recreating starvation in the opposite direction. Flat debt treats an agenda-rich HQ and a low-value remote alike, so the server whose breach costs most waits as long as the one whose breach costs little. Today no maximum wait exists at all (see below).

## Current behaviour
See [architecture: protection allocation](../corp-ai/architecture.md#protection-allocation). Verified details:

- `_rankedServersToProtect()` builds one entry per server with `score` (from `_protectionScore()`, lower is more urgent), `debt` and `adjustedScore = score - debt`, sorted by `hvtOverride`, then `adjustedScore`, then insertion order. Within a Corp turn `_serverToProtect()` prefers insecure entries not yet in `_protectionInstallsThisTurn` (rotation).
- Debt ages in `_ageProtectionPriorities()`, called once per Corp turn by `_prepareProtectionPrioritiesForCorpTurn()` (from `phase.js` at "Corp 1.2", from the second Corp turn on), so it ages after each Runner turn. An insecure server that received no protection gains a flat `+1`, capped at `6` (`_serverProtectionDebt`); secure, protected or `_nothingWorthProtecting()` servers reset to `0`; servers no longer in the ranking are deleted.
- The cap bounds the score adjustment, not the waiting time. If only one protection install happens per turn and a low-value server's score is more than 6 points behind the top-ranked server, debt alone never selects it. There is no maximum wait today.
- Consequence signals already inside `_protectionScore()`, which must not be counted twice: the HQ agenda count and `_agendaPointsInServer(corp.HQ)` terms, `_serverStructuralRisk()` (agenda points and an advanced agenda in a one-ICE remote), the `_centralServerThreat()` penalty, successful-run history, `_serverRunPressure()` for Archives, and `_archivesIsBackdoorToHQ()`.
- Deception: once an active bait or bluff posture reaches its target ICE depth, `_NoMoreProtectionForThisServer()` (through `_deceptionProtectionTarget()`) removes the server from the ranking, so it gains no debt and its debt is deleted. A postured server still below its target ranks and ages normally. Because the bait and bluff rolls are cached for the card's lifetime (`_serverBaitDecisions`, `_agendaBluffDecisions`), the exclusion lasts until the card leaves or `_runnerMayWinIfServerBreached()` turns the posture off.
- Diagnostics: `Phase_Main` calls `_serverToProtect(false, true)`, which logs "Ranked server protection" with score, debt, adjusted score and security per server.

## Design
- **AI option.** `this.options.weightedProtectionDebt` (default `false`, per the AI options convention in `documentation/ai-planning.md`). Off: today's flat `+1`/cap `6` behaviour, unchanged; this is the fallback until the gate is met. On: the weighted increment and the wait bound below. Deterministic tests for scenarios 2, 3, 5 and 9 set the option on the instance under test.
- **Weighted increment.** Add `_protectionDebtIncrement(entry)` and use it in `_ageProtectionPriorities()` when the option is on. It returns `1 + bonus`, with `bonus` in `[0, 1]` taken only from L7.1's `_breachConsequence(entry.server)` (for example `min(1, pointsExposed / 3)`, and `1` when `winProbability >= CORP_AI_CRITICAL_BREACH_RISK_THRESHOLD`). The total cap stays `6`. The increment changes only how fast debt grows; it adds nothing to the score, so the existing score inputs above are not counted again. This item must not derive agenda points, win risk or backdoor state itself.
- **Maximum wait.** Keep a second map, `_serverProtectionWait`, counting consecutive Corp-turn agings in which a server was in the ranking, insecure, not `_nothingWorthProtecting()`, received no protection, **and** `_protectionInstallsThisTurn` was non-empty (another server was protected). A turn with no protection install anywhere does not count, because allocation did not starve the server. It resets and is deleted exactly as debt is. When `wait >= this.options.maxProtectionWait` (default `3`), the entry is marked `waitOverride` and sorts after `hvtOverride` and before `adjustedScore` (longest wait first, then `adjustedScore`). The override yields when another eligible server has `_runnerMayWinIfServerBreached()` true, and it does not bypass the L3.5.2 eligibility predicate: an overridden server that cannot accept a layer passes the install to the next entry. This, not the debt cap, is what enforces the waiting bound.
- **Deception.** No new exemption. The "active deception posture" this item respects is exactly the existing `_NoMoreProtectionForThisServer()` exclusion: an excluded server gains neither debt nor wait, and a postured server below its target ages like any other, because the Corp still intends to add ICE up to the target. How long a posture stays active is L8.4's concern; this item therefore does not depend on L8.4.
- **Telemetry.** No item-specific logging. Extend the existing "Ranked server protection" entry with `increment`, `wait` and `waitOverride`, and add F4 collectors (listed in the criteria) that read `_rankedServersToProtect()` entries at each protection install through F4's collector extension point, alongside the shared DecisionSnapshots record.

## Safety and information boundary
- Same-turn rotation remains authoritative; weighting affects only cross-turn debt.
- Per-turn increment in `[1, 2]`; total debt capped at `6`.
- With the option on, no eligible, continuously insecure server waits more than `maxProtectionWait` counted turns.
- Secure, protected, removed, repurposed or excluded servers clear their debt and wait.
- Use public Corp knowledge only (through `_breachConsequence()`); never inspect hidden Runner cards.

## Test scenarios
1. Equal-risk insecure servers still rotate within the same turn, with the option on and off.
2. With the option on and `_breachConsequence()` reporting 2+ exposed points for HQ and 0 for a remote, a repeatedly skipped HQ gains a larger increment than the remote each aging and reaches the cap in at most 3 agings; the remote gains `+1` per aging.
3. With the option on, a low-value insecure server whose score is more than 6 behind a high-value insecure server, while the single protection install each turn goes to the high-value server, receives the next protection install once its wait reaches `maxProtectionWait`; its wait then resets.
4. Installing protection or becoming secure resets debt and wait; destroying a remote removes both.
5. Archives gains extra urgency only while `_archivesIsBackdoorToHQ()` is true (through `_breachConsequence()`).
6. Results are unchanged when hidden Runner Grip contents change without any public-information change.
7. A server excluded by `_NoMoreProtectionForThisServer()` because its active posture reached its target depth gains neither debt nor wait; when the posture ends (for example the winning-breach guard trips) it rejoins the ranking with zero debt and zero wait.
8. With the option off, scenarios 2–4 produce exactly today's flat `+1`/cap `6` debt and no `waitOverride`.
9. A `waitOverride` yields to an eligible server whose breach would win the game.
10. A Corp with no installable ICE accrues no wait (no protection install happened) and no override fires; a poor Corp with one affordable ICE gives it to the override target only if that target passes the eligibility predicate.

## Acceptance gate
F4 comparison (paired seeds, committed deck pool, 200 games per deck pair, bootstrap 95% CI): baseline option off, candidate option on. The deck pool must include at least one Runner deck with a live Archives backdoor (Baker) and one with central multi-access.

- Improvement: `highConsequenceBreaches` per game decreases: the CI of (baseline − candidate) has a lower bound above 0.
- Guard: `pointsStolen` per game: CI upper bound of (candidate − baseline) at most +0.2.
- Guard: `winRate`: CI lower bound of (candidate − baseline) at least −0.02.
- Hard check: `protectionWaitTurns` never exceeds `maxProtectionWait` in any candidate game.

## Things to consider
- The consequence signal has one owner, L7.1's `_breachConsequence(server)`; this item and I2 consume it. Do not add a second agenda-points-exposed calculation here.
- The legacy ticket put the deception exemption in L8.2 and described it as lasting "while the bluff is active". Under lifetime posture caches that would be permanent; relying on the existing exclusion keeps the lifetime question with L8.4.
- The former "simulation matrix" (simultaneous naked centrals, HQ agenda flood, advanced scoring remote, HVT remote, Archives backdoor, poor Corp with one affordable ICE, no installable ICE) is now covered by scenarios 1–5, 9 and 10 plus the deck-pool requirement above.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] The behaviour change ships behind an AI option that defaults to off (named in the Resolution).
- [ ] Gate evidence is recorded in the Resolution: F4 command, deck pairs, seed count, metrics, baseline vs candidate, and the threshold met. Only then is the option switched on by default.
- [ ] The F4 collectors `highConsequenceBreaches` (successful runs on a server whose `_breachConsequence()` at the preceding Corp turn had `pointsExposed >= 2` or `winProbability >= 0.35`) and `protectionWaitTurns` (largest `_serverProtectionWait` value reached per game) are added through F4's collector extension point.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.

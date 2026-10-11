# L7.1 Consequence-calibrated central pressure

**Outcome:** not adopted — gate failed 2026-10-09 (`centralStolen.points` rose: +0.045 per game, interval [+0.001, +0.089])

**Roadmap item:** L7.1 · **Depends on:** F4 · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`
**Verified against code:** 143ac4f (2026-10-09)

## Resolution

Implemented from `5f09697` (plan approved 2026-10-09).

**Gate:** failed — `consequenceWeightedCentralPressure` removed. F4 gate, run
after the full suite passed:

**Gate command:** `node scripts/ai-batch.js gate --corp-option consequenceWeightedCentralPressure=true --collector centralStolen --collector exhaustedPressureProtectionInstalls --improve centralStolen.points --guard winRate=0.02 --guard pointsScored=0.2 --guard pointsStolen=0.2 --guard exhaustedPressureProtectionInstalls.count=0.1 --jobs 4`

Committed pool `core-v1` (pd-tao, btl-kit, neh-zahya, pe-steve, gateway,
zwicky-magdalene, leo-topan), paired seeds 1–200 per pair, 1,400 paired games,
0 failed, 223 changed by the option. Bootstrap 95% intervals:

| Metric | Baseline | Candidate | Difference | 95% interval | Threshold | Result |
|---|---|---|---|---|---|---|
| `centralStolen.points` (lower) | 3.659 | 3.704 | +0.045 | [+0.001, +0.089] | improvement interval above 0 | FAIL (significantly worse) |
| `winRate` (higher) | 0.372 | 0.369 | −0.003 | [−0.014, +0.008] | regression ≤ 0.02 | PASS |
| `pointsScored` (higher) | 3.921 | 3.935 | +0.014 | [−0.034, +0.061] | regression ≤ 0.2 | PASS |
| `pointsStolen` (lower) | 5.859 | 5.872 | +0.014 | [−0.032, +0.061] | regression ≤ 0.2 | PASS |
| `exhaustedPressureProtectionInstalls.count` (lower) | 0.005 | 0.004 | −0.001 | [−0.002, +0.000] | regression ≤ 0.1 | PASS |

Gate setup check (`--quick`, not evidence): "350 paired games, 55 changed by
the options".

Following "When a gate fails", the option, its `_centralServerThreat()`
branch, its `CENTRAL PRESSURE` protection log and its option-only tests
(scenarios 1, 4 and 8) were removed. Kept, because they are useful without the
weighting:

- `_breachConsequence(server)` (the owned signal for L3.5.1 and I2), with
  `_centralPressureSummary()`, `_centralAccessCount()` and
  `_centralWinProbability()` shared with `_centralBreachLossRisk()` (whose
  output is unchanged).
- Hook semantics (`AICentralPressure` `exhausted` field; documented in
  `documentation/ai.md`). Cards updated, playable sets: `systemgateway` —
  Docklands Pass (reports its access outside the Runner's turn); `elevation` —
  Devadatta Drone (`exhausted: true` at zero power counters);
  `systemupdate2021` — none (no central-pressure sources). Conduit needed no
  change (zero counters is growth, not spent). No other playable card
  implements `AICentralPressure`. Neither card change moved a decision
  snapshot or corp-decision fixture.
- Harness `install` event (`scripts/ai-batch/headless.js`) and collectors
  `centralStolen` and `exhaustedPressureProtectionInstalls`.

Tests: L7.1 scenarios 2, 3, 5, 6, 7 and 9 in `tests/corp-server-security.test.js`
(scenario 2 now asserts the consequence signal rather than a weighted penalty);
collector and `install`-event tests in `tests/central-consequence-gate-setup.test.js`.
Departures from the plan: tests were added to the existing
`tests/corp-server-security.test.js` harness rather than a new file.

Next idea: [L7.1.1 Horizon-aware central consequence](../../corp-ai/specs/L7.1.1-horizon-aware-central-consequence.md)
(proposed): first explain the failure from replays, the likely cause being a
current-snapshot weight that discounts an agenda-free HQ that refills by draw.
Note for I2: its planned `consequenceWeight = 0.25 + 0.75 × weight` is the
same mapping this gate rejected for central protection.

Architecture: [central pressure and breach-loss risk](../../corp-ai/architecture.md#central-pressure-and-breach-loss-risk).

## Implementation plan

Proposed at `143ac4f`, 2026-10-09. **Approved 2026-10-09.** (Plan gate: changes
the shared protection evaluator `_centralServerThreat()` / `_protectionScore()`
in `ai_corp.js`, extends the `AICentralPressure` hook contract, and touches more
than three source files.)

- **Validation (re-grounded at `143ac4f`):**
  - Confirmed unchanged: `_centralServerThreat()` (`ai_corp.js` ~376) still
    computes `min(8, 1.5 × additionalAccess + 2 × persistentPressure +
    min(2, growth))`, now also clamping access by `ServerAccessLimit` and
    zeroing persistent/growth under `ServerSuccessfulRunPrevented`;
    `_protectionScore()` subtracts it for HQ/R&D only (~3378);
    `_centralBreachLossRisk()` (~443) still has the security early return and
    the order-agnostic DP; `_runnerMayWinIfServerBreached()` (~4718),
    `_archivesIsBackdoorToHQ()` (~245), threshold 0.35. `_breachConsequence`
    and `consequenceWeightedCentralPressure` do not exist. Other consumers of
    `_centralServerThreat()`: `_classifyRunnerMacroThreat()` and Vantage Point's
    `AIDefensiveValue` (in-progress set) read the raw fields, not `penalty`, so
    they are unaffected if only `penalty` is weighted.
  - Pool reach: every committed pool Runner deck has Docklands Pass; three have
    Conduit; Magdalene has Devadatta Drone. The pool reaches the option; no
    `Starts:` boards are needed.
  - **Disagreement 1 (scenario 3 / collector).** No playable pressure source is
    "limited-use hardware". Docklands Pass (a resource) reports `{}` after an
    HQ breach until `responseOnRunnerTurnBegins` resets it, so during the
    Corp's turn, when protection is decided, it reports no access although it
    is live again for the very next Runner turn. Treating that as "exhausted"
    would make the collector count correct HQ defence as over-protection. The
    only genuinely spent source in playable sets is Devadatta Drone at 0 power
    counters (Conduit at 0 counters is not spent; it regrows). The plan fixes
    Docklands' hook to describe the next Runner turn when evaluated outside a
    Runner turn, and adds an explicit `exhausted: true` field to the hook
    contract (Devadatta at 0 counters) so the collector has a public, mechanical
    signal rather than inferring "spent" per card.
  - **Disagreement 2 (formula).** The ticket says "scale the access component
    by `pointsExposed` and `winProbability`" without a formula. Proposed:
    `accessPenalty = 1.5 × additionalAccess × (0.25 + 0.75 × weight)`, where
    `weight` is `_breachConsequence(server).weight`; persistent and growth terms
    unchanged; total still capped at 8. This reuses the same
    `0.25 + 0.75 × weight` mapping I2 already specifies, keeps a floor so empty
    HQ still values multi-access (agendas arrive by draw), and adds no new
    constant tuned to one board.
  - **Disagreement 3 (R&D top cards).** No code tracks R&D positions revealed to
    the Corp; the existing DP is order-agnostic. "Top cards only where revealed"
    is dropped from this item (nothing to read); recorded as out of scope.
  - **Gate drift.** F4 has no combined HQ+R&D stolen metric
    (`metrics.js` has `pointsStolenByServer.hq` and `.rd` separately), and the
    gate lacked the standard `pointsStolen` guard for a defence item. The gate
    below is normalized to form 2 with a `centralStolen` collector and the added
    `pointsStolen` guard (0.2); existing metrics and thresholds are unchanged.
  - Classification: strategic preference (weighting between legal protection
    choices) → F4-gated. `_breachConsequence()` itself and the DP refactor are
    behaviour-identical with the option off.
- **Approach:**
  1. Extract the DP from `_centralBreachLossRisk()` into
     `_centralWinProbability(server, accessCount, pointsNeeded)`; add
     `_centralAccessCount(server, options)` computed from the raw (unweighted)
     pressure summary; `_centralBreachLossRisk()` keeps its security early
     return and calls both (no output change).
  2. Add `_breachConsequence(server)` → `{pointsExposed, winProbability,
     advancedAgenda, backdoorTo, weight}` per the Design (central
     `pointsExposed` = hypergeometric expectation `accessCount / n × agenda
     points in server`; Archives takes the larger of its own and HQ's while
     `_archivesIsBackdoorToHQ()`).
  3. In `_centralServerThreat()`, split out a raw summary function; when
     `this.options.consequenceWeightedCentralPressure` is on, weight only the
     access term as above and log the weight in the existing protection log.
     `_breachConsequence()` reads the raw summary only (no recursion).
  4. `CorpAI.DEFAULT_OPTIONS.consequenceWeightedCentralPressure = false`.
  5. Hook contract: `AICentralPressure` may return `exhausted: true`
     (Devadatta Drone at 0 counters); Docklands Pass reports access when
     evaluated outside the Runner's turn. Document in `documentation/ai.md`.
  6. Harness: add a `__install` probe in `scripts/ai-batch/headless.js`
     emitting an `install` event for Corp ICE installs on HQ/R&D with a public
     snapshot of that server's pressure sources (`additionalAccess`,
     `exhausted`); collectors `exhaustedPressureProtectionInstalls` and
     `centralStolen` (from `steal` events) with tests in
     `tests/ai-batch.test.js` style.
  - Rejected: scaling by `pointsExposed` alone (zero on empty HQ would erase
    multi-access defence entirely); changing `CORP_AI_CRITICAL_BREACH_RISK_THRESHOLD`
    in this change (only as a separately gated candidate, per Design).
- **Tests:** new `tests/central-consequence.test.js` covering scenarios 1–9
  (option on/off, logged reason asserted), plus collector unit tests. No
  existing expectation changes: option off is behaviour-identical, except the
  Docklands hook fix, which changes off-mode inputs — if any green
  fixture/snapshot moves, that delta is listed and justified, or the Docklands
  fix is moved behind the option instead (decision deferred to the run).
- **Risk:** `_protectionScore()` ordering for HQ/R&D vs remotes shifts with
  the option on (gated). The Docklands fix shifts off-mode HQ pressure on the
  Corp turn after an HQ breach; check with `tests/decision-snapshots.test.js`
  and `tests/corp-decision-fixtures.test.js`. Performance: the DP runs per
  central threat evaluation; bounded by HQ/R&D size × access count; check
  `evaluatorCallCount`.
- **Docs:** `documentation/ai.md` (`AICentralPressure` `exhausted` field,
  Docklands semantics), `documentation/corp-ai/architecture.md` (central
  pressure section), `documentation/ai-batch-harness.md` (install event),
  notes to L3.5.1/I2 that `_breachConsequence()` is live.

## Goal
Scale the mechanic-level central-pressure penalty by the actual consequence of the next central breach, rather than treating every extra access as equally dangerous, and provide the one breach-consequence signal every other item uses. This completes the non-lethal consequence weighting that remains after the tactical loss interrupt.

## Current behaviour
See [architecture: central pressure and breach-loss risk](../../corp-ai/architecture.md#central-pressure-and-breach-loss-risk). Verified details:

- Installed Runner cards expose `AICentralPressure(server)` (a number, or `{additionalAccess, persistentPressure, growth}`), and `AICentralPressureAfterPurge(server)` for purge-dependent cards. `_centralServerThreat()` turns these into `penalty = min(8, 1.5 × additionalAccess + 2 × persistentPressure + min(2, growth))`, which `_protectionScore()` subtracts for HQ and R&D only. Nothing weights it by what a breach would expose.
- `_centralBreachLossRisk(server)` computes, for HQ or R&D, the order-agnostic probability that one breach with `1 + floor(additionalAccess)` accesses gives the Runner enough points to win, from the Corp-known contents of that server. It returns 0 when the server is currently secure. At `CORP_AI_CRITICAL_BREACH_RISK_THRESHOLD` (0.35) or more, `_criticalBreachDefenseAction()` may interrupt non-winning advancement.
- Remotes have only a win/no-win check, `_runnerMayWinIfServerBreached(server)`, based on `_agendaPointsInServer(server)`. There is no shared function that reports what a breach of an arbitrary server would expose.

## Design
Scope clarification after the [regression recovery](../../corp-ai-regression/gated-fix-handoff.md):
`emptyArchivesRunPressure` gates empty-Archives admission, not removal of the
pressure machinery or the central tactical interrupt. Its off setting remains
the control for this item. The agenda/backdoor consequence signal below does
not value non-agenda run rewards or recent-run pressure on empty Archives.
That admission/reward calibration is an explicit gap tracked in the
[install design ownership table](../../corp-ai/specs/install-decisions-design.md#corrected-regression-baseline-and-ownership);
it must not be silently bundled into this central-consequence policy.

- **Owned consequence signal.** Add `_breachConsequence(server)` returning `{pointsExposed, winProbability, advancedAgenda, backdoorTo, weight}` for every server, computed "if breached", independent of current security:
  - remote: `pointsExposed = _agendaPointsInServer(server)`, `winProbability` 1 when `_runnerMayWinIfServerBreached(server)`, else 0, `advancedAgenda` when a root agenda has advancement counters;
  - HQ and R&D: expected agenda points from one breach with the public access count, and the win probability from the same dynamic programme `_centralBreachLossRisk()` uses (refactor so both share it; `_centralBreachLossRisk()` keeps its security early return);
  - Archives: agenda points it holds; while `_archivesIsBackdoorToHQ()` is true, the larger of that and HQ's consequence, with `backdoorTo` set to HQ.
  - `weight` in `[0, 1]`: `max(winProbability, min(1, pointsExposed / max(1, AgendaPointsToWin() - AgendaPoints(runner))))`, the single scalar that I2's `consequenceWeight` (`0.25 + 0.75 × weight`, in `specs/install-decisions-design.md`) reads.
  L3.5.1 (debt rate) and I2 (marginal-security weighting) consume this function; neither re-derives these values.
- **Central penalty.** Behind `this.options.consequenceWeightedCentralPressure` (default `false`), scale `_centralServerThreat()`'s access component by `_breachConsequence(server).pointsExposed` and `winProbability`, keeping the eight-point bound. Inputs: agenda points needed to win, HQ size and Corp-known agenda density, R&D size, top cards only where a game effect revealed them to the Corp, and remaining uses/counters reported by the hook.
  Compute the public access count used by `_breachConsequence()` and
  `_centralBreachLossRisk()` from a raw pressure summary that does not apply
  consequence weighting. Apply `_centralServerThreat()`'s consequence
  weighting only after that summary exists, so the calculation cannot recurse.
- Keep the hook mechanical; consequence weighting belongs in the evaluator.
- A zero-counter scaling engine (for example Conduit) may contribute bounded growth pressure but must not claim current multi-access.
- Tactical threshold: candidate values of `CORP_AI_CRITICAL_BREACH_RISK_THRESHOLD` are compared under the same gate; the constant changes only for a value that passes it.
- Keep `documentation/ai.md` accurate for `AICentralPressure` and `AICentralPressureAfterPurge` if their semantics change.

## Safety and information boundary
- The Corp may use its own HQ and R&D knowledge, but must never inspect hidden Runner cards in Grip or Stack.
- Known top cards may be used only where a game effect has revealed those positions to the Corp.
- Do not double-count the existing HQ agenda-flood terms in `_protectionScore()` or successful-run history. L3.5.1 consumes `_breachConsequence()` for its debt rate only; this item adds no cross-turn accumulation.

## Test scenarios
1. With the option on, one extra HQ access is more urgent when HQ is agenda-rich than when it holds no agendas.
2. R&D multi-access becomes critical when a breach could win.
3. An exhausted limited-use source (spent counters, reported `exhausted: true`) contributes zero current access pressure; a once-per-turn source evaluated on the Corp's turn still reports access for the next Runner turn.
4. Zero-counter scaling pressure stays below live multi-access.
5. Changing hidden Runner Grip/Stack identities changes nothing.
6. `_breachConsequence()` reports the same `winProbability` for HQ as `_centralBreachLossRisk()` does when HQ is insecure, and keeps that value when HQ becomes secure (it is "if breached"), where `_centralBreachLossRisk()` returns 0.
7. `_breachConsequence(corp.archives)` reports HQ's consequence only while `_archivesIsBackdoorToHQ()` is true.
8. With the option off, `_centralServerThreat()` penalties are unchanged from today.
9. `weight` is 1 for a remote whose breach wins the game, 0 for an empty remote, and strictly between for a remote exposing fewer points than the Runner needs.

## Acceptance gate
F4 gate. Option `consequenceWeightedCentralPressure` (Corp AI), off in the baseline
and on in the candidate. Committed deck pool, paired seeds, 200 games per deck
pair, bootstrap 95% intervals.
Collectors: `centralStolen` (adds `centralStolen.points`: agenda points the
Runner stole from HQ plus R&D per game), `exhaustedPressureProtectionInstalls`
(adds `exhaustedPressureProtectionInstalls.count`, defined in the acceptance
criteria).
Starts: none (every pool Runner deck has Docklands Pass; Conduit and Devadatta
Drone also appear).

| Check | Metric | Better | Threshold |
|---|---|---|---|
| Improve | `centralStolen.points` | lower | interval of the improvement above 0 |
| Guard | `winRate` | higher | regression at most 0.02 |
| Guard | `pointsScored` | higher | regression at most 0.2 |
| Guard | `pointsStolen` | lower | regression at most 0.2 |
| Guard | `exhaustedPressureProtectionInstalls.count` | lower | regression at most 0.1 |

Gate command: `node scripts/ai-batch.js gate --corp-option consequenceWeightedCentralPressure=true
--collector centralStolen --collector exhaustedPressureProtectionInstalls
--improve centralStolen.points --guard winRate=0.02 --guard pointsScored=0.2
--guard pointsStolen=0.2 --guard exhaustedPressureProtectionInstalls.count=0.1`

(Normalized 2026-10-09 from the earlier list form: same metrics and
thresholds; the HQ+R&D improvement is now one collector metric because F4
reports `pointsStolenByServer.hq` and `.rd` separately; the standard
`pointsStolen` guard was added.)

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] The behaviour change ships behind an AI option that defaults to off (named in the Resolution).
- [ ] Applicable gate evidence is recorded in the Resolution.
      For F4: exact command, committed deck pairs, paired seeds, seed count,
      every metric's baseline/candidate result and bootstrap 95% confidence
      interval, guarded-regression result, pass conditions and thresholds; an
      improvement interval's lower bound must be above zero. Only then is the
      option switched on by default.
- [x] The gate is ready to run: every collector and start board it names exists and is tested, and a `--quick` run of the gate command completes and reports at least one game changed by the options.
- [x] The F4 collector `exhaustedPressureProtectionInstalls` is added through
  F4's collector extension point. It counts a Corp ICE install on HQ or R&D only
  when at least one public central-pressure source for that server reports
  `exhausted: true` (spent uses or counters, through the hook) and no source
  reports positive current `additionalAccess`; a server with no pressure
  sources, or only active non-access pressure, does not qualify. (Amended
  2026-10-09: "spent" is the hook's explicit signal, not inferred per card;
  Docklands Pass after an HQ breach is live for the next Runner turn and is not
  exhausted.)
- [x] The F4 collector `centralStolen` is added through F4's collector
  extension point and reports `centralStolen.points`, agenda points stolen from
  HQ plus R&D per game.
- [x] `_breachConsequence(server)` exists and is the only breach-consequence calculation; L3.5.1 and I2 are told to consume it.
- [x] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [x] The Resolution lists the cards updated in each set in scope and confirms none were missed.
- [x] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [x] `node tests/run-all-tests.js` passes.

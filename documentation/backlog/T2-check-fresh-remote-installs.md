# T2 Check fresh remote installs

**Roadmap item:** T2 · **Depends on:** none · **Sets:** playable sets
**Read first:** `documentation/ai-principles.md`, `documentation/runner-ai/principles.md`, [T3](../runner-ai/specs/T3-face-down-card-risk.md)
**Verified against code:** 527db6f (2026-10-30)

## Goal

Make the Runner check a fresh, unadvanced card in a remote it can afford to
breach, as a human does, instead of leaving it alone about nine turns in ten.
Besides making the Runner a better opponent, this matters for every Corp AI
decision measured in AI-vs-AI batches: the Corp's steal-risk tables and its
batch gates are calibrated against this Runner, so they currently teach the
Corp that unprotected agenda installs are nearly safe. Owner playtests show
the opposite (see Evidence). This is the main known reason batch results and
owner playtests disagree.

## Current behaviour

**Evidence (measured).** The I4 calibration
(`documentation/corp-ai/measurements/I4-3f46a2a-agenda-exposure-calibration.json`,
stock Runner AI, default options) counts, per Runner turn, whether an agenda in
a remote was stolen. For an agenda with no advancement counters:

| Remote ICE | Runner breach margin | Runner turns | Stolen | Rate |
|---|---|---|---|---|
| none | 10+ credits spare | 232 | 22 | 9.5% |
| none | 5–9 | 108 | 14 | 13% |
| one | 10+ credits spare | 4,217 | 484 | 11.5% |

With advancement counters on a bare remote the rate is 91% (T1's concern is
the reverse: running advanced cards almost every time).

**Consequences found in Corp work (2026-10-30, I10):**
- I4's `CORP_AI_AGENDA_EXPOSURE_TABLE` rates an unadvanced agenda in a bare
  remote at 11.8% steal per Runner turn, so `agendaDestinationPlan` installed
  agendas into undefended remotes; Paul stole them the same turn and turned
  the option off.
- I10's first readiness fallback (install when the remote was no easier to
  breach than HQ) raised the 210-game smoke run from 31.9% to 46.7% Corp wins,
  yet lost three agendas in one owner playtest (`real_I10_game1_win.txt`).
  Removing it dropped the smoke run to 29.5%. The batch rewarded exactly the
  behaviour a human punishes.

**Cause (investigated 2026-10-30 at 582e580).** Target valuation, locked in
by a low-value "setup" gate; a blanket damage assumption makes the gate trip.
Not click/credit budgeting.

Method: 420 seeded games (seeds 1–60, every pair in
`tests/fixtures/ai-batch/deck-pool.json`, default options) with a read-only
`--setup` probe wrapping `RunnerAI._internalChoiceDetermination`. For every
Runner action decision while a remote held a face-down, unadvanced card
installed since the Runner's previous turn, it recorded each server's
potential and path cost, the Runner's log lines and the chosen action.

- 1,610 Runner turns had such a remote with a feasible path; the Runner ran
  it in 363 (22.5%; bare remotes 20%, iced 24%). Over the 3,115 decisions in
  the turns it skipped: "Favouring setup" 68%, ran or planned another server
  20%, "Favouring econ" 9%, other 3%.
- **Valuation.** `ai_runner.js:2186` gives a fresh unadvanced remote card a
  flat potential of 1.0, the same as R&D and an unknown HQ (≈1.0). After the
  ±0.1 jitter it can never exceed 1.1, and nothing rewards checking it now,
  before it is advanced or protected.
- **Setup gate.** `ai_runner.js:2508–2514` abandons running for the click when
  the best server's potential is below 1.1, its path cost above 1.0, and the
  hand holds any card worth keeping (nearly always). A fresh remote is
  therefore run only when its cost is at most 1.0 or the hand is empty of
  setup. In 1,240 of the gate's 2,246 firings the fresh remote was the
  top-ranked server. The "Favouring econ" gate (potential below 1.5 with a
  priority economy card, `ai_runner.js:2501–2506`) blocks it the same way.
- **Cost inflation.** `runcalculator.js:1308` assumes one net damage
  (possible Hokusai Grid) for every unknown root card, whatever the Corp
  deck; only one of the seven pool Corp decks contains Hokusai Grid. A bare
  remote with one unknown card therefore costs at least 1.3 (2.6 against
  Personal Evolution, which adds one more), so it always trips the gate.
- When the gate does not fire, the remote ties R&D and HQ at ≈1.0 and wins
  only on jitter.

## Design

1. **Investigate** (no behaviour change): replay batch games where the
   Runner had a breachable remote with a fresh install and did not run it;
   record, per turn, the targets considered and why the remote lost. Report the
   cause before choosing a design.
2. **Change** behind Runner option `checkFreshRemotes` (default off),
   approved by Paul 2026-10-30. All in `ai_runner.js` run selection:
   - **Remember install timing.** At the Runner's first action decision each
     turn, record the face-down cards in every remote root. A card is
     *fresh* when it was not there at the previous record (installed since
     the Runner's last turn). Card positions and install timing are public;
     nothing reads the card. The engine has no install-turn field, so the
     Runner AI keeps this itself.
   - **Value.** A remote holding a fresh, unadvanced, face-down card gets
     potential 1.7 (named constant) instead of 1.0, once per remote. After
     the ±0.1 jitter that stays above the "Favouring setup" (1.1) and
     "Favouring econ" (1.5) gates and above R&D (1.0, 1.5 with HQ empty),
     but below HQ with a known agenda (about 2.0 or more) and below an
     advanced face-down card (5.0). `AIRunSuccessChance` and run-event
     extras apply as before.
   - **Affordability.** The higher value applies only when the best path's
     credit spend (spent + lost) is at most half the Runner's available
     credits and the path carries no tag or serious effect. Otherwise the
     remote keeps 1.0, so an expensive or dangerous remote is still left
     alone, as now. Because the path is calculated after potential, apply
     the value after the path calculation and update `cachedPotentials`.
   - **Grip guard.** No higher value when the Runner's grip after the run
     would be under 3 cards: an unpriced Snare! (3 net damage) could
     flatline it. T3 replaces this with a proper public trap estimate.
   - **Log.** `Fresh install in <server> worth checking (potential …,
     credits …)` when the value applies, so tests and playtest logs show
     the reason.
   - Out of scope: the blanket Hokusai Grid damage assumption and other
     trap pricing ([T3](../runner-ai/specs/T3-face-down-card-risk.md)); advanced cards
     ([T1](../runner-ai/specs/T1-advanced-card-trap-caution.md), parked); the setup and econ
     gates themselves.
3. **Recalibrate afterwards** (Corp side, existing scripts): with the option
   on, rebuild `CORP_AI_AGENDA_EXPOSURE_TABLE` and `CORP_AI_BREACH_HAZARD_TABLE`
   and refresh batch baselines. Then re-check which Corp options (I4's
   exposure table, `agendaDestinationPlan`, I10) still earn their place.
   Earlier Corp gate verdicts measured against the old Runner may change.

## Safety and information boundary

- Use only public information: the card is face down; advancement counters,
  install turn and server ICE are public. No reading of the card's identity.
- Traps (Urtica Cipher, Snare!) make blind checking costly. T2 only guards
  against a flatline (grip guard); pricing traps from public deck evidence
  is [T3](../runner-ai/specs/T3-face-down-card-risk.md). The run calculator's flatline check
  is unchanged.

## Test scenarios

1. Runner with spare clicks and credits, a breachable remote holding a fresh
   unadvanced card, cards worth keeping in grip, and no stronger central
   reason: the Runner runs the remote. Logged reason names the fresh install.
2. Same board with the remote unaffordable (breach needs more than half the
   Runner's credits): the Runner does not run it; no fresh-install log.
3. A central with a stronger public reason (HQ with a known agenda) still
   wins.
4. The same card one Runner turn later (no longer fresh): valued 1.0 as now.
5. Grip of 2 cards: no higher value (grip guard).
6. Option off: decisions unchanged from today on the scenario 1 board.

## Acceptance gate

Human gate. Option `checkFreshRemotes` (Runner AI), new behaviour off
unless the owner requests otherwise. Owner-controlled playtesting under
`documentation/ai-playtesting.md`; no fixed sample or numerical thresholds.
Assess: the Runner checks fresh remote installs it can afford, as a human
does; preserve sensible central pressure and trap caution.
Adoption: Paul decides after playtesting; record the tested flags and decision.

## Things to consider

- Once adopted, the Corp-side recalibration in Design step 3 is required
  before trusting any new Corp batch comparison.
- Other Runner/human differences likely exist (R&D versus HQ value, Archives
  runs); this item covers only the one with hard numbers.

## Acceptance criteria
- [x] The investigation's cause is recorded in this ticket before the design is chosen.
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] (Gated items) The behaviour change ships under a named AI flag, initially off unless the owner requests otherwise (named in the Resolution).
- [ ] (Owner playtesting) The handoff names the tested flags, the behaviour to assess and contrasting cases; owner adoption remains explicit or pending.

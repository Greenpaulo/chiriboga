# T2 Check fresh remote installs

**Roadmap item:** T2 · **Depends on:** none · **Sets:** playable sets
**Read first:** `documentation/ai-principles.md`, `documentation/runner-ai/principles.md`, [T1](T1-advanced-card-trap-caution.md)
**Verified against code:** f1b130d (2026-10-30)

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

**Cause: not yet known.** The rate could come from target selection (fresh
remote cards valued low), click/credit budgeting (centrals first, nothing
left), or run feasibility estimates. The first step of this item is finding
which, in `ai_runner.js` run targeting.

## Design

1. **Investigate** (no behaviour change): replay batch games where the
   Runner had a breachable remote with a fresh install and did not run it;
   record, per turn, the targets considered and why the remote lost. Report the
   cause before choosing a design.
2. **Change** behind a Runner option (proposed `checkFreshRemotes`, default
   off): a fresh unadvanced remote install the Runner can afford to breach is
   a run target comparable to a central access, valued from public
   information only (the card is face down; it may be an asset or trap). Keep
   T1's caution for advanced cards separate.
3. **Recalibrate afterwards** (Corp side, existing scripts): with the option
   on, rebuild `CORP_AI_AGENDA_EXPOSURE_TABLE` and `CORP_AI_BREACH_HAZARD_TABLE`
   and refresh batch baselines. Then re-check which Corp options (I4's
   exposure table, `agendaDestinationPlan`, I10) still earn their place.
   Earlier Corp gate verdicts measured against the old Runner may change.

## Safety and information boundary

- Use only public information: the card is face down; advancement counters,
  install turn and server ICE are public. No reading of the card's identity.
- Traps (Urtica Cipher, Snare!) make blind checking costly; the value of a
  check must account for that from public deck evidence, as T1 does.

## Test scenarios

1. Runner with spare clicks and credits, a breachable remote holding a fresh
   unadvanced card, and no stronger central reason: the Runner runs the
   remote. Logged reason names the fresh install.
2. Same board with the remote unaffordable: the Runner does not run it.
3. A central with a stronger public reason (e.g. HQ full of known agendas
   pressure) still wins.

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
- [ ] The investigation's cause is recorded in this ticket before the design is chosen.
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] (Gated items) The behaviour change ships under a named AI flag, initially off unless the owner requests otherwise (named in the Resolution).
- [ ] (Owner playtesting) The handoff names the tested flags, the behaviour to assess and contrasting cases; owner adoption remains explicit or pending.

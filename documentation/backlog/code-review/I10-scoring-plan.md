# I10 Scoring plan

**Outcome:** blocked — owner playtesting of `scoringPlan`, then `scoringPlanCardSteps`, decides adoption.

**Roadmap item:** I10 · **Depends on:** I2, I4 · **Sets:** playable sets in `documentation/card-sets.md`
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`, [install-decisions-design.md](../../corp-ai/specs/install-decisions-design.md)
**Verified against code:** 11129c5 (2026-10-30)
**Source log:** `documentation/debug-logs/corp_didnt_install_single_agenda.txt`
**Architecture:** [Scoring plan (I10)](../../corp-ai/architecture.md#scoring-plan-i10)

## Resolution

Implemented from `11129c5`.

**Gate:** pending owner playtesting — `scoringPlan` defaults to off. Human
gate; `scoringPlanCardSteps` and `economyAssetsWhenRich` are separate options,
also off, for Paul to playtest after version 1.

**Classification:** strategic preference (which legal install to make), so
every behaviour change is behind a default-off option. The Phật Gioan
Baotixita hooks fill a missing card AI declaration (the card was never
installed) and are not gated, like other card-batch AI hooks.

**What changed**
- `scoringPlan` (v1): `_scoringPlanAction()` / `_scoringPlan()` in
  `ai_corp.js`, called from `Phase_Main()` after the advance block. Steps:
  score-this-turn install; install into a ready remote; protect the target
  remote with ICE (I2-ranked for that server). Readiness is the Runner's
  public breach margin (`_breachMargin()`), not I4's exposure table, which is
  calibrated on the Runner AI (an unadvanced agenda in a bare remote: 11.8%
  steal per turn). The legacy HQ-relative scoring bar no longer gates agenda
  installs while the option is on; `_rankedInstallOptionsCore()` offers no
  HQ agenda installs, so only the plan installs them.
- `scoringPlanCardSteps` (v2): scoring upgrades (`AIIsScoringUpgrade`) go on
  the target before the agenda; defensive upgrades (`AIDefensiveValue`)
  protect it when no ICE can be installed. No new hook contracts.
- `economyAssetsWhenRich`: seven economy assets (Regolith Mining License and
  six others in System Gateway, System Update 2021, Downfall and Elevation)
  call the new `_economyAssetWanted()`; with the option on, a rich Corp
  installs them in the economy fallback instead of clicking for credits.
- Phật Gioan Baotixita: `AIWorthInstalling` (always a new remote) and
  `AIRezWhenCan` (outside runs).
- Fixture runner: `EXPECT_LOG` directive, so fixtures assert the logged
  reason; stubs for `CheckInstall`, `CheckInstallDestination`, `InstallCost`.

**Departures from the design below**
- No persistent plan record. The plan is recomputed from the board every
  click, which keeps it stable (the same target wins while the board is
  unchanged) without save/restore state or staleness.
- Version 2 needs no new advance step: advancing operations and abilities are
  already counted by `_potentialAdvancement()` in the score-this-turn check.
  Asset replacement for room is limited to the existing obsolete-bluff rule
  in `_remoteHasRoom()`; a fuller asset-value comparison remains I5.
- Readiness adds two fallbacks so the plan cannot stall: install when no
  protection can be added and the target is no easier to breach than HQ, or
  when agendas would be discarded. Protection stops at three ICE.

**Tests:** new green fixtures in `tests/fixtures/corp-decisions/`:
`i10-plan-protects-new-remote` (scenarios 1 and 5),
`i10-plan-installs-in-locked-remote` (2), `i10-plan-protects-breachable-remote`
(3), `i10-plan-scores-this-turn-unprotected` (4), `i10-plan-v2-scoring-upgrade`,
`i10-plan-v2-defensive-upgrade`, `economy-asset-when-rich`,
`phat-gioan-baotixita-installs`. Scenario 7 (flag off unchanged): every
existing fixture and decision snapshot passes unchanged. Scenario 6
(emergency pre-emption) follows from call order in `Phase_Main()` and has no
dedicated test.

**Smoke check (not adoption evidence):** `node scripts/ai-batch.js --games 30`,
210 games each, 0 failed: defaults Corp win 31.9%, scored 3.60; `scoringPlan`
46.7%, scored 4.79; all three options 48.1%, scored 4.73.

**Handoff for playtesting**
1. Set `scoringPlan: true` (other options as now). Look for: a remote built
   and ICE'd while agendas wait in HQ; agendas installed only into ICE'd
   remotes (or when they score the same turn); no long click-for-credit
   streaks with agendas in hand. Preserve: central ICE under real pressure,
   asset play when no agenda is in hand.
2. Then add `scoringPlanCardSteps: true` with a deck carrying scoring or
   defensive upgrades (SanSan City Grid, Manegarm Skunkworks, Anoetic Void).
3. Separately, `economyAssetsWhenRich: true`: rich Corp installs Regolith-type
   assets rather than clicking for credits.
4. Log lines start `AI: Scoring plan {...}` with step and reason.

## Implementation plan

Proposed at `11129c5`, 2026-10-30. **Approved 2026-10-30** (owner, in
conversation: v1 and v2 behind separate flags, plus the two side fixes).

- **Validation:** the source log shows I4 recommending installs that the
  legacy path drops, no step that creates a scoring remote, and the
  HQ-relative bar in `_isAScoringServer()` rising with each HQ ICE. I4's
  install recommendations were unsafe because its exposure table is measured
  on the Runner AI.
- **Approach:** as in Resolution.
- **Tests:** decision fixtures per scenario, with logged reasons.
- **Risk:** shared `Phase_Main()` and install ranking; all changes inert with
  the options off (existing fixtures/snapshots unchanged).
- **Docs:** architecture, `ai.md`, roadmap, playtesting note.

## Goal
Give the Corp an explicit, multi-turn plan to score: prepare a remote, protect
it, install an agenda there and advance it to scoring. When active, the plan
chooses the Corp's clicks instead of contributing one more score to the
click-by-click ranking. Owner playtests show the two current failures are the
same missing concept: with `agendaDestinationPlan` off the Corp never builds a
place to score and loses agendas from HQ; with it on, agendas go into remotes
nobody prepared and are stolen the same turn. Earlier attempts to block
insecure installs failed because blocking without building leaves the Corp
clicking for credits. This item replaces I3's older persistent-role proposal
and takes the useful parts of I8 for the scoring line.

## Current behaviour
Evidence: `documentation/debug-logs/corp_didnt_install_single_agenda.txt`
(AU Co. vs Tāo, owner defaults). Runner won 8–0 with all four agendas stolen
from HQ; the Corp clicked for credits about 20 times on 12–19 credits.

1. **I4's decision is computed and dropped.** In `_rankedInstallOptionsCore`,
   `_agendaCommitmentOptions` logs `best: install new remote` for Sericulture
   Expansion from turn 1. Its options are consumed only when
   `agendaDestinationPlan` is on; otherwise agendas fall through to the legacy
   path.
2. **The legacy path never creates a scoring remote.** Agenda destinations
   come only from `_scoringServers(_emptyProtectedRemotes())`, i.e. existing
   remotes with ICE and room. Nothing installs ICE on a new remote *in order
   to* score; a remote appears only if I2 happens to rank one.
3. **The scoring bar is relative to HQ.** `_isAScoringServer` requires the
   remote's `_protectionScore` to be at least HQ's (Archives' only once
   agendas fill the whole hand). Agendas in hand make HQ the server I2 most
   wants to protect, so each HQ ICE raises the remote bar. In the log, Remote 0
   (one ICE) never qualified while HQ held two; later the bar was met
   (`Scoring windows: [9.1]`) but the click went to "Critical server has no
   available ICE; seeking protection for HQ" instead. The
   [L7.1.1 failure analysis](../../corp-ai/specs/L7.1.1-horizon-aware-central-consequence.md)
   found the same coupling.
4. **No click is planned across turns.** `Phase_Main` falls through
   advance → install → emergency recovery → economy → "Not sure what to do" →
   click for credit. No state says "this turn's ICE is for next turn's agenda".
5. **Side findings (not owned here):** Regolith Mining License's
   `AIWorthInstalling` declines whenever `_sufficientEconomy(false)` is true, so
   a rich Corp never installs it; Phật Gioan Baotixita has no
   `AIWorthInstalling` hook and is never installed (L8.7/I5 audit material).

## Design
Behind a new option `scoringPlan` (default off). One plan record on the
Corp AI, rebuilt rather than trusted when the board changes:

```text
plan = {
  agenda,        // card in HQ, or null for "next agenda drawn" when HQ has none
  server,        // existing remote, or "new"
  steps,         // remaining: prepare | protect | install | advance | score
  reservedCredits, // rez + advance costs the remaining steps need
  createdTurn, reason
}
```

**Choosing a plan** (start of each Corp action, top level only):
- Candidate agendas: agendas in HQ; prefer the one I4's
  `_agendaCommitmentOptions` ranks best to install.
- Candidate servers: existing remotes with room (including replacing an asset
  whose remaining value is low — use the existing obsolete-bluff/aging rules
  first, not a new asset-value system), or a new remote.
- Feasibility: total clicks and credits to reach "scored" across this turn and
  the next, using `_advancementLimit`, `_potentialAdvancement` and ICE install
  plus rez cost. Pick the cheapest feasible (agenda, server) pair.
- No plan when no agenda is in hand and none is likely soon, or when an
  emergency (central-loss interrupt, purge) owns the click.

**Readiness** is absolute, not relative to HQ: the server is ready when the
Runner's known capability (`_protectionScore`/security evaluation from I2,
public threat memory, credit ceiling) cannot breach it profitably this coming
turn, *or* when I4's exposure table says installing now beats waiting. The
legacy HQ-relative bar in `_isAScoringServer` stays unchanged for the
flag-off path.

**Executing** (plan owns the click while active):
1. `prepare`: make room (create remote, or replace a low-value asset).
2. `protect`: install the I2-best ICE *for that server* (restrict
   `_marginalIceInstallOptions` to `[plan.server]`), keeping rez money in
   `reservedCredits`. Repeat until ready.
3. `install`: install the agenda when ready; if a same-turn score is possible
   (install + advances within clicks/credits), do it this turn.
4. `advance` / `score`: advance under I4's completion plan.
5. Spare clicks: economy cards, assets and HQ/R&D protection only when they
   leave `reservedCredits` intact; never click for credits while a plan step is
   affordable.

**Replanning:** after every run, rez, steal, trash, purge, or install by the
Runner that changes the target server's security; drop the plan if the agenda
leaves HQ or the server is lost.

**Card-declared step options (version 2, after owner playtest of v1):** each
step can be satisfied by cards through hooks, not title lists:
- advance: click-advance, `AIAdvanceCreditGain`/`AIFastAdvance`/
  `AIFastAdvanceCounters` operations and abilities, `AIAdvancementLimit`.
- protect: ICE, and defensive upgrades (new hook, e.g. `AIDefendsServer`,
  documented in `documentation/ai.md`).
- prepare/score: `AIIsScoringUpgrade` upgrades, `AICannotScoreOnInstallTurn`.
Version 1 covers ICE, install and click-advance only.

## Safety and information boundary
- Use only Corp-visible information about the Runner (no hidden Grip or
  stack), as the existing security evaluation does.
- Never assume future draws; a "next agenda" plan may only prepare and
  protect, never reserve an install click.
- Keep the agenda/asset information boundary: preparing a remote must not
  depend on agenda presence in a way that differs from bluff/asset installs
  more than the existing deception distance already allows.
- The plan record is AI-private state and must survive save/restore or be
  rebuilt deterministically on load.

## Test scenarios
1. Replay of the evidence log's opening (agendas in HQ, no remote, ≥6
   credits): with `scoringPlan` on, the Corp creates and protects a remote
   instead of clicking for credits, and installs Sericulture Expansion in it
   by its third turn. Logged reason names the plan step.
2. Remote with one ICE the Runner cannot currently break versus HQ with two
   ICE: the agenda is installed in the remote (absolute readiness), not
   withheld by the HQ-relative bar.
3. Remote the Runner can breach with known breakers and credits: the Corp
   protects it before installing; no undefended last-click install.
4. Same-turn score available (3-advance agenda, 4 clicks, enough credits):
   install + advance ×3 in one turn.
5. Plan active and a step is affordable: the Corp never takes the basic
   click-for-credit action.
6. Central-loss emergency: the interrupt pre-empts the plan for that click
   and the plan resumes afterwards.
7. Flag off: decisions identical to current defaults (decision snapshots and
   corp decision fixtures unchanged).

## Acceptance gate
Human gate. Option `scoringPlan` (Corp AI), new behaviour off
unless the owner requests otherwise. Owner-controlled playtesting under
`documentation/ai-playtesting.md`; no fixed sample or numerical thresholds.
Assess: the Corp builds a protected remote and scores from it instead of
holding agendas in HQ, and does not install agendas into unprepared remotes;
preserve central protection under real pressure and asset/economy play when no
agenda is in hand.
Adoption: Paul decides after playtesting; record the tested flags and decision.

## Things to consider
- `agendaDestinationPlan` stays off and independent; the plan reads I4's
  options and exposure table directly.
- `secureScoringServerGate`, `serverAtRiskInstallOverride` and
  `committedAgendaReserveBypass` are partial versions of the same idea; with
  `scoringPlan` on they should be bypassed, not combined. Retire them later if
  adopted.
- I8 remains for general multi-action planning outside the scoring line; it
  can reuse the plan record.
- Performance: the plan is chosen once per action at top level; avoid
  re-running security evaluation inside hypotheticals.
- Glacier versus fast-advance decks will want different readiness thresholds;
  start with the security evaluation and let playtests say whether a deck
  profile (I3.1) is needed.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [x] The behaviour change ships under `scoringPlan`, default off.
- [x] Any new card hook is documented in `documentation/ai.md`.
- [x] (Owner playtesting) The handoff names the tested flags, the behaviour to assess and contrasting cases; owner adoption remains explicit or pending.
- [x] `architecture.md` describes the scoring plan.

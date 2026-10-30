# I10 Scoring plan

**Roadmap item:** I10 · **Depends on:** I2, I4 · **Sets:** playable sets in `documentation/card-sets.md`
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`, [install-decisions-design.md](install-decisions-design.md)
**Verified against code:** 77909e6 (2026-10-30)

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
   [L7.1.1 failure analysis](L7.1.1-horizon-aware-central-consequence.md)
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
- [ ] The behaviour change ships under `scoringPlan`, default off.
- [ ] Any new card hook is documented in `documentation/ai.md`.
- [ ] (Owner playtesting) The handoff names the tested flags, the behaviour to assess and contrasting cases; owner adoption remains explicit or pending.
- [ ] `architecture.md` describes the scoring plan once merged.

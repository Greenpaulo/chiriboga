# I5 Asset, ambush and economy value

**Roadmap item:** I5 · **Depends on:** I10, L8.10, F4 · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** [L8.9 tool recipe](../../ai-batch-harness.md#using-install-observations-in-the-i-tickets), [L8.9 delivery](../../backlog/code-review/L8.9-observable-defense-parity.md), [I3.1](I3.1-deck-game-plan-profile.md), `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`, `documentation/corp-ai/specs/install-decisions-design.md`
**Verified against code:** 376f32c (2026-09-25)

## Goal
Compare root assets by expected board value instead of relying primarily on
hook-selected remote indices, so that the Corp installs assets that repay their
costs, uses traps credibly, and does not starve scoring remotes.

## Current behaviour
Assets with `AIWorthInstalling(emptyProtectedRemotes)` choose an existing
remote by index, request a new remote, or reject installation; the remote list
is ordered by `_protectionScore()`. Other assets go to remotes from
`_assetDestinationOrder()` (a per-decision cached shuffle), skipping the
strongest empty remote. Nothing calculates expected return, payoff time,
disposability, run attraction, or whether installing nothing is better.
`AIReserveCredits` (read through `_reserveCreditsForCard()`) already lets a
card declare post-rez spending for economy and ICE-rez planning.
See [architecture.md: install planning today](../architecture.md#install-planning-today).

## Design

**Deception input ownership.** [L8.8 Marginal deception value](L8.8-marginal-deception-value.md)
proposes a shared marginal concealment contract and a separate private
mechanical-payoff breakdown. It is not a dependency of this item: retain the
shared design's bounded placeholder unless L8.8 has been adopted and this
item's own gate validates its consumer. Do not invent an independent payoff
conversion, count the same effect twice, or feed private trap payoff into
ordinary postured ICE ranking. I5 owns any justified `trapValue` conversion;
I2's equivalent-board substitution invariant remains authoritative.

**Trap evidence prerequisite (2026-10-13).**
[L8.10](L8.10-trap-play-value.md) owns the read-only mechanics and opportunity/access
diagnostics. It is a prerequisite, not an adopted trap-value policy. This item
owns conversion into `trapValue`: before raising, define the response horizon,
conversion/units, calibrated probability source, uncertainty fallback and domain
of validity from that evidence. Do not treat severity as damage, access probability
or credits. If the evidence supports no conversion, explicitly keep trap payoff
diagnostic in the initial asset-value scope and record the limitation before
implementation; do not ship a guessed probability. Reuse `AIReserveCredits`,
with paid costs and reserved liquidity accounted for once.

Before raising, also reconcile the gate below against a fresh matching control
and define tell coverage for root class conditioned on public Grip size, credits,
turn, root age and shape, plus applicable realized-defense guards. Timing/spending
may change; exact equality of every observable is not the acceptance criterion.
Preserve I2's equivalent active-posture ordinary ICE decisions. Metric paths,
sample coverage, margins and commands must be frozen before candidate results;
this note does not silently amend the recorded adoption thresholds below.

**Measurement handoff from L8.9 (2026-10-19).** I5 owns asset/trap installation
and holding decisions; L8.9's proposed blanket deferral without protected room
was withdrawn and must not become a prerequisite. Its evidence identifies an
existing route difference, not a proof that bare installs are strategically wrong.

Follow the [tool recipe](../../ai-batch-harness.md#using-install-observations-in-the-i-tickets):
collect `realizedIceByRootType`, `bluffSingleVariableCorrelation` and
`installOutcomes` on fresh matched I5 reports. Analyze each arm separately with
`node scripts/ai-batch/install-defense-summary.js <one-arm-report.json>` and,
for route origins, `node scripts/ai-batch/defense-attribution.js <report.json>`.
Inspect placement reasons and offered alternatives, install ICE, later ICE
changes, endpoints and root age per deck/route alongside asset payoff, trap
triggers and the declared paired gate. Extend the existing L8.9 focused tests
rather than starting competing collector definitions. Recorded control noise
margins are not automatic I5 harm limits or matching controls after I3 changes.

Shell/asset-spam plans can justify many bare cheap roots; preserving one scoring
room is compatible with leaving other remotes unprotected. Evaluate an actual
counterexample and establish representative coverage or report its absence.
Do not suppress ordinary asset tempo or trap credibility just to reduce pooled
agenda/trap ICE differences. I3.1 can later describe deck evidence; I5 does not
wait for it, classify plans from names/ICE density alone, or adopt a profile
consumer without its own evidence and gate.

L8.9 has no full HQ wait/never-installed denominator or ordinary-asset/upgrade
split in saved lifecycle samples. If I5 changes waiting or asset-spam deployment,
plan the additional passive opportunity/holding/type/topology evidence needed
before making claims about timing, frequency or which uninstalled cards paid off.
Keep unknown/discarded/never-installed cases visible and test observation identity.
L8.10 remains the prerequisite for trap mechanics/opportunity and payoff modeling.

Value components, in the design note's units and bounds (`economyValue`,
`trapValue`, `installCost`, `reserveCost`, `opportunityCost`):

- install, rez, activation, click and opportunity costs;
- turns or activations required to repay those costs;
- expected usable lifetime given public pressure and server security;
- trash cost and Runner economic pressure;
- immediate value if contested;
- access-punishment severity and probability of attracting a run (`trapValue`,
  never security);
- synergy with advancement, tags, damage, other installed cards, or Corp plans;
- the value of keeping a stronger remote for scoring (from I3's roles).

Hooks: adapt existing `AIWorthInstalling()` behaviour rather than removing it.
A future declarative hook may return a mechanic/value profile instead of a
destination index, but design it from several real cards in the scoped sets
before standardizing. Post-rez spending stays with `AIReserveCredits`.

**Title cases.** Own the rows tagged I5 in the P1 ticket
(`documentation/backlog/corp_ai_finding_13_legacy_title_lists.md`): the
economy and asset title lists.

## Safety and information boundary
Expected lifetime and run-attraction estimates use only public pressure and
server security. An Ambush's trap value never counts as deterministic
protection. Bait frequency and candidate value must not drift across repeated
evaluator calls in one planning window.

## Test scenarios

Additional evidence case: an asset-heavy/shell-like board has several legitimate
bare disposable roots and a separate scoring remote. Compare deployment/payoff,
trap access and scoring-room occupancy without a universal ICE requirement;
state the coverage gaps if saved reports cannot support the comparison.

1. An economy asset with no plausible payoff before access is delayed or
   assigned only disposable value.
2. An immediately profitable asset may be installed in a weaker remote when its
   return justifies the risk.
3. A severe Ambush receives trap value but does not count as deterministic
   protection.
4. Bait frequency and candidate value remain stable across repeated evaluator
   calls in one planning window (the existing `_shouldBaitServer()` cache and
   `_assetDestinationOrder()` per-decision cache must still hold).
5. A normal asset does not displace an agenda or required scoring upgrade from
   the intended scoring server.
6. Card hooks can reject mechanically pointless installs without hardcoding
   their titles in the planner.

## Acceptance gate
Improvement gate: candidate `this.options.assetValue` on against I0's baseline,
with the standard guards (design note) and:

- Improvement: `installOutcomes.assetNetCredits` per game rises (candidate minus baseline
  lower bound above 0).
- Guards: `installOutcomes.trapTriggers` per game lower bound at least -20% of the baseline
  mean (traps stay credible); `pointsStolenByServer.remote` upper bound at most
  +0.15 points per game (scoring remotes are not starved of protection).

## Things to consider
- The "derelict remote" problem (design note edge case 1): once a temporary
  economy asset (e.g. _Pad Campaign_ or _Mumba Temple_) is used up, its 1-ICE
  remote should be reconsidered for its upgraded potential.
- Standardizing a value-profile hook before several real scoped cards need it
  risks a contract that fits one card; adapt `AIWorthInstalling()` first.
- The Runner AI nearly always runs an advanced face-down card in a bare
  remote: advanced agendas there were stolen in 43 of 47 Runner turns (I4
  `remoteAgendaRisk` baseline, 2026-10-23;
  [fit cells and remote-turn filter](../../runner-ai/specs/T1-advanced-card-trap-caution.md#current-behaviour)).
  Advanced traps there will look
  very strong against today's Runner; do not tune to that. Runner item T1
  makes the Runner cautious; run I5's gate with T1 on if it has landed, or
  rerun it after.
- I4 and I5 can run in parallel after I3; if both land, rerun the later one's
  gate against a baseline that includes the earlier one's option on.

## Acceptance criteria
- [ ] Reuse the L8.9 collector/analysis recipe on current matching reports and record per-deck/route placement, later defense and lifetime evidence beside asset payoff/trap outcomes.
- [ ] Cover shell/asset-spam deployment; explicitly scope and test missing holding, ordinary-asset/type and remote-topology observations when the policy claims require them.
- [ ] L8.10 is done; record the supported trap conversion/model or explicitly scoped diagnostic-only fallback before raising.
- [ ] Reconcile the matching control and tell/defense gate coverage described above before implementation and candidate results.
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] The behaviour change ships behind an AI option that defaults to off (named in the Resolution).
- [ ] Gate evidence is recorded in the Resolution: F4 command, deck pairs, seed count, metrics, baseline vs candidate, and the threshold met. Only then is the option switched on by default.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] The Resolution lists the cards updated in each set in scope and confirms none were missed.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.

# I5 Asset, ambush and economy value

**Roadmap item:** I5 · **Depends on:** I3, L8.10, F4 · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`, `documentation/corp-ai/specs/install-decisions-design.md`
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
- I4 and I5 can run in parallel after I3; if both land, rerun the later one's
  gate against a baseline that includes the earlier one's option on.

## Acceptance criteria
- [ ] L8.10 is done; record the supported trap conversion/model or explicitly scoped diagnostic-only fallback before raising.
- [ ] Reconcile the matching control and tell/defense gate coverage described above before implementation and candidate results.
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] The behaviour change ships behind an AI option that defaults to off (named in the Resolution).
- [ ] Gate evidence is recorded in the Resolution: F4 command, deck pairs, seed count, metrics, baseline vs candidate, and the threshold met. Only then is the option switched on by default.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] The Resolution lists the cards updated in each set in scope and confirms none were missed.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.

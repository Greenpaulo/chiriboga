# I5 Asset, ambush and economy value

**Roadmap item:** I5 · **Depends on:** I3, F4 · **Sets:** playable sets (`documentation/card-sets.md`)
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

- Improvement: `assetNetCredits` per game rises (candidate minus baseline
  lower bound above 0).
- Guards: `trapTriggers` per game lower bound at least -20% of the baseline
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
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] The behaviour change ships behind an AI option that defaults to off (named in the Resolution).
- [ ] Gate evidence is recorded in the Resolution: F4 command, deck pairs, seed count, metrics, baseline vs candidate, and the threshold met. Only then is the option switched on by default.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] The Resolution lists the cards updated in each set in scope and confirms none were missed.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.

# I5 Asset, ambush and economy value

**Roadmap item:** I5 · **Depends on:** I3 · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** `documentation/corp-ai/principles.md`, `documentation/corp-ai/specs/install-decisions-design.md`

## Goal
Compare root assets by expected board value instead of relying primarily on
hook-selected remote indices, so that the Corp installs assets that repay their
costs, uses traps credibly, and does not starve scoring remotes.

## Current behaviour
Assets with `AIWorthInstalling(emptyProtectedRemotes)` choose an existing
remote by index, request a new remote, or reject installation; the remote list
is ordered by `_protectionScore()`. The planner does not calculate expected
return, payoff time, disposability, run attraction, or whether installing
nothing is better; generic non-HVT assets avoid the strongest empty remote by
convention only.
See [architecture.md: install planning today](../architecture.md#install-planning-today).

## Design
Proposed value components:

- install, rez, activation, click, and opportunity costs;
- turns or activations required to repay those costs;
- expected usable lifetime given public pressure and server security;
- trash cost and Runner economic pressure;
- immediate value if contested;
- access-punishment severity and probability of attracting a run;
- synergy with advancement, tags, damage, other installed cards, or Corp plans;
- value of preserving stronger remotes for scoring.

Hooks: existing `AIWorthInstalling()` behaviour should be adapted rather than
removed immediately. A future declarative hook may return a mechanic/value
profile instead of a destination index, but its design should be established
from multiple real cards in the scoped sets before standardization.

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
   calls in one planning window.
5. A normal asset does not displace an agenda or required scoring upgrade from
   the intended scoring server.
6. Card hooks can reject mechanically pointless installs without hardcoding
   their titles in the planner.

## Acceptance gate
Scoped asset fixtures produce explainable payoff/risk decisions, and
simulations improve realized asset value without eliminating credible traps or
starving scoring remotes.

## Things to consider
- The "derelict remote" problem (design note edge case 1): once a temporary
  economy asset (e.g. _Pad Campaign_ or _Mumba Temple_) is used up, its 1-ICE
  remote should be reconsidered for its upgraded potential.
- Standardizing a value-profile hook before several real scoped cards need it
  risks a contract that fits one card; adapt `AIWorthInstalling()` first.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.

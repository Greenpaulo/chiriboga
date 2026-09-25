# I3 Remote role and root suitability

**Roadmap item:** I3 · **Depends on:** I1 · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`, `documentation/corp-ai/specs/install-decisions-design.md`

## Goal
Decide what a remote is for before comparing root cards, so that every root
install candidate declares a role and incompatible role/card combinations are
rejected or penalized explicitly rather than arising as side effects of shared
protection scores.

## Current behaviour
Root destinations are chosen through legacy helpers that reuse
`_protectionScore()`: `_emptyProtectedRemotes()`, `_isAScoringServer()`,
`_scoringServers()`, `_bestProtectedRemote()` and `_bestServerToUpgrade()`.
Roles are implicit; generic non-HVT assets are steered away from the strongest
empty remote by convention, and an installed agenda, scoring upgrade or ambush
makes a remote count as a scoring server.
See [architecture.md: install planning today](../architecture.md#install-planning-today).

## Design
Initial roles:

- `scoring`: agenda advancement and scoring;
- `economy`: assets expected to repay their costs;
- `trap`: real access punishment intended to attract a run;
- `defensive`: cards whose primary purpose is protecting another root card or
  access;
- `bluff`: controlled deception without an immediately matching payload;
- `disposable`: value remains acceptable if contested quickly;
- `uncommitted`: protected space held for a future purpose.

Work:

- Add `_remoteRole(server, context)` and
  `_rootSuitability(card, server, role, context)` or equivalent helpers.
- Distinguish a server's current observed role from a proposed role after
  installation.
- Prevent accidental role conflicts, such as ordinary economy consuming the
  only credible scoring remote or random assets entering a scoring server.
- Treat role changes as explicit candidates with opportunity costs rather than
  silent side effects.
- Integrate existing bait and deception profiles as bounded inputs, not
  dominant policy.

## Safety and information boundary
A server's role is inferred only from Corp-visible information. No existing
deception safety rule may be weakened, and repurposing a remote must clear or
revise stale deception assumptions safely.

## Test scenarios
1. A low-payoff economy asset does not consume the only safe scoring remote
   when a viable disposable destination exists.
2. An Ambush can prefer a more tempting server than an agenda without claiming
   that the server is secure.
3. A scoring upgrade preserves or creates a scoring role only when its
   mechanics and future plan support that use.
4. Repurposing a remote clears or revises stale deception assumptions safely.
5. A server's role is inferred only from Corp-visible information.

## Acceptance gate
Every root install candidate declares a role, incompatible role/card
combinations are rejected or penalized explicitly, and no existing deception
safety rule is weakened.

## Things to consider
- The "derelict remote" problem (design note edge case 1): an empty remote left
  behind by a used-up economy asset must be evaluated for its upgraded
  potential, not locked to its historical role, or the Corp may keep opening
  new remotes for agendas instead of recycling a 1-ICE server.
- Recognising a remote as a scoring server because it already holds an agenda,
  scoring upgrade or ambush is not proof that installing the original card
  there was safe; keep observed role and suitability separate.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.

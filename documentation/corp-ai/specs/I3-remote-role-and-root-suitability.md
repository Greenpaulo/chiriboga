# I3 Remote role and root suitability

**Roadmap item:** I3 · **Depends on:** I2, F4, L8.4 · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`, `documentation/corp-ai/specs/install-decisions-design.md`
**Verified against code:** 376f32c (2026-09-25)

## Goal
Decide what each remote is for before comparing root cards, so that ordinary
economy does not consume the only credible scoring remote, repurposing a remote
is an explicit choice, and the Corp stops investing in remotes while its
centrals collapse.

## Current behaviour
Root destinations come from legacy helpers built on `_protectionScore()`:
`_emptyProtectedRemotes()`, `_isAScoringServer()`, `_scoringServers()`,
`_bestProtectedRemote()` and `_bestServerToUpgrade()`. Roles are implicit:
`_rankedInstallOptions()` keeps generic non-HVT assets off the strongest empty
remote by skipping it, and `_isAScoringServer()` treats a secure remote that
already holds an agenda, scoring upgrade or Ambush as a scoring server.

`_classifyRunnerMacroThreat()` reports whether the visible board is balanced,
HQ-focused, R&D-focused or split (`focus`) and flags non-interactive pressure.
Only tests call it; protection scoring uses the server-specific central
penalties instead, so nothing yet uses `focus`.

Bait and agenda-bluff postures (`_shouldBaitServer()`,
`_remoteDeceptionProfile()`) are cached for an installed card's lifetime and
never end; L8.4 replaces them with bounded epochs.
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
  `_rootSuitability(card, server, role, context)` or equivalent helpers, and
  set the candidate record's `role`.
- Distinguish a server's current observed role from a proposed role after
  installation; a role change is its own candidate with an `opportunityCost`
  (design note), not a side effect.
- Prevent accidental role conflicts, such as ordinary economy consuming the
  only credible scoring remote or random assets entering a scoring server.
- **Central collapse.** Consume `_classifyRunnerMacroThreat().focus`: when it
  is `hq`, `rd` or `centrals` and the focused central is insecure, opening or
  deepening an `economy`, `uncommitted` or `disposable` remote takes an
  `opportunityCost` equal to the best available central candidate's
  `securityGain`, so the remote investment wins only when it is worth more.
  Scoring or winning plans are exempt. Use `focus` only here; server ranking
  already counts the central penalties, and counting them twice is the reason
  `focus` was left diagnostic.
- Integrate the bait and deception profiles as bounded inputs, not dominant
  policy, and use L8.4's epoch boundaries for when a remote's posture, and so
  its role, may change.

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
4. When a remote's bait posture epoch ends (L8.4), repurposing it clears or
   revises the stale deception assumptions, and ICE candidates on it are then
   ranked purely by marginal security (moved from I2).
5. A server's role is inferred only from Corp-visible information: substituting
   hidden Runner Grip cards leaves every role unchanged.
6. With `focus` `rd` and R&D insecure, an economy asset into a new remote ranks
   below an ICE candidate that secures R&D; with `focus` `balanced` on the same
   Corp board, the asset install is chosen.
7. An empty 1-ICE remote left by a used-up economy asset is offered as
   `uncommitted`/`scoring` for an agenda rather than a new remote being opened
   (design note edge case 1).

## Acceptance gate
Non-inferiority gate (I3 mainly makes I4 and I5 possible): candidate
`this.options.remoteRoles` on against I0's baseline, with the standard guards
(design note) and:

- `pointsStolenByServer.hq` plus `pointsStolenByServer.rd`: upper bound at most
  +0.1 points per game (the central-collapse rule must not make centrals worse);
- `pointsStolenByServer.remote`: upper bound at most +0.15 points per game.

## Things to consider
- Recognising a remote as a scoring server because it already holds an agenda,
  scoring upgrade or Ambush is not proof that installing the original card
  there was safe; keep observed role and suitability separate.
- Without L8.4 a posture never ends, so scenario 4 could not be built; that is
  why L8.4 is a dependency rather than an assumption.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] Every root install candidate carries a `role`, and a rejected role/card combination carries a rejection reason naming the conflict.
- [ ] The behaviour change ships behind an AI option that defaults to off (named in the Resolution).
- [ ] Gate evidence is recorded in the Resolution: F4 command, deck pairs, seed count, metrics, baseline vs candidate, and the threshold met. Only then is the option switched on by default.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] The Resolution lists the cards updated in each set in scope and confirms none were missed.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour, including that `_classifyRunnerMacroThreat().focus` is now consumed.
- [ ] `node tests/run-all-tests.js` passes.

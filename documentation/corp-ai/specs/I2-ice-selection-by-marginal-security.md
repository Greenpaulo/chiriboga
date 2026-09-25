# I2 ICE selection by marginal security

**Roadmap item:** I2 · **Depends on:** I1 · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`, `documentation/corp-ai/specs/install-decisions-design.md`

## Goal
Use the completed server-security engine to decide which ICE provides the best
protection on each candidate server, so that the chosen `(ICE, server)` pair
maximizes bounded marginal security rather than following input-card order.
This is the first intentional policy change on the I1 candidate framework.

## Current behaviour
`_iceInstallOptions()` lists affordable ICE in input-card order, then
unaffordable ICE when low-priority options are permitted, filtered only by
optional `AIWorthwhileIce(server, "install")` hooks. The older
`_iceInstallScore()` (printed strength, rez cost, one title-specific
adjustment, compatible breaker) feeds `_bestIceToInstall()`, which the
install-option path does not call, and neither uses `_evaluateServerSecurity()`.
See [architecture.md: install planning today](../architecture.md#install-planning-today).

## Design
Proposed evaluation:

1. Begin with every bounded, strategically relevant `(ICE, server)` candidate
   produced by I1, rather than one server selected in advance.
2. Evaluate each candidate's target server before installation.
3. Evaluate a hypothetical server with the candidate ICE as the new outermost
   layer.
4. Compare deterministic security, hard lockout, mandatory break cost, total
   break/avoidance cost, bypass exposure, structural risk, and protection
   value.
5. Account for install cost, rez affordability, existing unrezzed ICE
   obligations, and credits that must be reserved for other critical servers.
6. Weight the improvement by server value and the consequence of a breach,
   while keeping same-turn multi-server allocation authoritative.

Important distinctions:

- Creating a hard lockout is not equivalent to adding printed strength.
- Increasing optional punishment is useful but must not masquerade as
  deterministic security.
- Subtype diversity matters only through actual public Runner capabilities and
  effective subtype shifts.
- Adding a second layer may be valuable against outermost or one-ICE bypass
  even when raw break cost changes little.
- Expensive unrezzed ICE should not receive full value when the Corp cannot
  afford the route's rez obligations.
- ICE-specific `AIWorthwhileIce` hooks remain valid for mechanics the generic
  evaluator cannot infer, but should reject or modify candidates rather than
  establish their entire ordering.
- When a server has an active bait or bluff posture, ICE selection must respect
  that posture's bounded target depth and credible-light-defense signal.
  Marginal security still ranks candidates within the allowed posture; it must
  not silently choose an ICE whose cost or visible strength makes the intended
  deception deterministic or implausible. Tactical safety overrides the posture
  whenever the lighter choice could enable a game-winning breach.

## Safety and information boundary
Hypothetical outermost-layer evaluation uses only public Runner capabilities
and must not mutate live server contents. Candidate evaluation must be
unchanged when hidden Runner Grip cards are substituted. Unrezzable ICE must
not receive active-security credit.

## Test scenarios
1. Against a publicly installed Fracter only, otherwise comparable Code Gate or
   Sentry ICE outranks an efficiently broken Barrier.
2. An affordable ETR ICE that creates a hard lockout outranks higher
   printed-strength ICE that leaves the route open.
3. A second affordable layer outranks deepening another server when it
   neutralizes public outermost-bypass risk on a valuable remote, subject to
   multi-server safety.
4. ICE that cannot be rezzed within the projected defense budget does not
   receive active-security credit; consume the security evaluator's shared
   unrezzed-ICE budget fix rather than reimplementing it here.
5. An ICE with only optional punishment increases deterrent/tax value but does
   not claim a mandatory lockout.
6. Effective subtype changes and targeted bypass hooks affect hypothetical
   results exactly as they affect installed ICE.
7. Candidate evaluation is unchanged when hidden Runner Grip cards are
   substituted.
8. A bait-postured remote receives an ICE choice consistent with its bounded
   light-defense script, while the same candidates are ranked purely by
   marginal security after the posture ends.
9. A higher-urgency R&D with an existing unrezzed layer does not suppress an
   affordable ICE on a Baker-backdoored, naked Archives when the R&D candidate
   is rejected by the projected defense budget.
10. If the highest-urgency server has no ICE in hand that materially improves
    its outcome, a useful candidate on another insecure server remains
    eligible.

## Acceptance gate
In deterministic fixtures, the selected ICE maximizes the intended bounded
marginal-security value, and seeded simulations reduce preventable breaches
without producing chronic Corp insolvency.

## Things to consider
- Bait-posture interaction: marginal security ranks only within the posture's
  allowed depth and visible-strength envelope; scenario 8 checks both sides of
  the posture ending. Tactical safety still overrides the posture.
- Protection debt versus strategic sacrifice (design note edge case 3): strong
  central protection debt must not outrank an immediate winning agenda line;
  the hard short-circuit belongs to I7.
- Once joint `(ICE, server)` candidates perform legality, affordability and
  marginal-value comparison here, retire `_serverToProtect(..., targetIsEligible)`
  from ordinary ICE-install generation (design note migration step 7).
- Scenario 4 depends on the security evaluator's shared unrezzed-ICE budget
  fix; check its status before raising.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.

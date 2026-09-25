# I4 Agenda installation and scoring commitment

**Roadmap item:** I4 · **Depends on:** I3 · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** `documentation/corp-ai/principles.md`, `documentation/corp-ai/specs/install-decisions-design.md`

## Goal
Decide whether a specific agenda should be committed now, to which server, and
with what completion plan, using explicit safety and consequence checks instead
of purely relative scoring-server qualification.

## Current behaviour
`_isHVT()` treats agendas, Ambush and Hostile cards as high-value targets,
which normal install generation offers to scoring servers ranked mainly by the
gap between advancement requirement and `_scoringWindow()`, plus
`_deceptionInstallDistance()`. `_isAScoringServer()` normally compares a
remote's protection score with HQ, so a breachable remote can qualify when HQ
is also weak.
See [architecture.md: install planning today](../architecture.md#install-planning-today).

## Design
- Replace purely relative scoring-server qualification with explicit safety and
  consequence checks.
- Use agenda points, advancement requirement, remaining clicks, available
  advancement effects, fast-advance tools, future credit requirements, and
  breach consequences.
- Require a plausible scoring sequence or an explicitly bounded bluff posture.
- Reserve credits and clicks needed to complete or defend the plan.
- Preserve emergency agenda-flood handling, but label and score its additional
  risk rather than treating it as ordinary scoring.
- Give game-winning scores and game-losing steals authoritative tactical
  treatment.

Known issue to address: a remote should not qualify for agenda installation
merely because HQ is equally weak. Relative protection remains useful, but
deterministic security, expected breach cost, agenda value, and time exposed
must be considered directly.

## Safety and information boundary
Game-winning scores and game-losing steals are hard tactical constraints, not
score components. Agenda bluff profiles never create a naked agenda server and
never risk the winning steal.

## Test scenarios
1. An insecure remote is rejected for a game-losing agenda even when HQ has a
   lower protection score.
2. A deterministically secure remote with a matching advancement window accepts
   the agenda.
3. A fast-advance line chooses the agenda it can complete rather than a
   higher-value agenda it must expose.
4. Agenda flood permits a controlled higher-risk install only when alternatives
   such as scoring, operation play, or safe discard are worse.
5. Match-winning scoring lines override ordinary economy and deception
   preferences.
6. Agenda bluff profiles never create a naked agenda server and never risk the
   winning steal.

## Acceptance gate
Deterministic tests cover safe scoring, forced risk, fast advancement, agenda
flood, match point, and deception; seeded games reduce avoidable agenda steals
without suppressing viable scoring.

## Things to consider
- The deception system varies desired ICE depth and advancement cadence once a
  root card is involved, but it does not compare installing an agenda against
  an ambush, economy or declining to commit; I4 must consume it as a bounded
  input rather than duplicate it.
- The "derelict remote" edge case (design note) affects whether an existing
  1-ICE remote is considered for agendas.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.

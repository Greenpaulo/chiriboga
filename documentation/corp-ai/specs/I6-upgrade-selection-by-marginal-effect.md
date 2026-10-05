# I6 Upgrade selection by marginal effect

**Roadmap item:** I6 · **Depends on:** I3, I4, F4 · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`, `documentation/corp-ai/specs/install-decisions-design.md`
**Verified against code:** 376f32c (2026-09-25)

## Goal
Choose an upgrade and destination by measuring what it changes on that server,
so that upgrades go where they alter the breach, access or scoring outcome
rather than simply to the weakest raw score.

## Current behaviour
Upgrade installation uses `_bestServerToUpgrade()`,
`_shouldUpgradeServerWithCard()` and `_upgradeInstallPreferences()` with
hooks and flags including `AIIsScoringUpgrade`, `AIDefensiveValue(server)`,
`AILimitPerServer(server)`, uniqueness and Region restrictions. A scoring
upgrade requires `_isAScoringServer()`, which now includes the security floor.
These filter invalid or low-value placements and can direct an upgrade to a
comparatively weak server, but do not compare the server before and after the
upgrade.
See [architecture.md: install planning today](../architecture.md#install-planning-today).

## Design
- Evaluate security and access consequences before and after hypothetical
  upgrade installation through `_hypotheticalServerAfterInstall()` (root
  placement), scoring with the design note's `securityGain`.
- Model breach prevention, access taxes, additional advancement value, scoring
  acceleration, and card-specific server restrictions through hooks.
- A scoring upgrade needs an I3 `scoring` role and an I4 completion plan on
  that server; this is why I6 depends on both.
- Enforce uniqueness, Region, and per-server limits as hard legality
  constraints.
- Reserve rez and ability costs where required (`reserveCost`, including
  `AIReserveCredits`).
- Compare installing the upgrade before versus after the protected agenda or
  asset when information exposure and click order matter.

## Safety and information boundary
Region, uniqueness and per-server limits are hard legality constraints and are
never softened into score penalties. An unaffordable defensive upgrade is not
credited as active defense. Hypothetical upgrade installation must not mutate
the live server.

## Test scenarios
1. A breach-preventing upgrade goes to the server where it changes the breach
   outcome, not simply the weakest raw score.
2. A scoring upgrade is rejected from a server with no I4 completion plan.
3. Region and uniqueness conflicts are never softened into score penalties.
4. An unaffordable defensive upgrade is not credited as active defense.
5. An access-tax upgrade can still receive bounded value when it does not
   establish security.

## Acceptance gate
Non-inferiority gate (upgrades are a small share of installs): candidate
`this.options.upgradeMarginalEffect` on against I0's baseline, with the
standard guards (design note) and `pointsStolenByServer.remote` upper bound at
most +0.1 points per game.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] The behaviour change ships behind an AI option that defaults to off (named in the Resolution).
- [ ] Gate evidence is recorded in the Resolution: F4 command, deck pairs, seed count, metrics, baseline vs candidate, and the threshold met. Only then is the option switched on by default.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] The Resolution lists the cards updated in each set in scope and confirms none were missed.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.

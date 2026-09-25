# I0 Baseline capture and telemetry

**Roadmap item:** I0 · **Depends on:** F4 · **Sets:** none
**Read first:** `documentation/corp-ai/principles.md`, `documentation/corp-ai/specs/install-decisions-design.md`

## Goal
Establish current install behaviour and a measurable baseline before changing
priorities, so that later I items can distinguish intended from unintended
changes in candidate order and selected option.

## Current behaviour
`_rankedInstallOptions()` builds install preferences from independently
generated option groups whose effective priority comes largely from
concatenation order, and `_bestInstallOption()` selects the first generated
preference matching a legal engine option. There is no opt-in structured
record of the candidates considered, the servers skipped, or why.
See [architecture.md: install planning today](../architecture.md#install-planning-today).

## Design
- Reuse the seeded batch harness specified by F4 rather than create a second
  simulation path.
- Add opt-in structured logging around `_rankedInstallOptions()` and
  `_bestInstallOption()`.
- Record candidate card, destination, generated category/reason,
  affordability, chosen option, current server protection score, and
  deterministic security result.
- Record higher-ranked servers skipped during install generation and the exact
  feasibility reason: illegal destination, layer-policy rejection, install
  cost, projected rez shortfall, existing unrezzed obligations, or no
  materially useful candidate. This must distinguish "the server is urgent"
  from "the current hand contains an executable response."
- Record the immediate outcome of important root commitments: agenda
  scored/stolen, trap fired, asset used/trash-before-payoff, upgrade used, or
  server abandoned.
- Create deterministic fixtures for representative hands and boards across the
  playable sets (`documentation/card-sets.md`).

## Safety and information boundary
Logging must not inspect hidden Runner card identities, alter decisions,
consume randomness, or remain enabled by default.

## Test scenarios
1. Fixed test states produce stable snapshots of the current candidate order
   and selected option.
2. Enabling logging does not change the selected option or consume randomness
   compared with the same state with logging disabled.
3. A skipped higher-ranked server is recorded with its exact feasibility
   reason, distinguishing urgency from the absence of an executable response.

## Acceptance gate
Fixed test states produce stable snapshots of the current candidate order and
selected option, sufficient to identify intended and unintended changes in
later phases.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.

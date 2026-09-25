# L4.1 Unified bypass capability allocation

**Roadmap item:** L4.1 · **Depends on:** F2 · **Sets:** playable sets (`documentation/card-sets.md`), including Baker
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`
**Verified against code:** 376f32c (2026-09-25)

## Goal
Replace the separate targeted, outermost, one-shot and redirect checks with one normalized capability model, so the evaluator allocates all public bypass tools across the complete run instead of optimizing each mechanic class independently.

## Current behaviour
See [architecture: type shifts, bypasses and redirects](../corp-ai/architecture.md#type-shifts-bypasses-and-redirects). Verified details:

- Targeted paid bypasses: `_iceBypassCost()` reads `AIBypassesIce` (or the older `AIBypassCost`, declared only in `rebellion.js`, which is not playable), with a card-text fallback; `_iceIsBypassed()` compares that cost with the scalar `_effectiveRunnerCreditPool(server).total`. Playable declarer: Femme Fatale (`systemupdate2021.js`).
- Once-per-run and outermost bypasses: `_oneShotIceBypassTarget()` reads `AIBypassesOneIce` (playable declarer: Fransofia Ward, `elevation.js`) and picks the single most expensive covered ICE; `_outermostIceBypassAvailable()` reads `AIBypassesOutermostIce`, which no card currently declares. `_serverStructuralRisk()` uses both to penalise one-ICE agenda remotes.
- Redirects: `_archivesIsBackdoorToHQ()` asks `AIRedirectsRun(corp.archives, corp.HQ)`, plus a wording fallback. It is the only redirect question the Corp asks. Declarers: Sneakdoor Beta (`systemupdate2021.js`), Maintenance Access (`elevation.js`), Baker (`vantagepoint.js`).
- Baker's `AIRedirectsRun` calls its own `_stealthCreditCards(planningServer)`, which supplies `attackedServer` under a card-local `try/finally`. F2 migrates that probe to `_withHypothetical()` or a shared run-context wrapper.
- Each class is evaluated on its own; nothing stops two classes claiming the same card, and finite uses are not allocated across layers.

## Design
- **Capability contract:** introduce a declarative hook `AIBypassCapabilities(server)` that returns capability objects describing:
  - scope (`ice`, `outermost`, `any-one-ice` or `server-redirect`);
  - eligible target or target predicate;
  - credit cost and any non-credit cost (trash, counters, clicks, once-per-turn usage);
  - number of available uses and whether use persists across encounters;
  - source and destination servers for redirects.
- **Normalization and compatibility:** add `_runnerBypassCapabilities(server)` to normalize the new objects and adapt the existing `AIBypassesIce`, `AIBypassesOneIce`, `AIBypassesOutermostIce` and `AIRedirectsRun` hooks. Keep those hooks as compatibility shims until scoped cards have migrated.
- **Run-wide allocation:** add `_allocateBypassesForServer(server, capabilities)` to assign finite-use capabilities to ICE layers jointly. Optimize for the cheapest path through mandatory effects first, then total punishment avoided. Never spend the same card, counter or once-per-run ability twice. An outermost-only capability targets the first relevant encounter after unaffordable unrezzed ICE is skipped; an any-one-ICE capability may be saved for a more expensive inner lockout.
- **Payment ownership (with L6.1).** This item decides *which* bypass is used *where*, and emits each chosen capability's credit cost as a payment demand tagged with its source card. It does not decide which Runner credit sources may pay that demand: until L6.1 lands, demands are compared with `_effectiveRunnerCreditPool(server).total` exactly as `_iceIsBypassed()` does today. L6.1 (which depends on this item) replaces that scalar comparison with its allocator.
- **Baker and F2.** Migrate Baker's redirect to `AIBypassCapabilities` using F2's shared run-context wrapper; do not reintroduce a card-local `try/finally`. F2's Baker scenarios must still pass unchanged.
- **Cost fidelity:** preserve the distinction between a hard lockout and an unaffordable soft lockout. A finite bypass cost proves the Runner has a capability even when current credits cannot pay for it. Optional bypasses must not add mandatory cost when simply letting the ICE fire is cheaper.
- **Card migration:** migrate bypass and redirect cards in the scoped sets to the new hook format, including Baker in `sets/vantagepoint.js`.

## Safety and information boundary
- Build capabilities only from public, active Runner cards and public state. Hidden Grip events remain the responsibility of the Layer 5 public threat estimator.
- Redirects paid by run-only credit sources must be evaluable during Corp-turn planning without requiring or leaking a live run state.

## Test scenarios
1. Two one-use bypass tools are allocated to two different ICE and are never double-spent.
2. An outermost-only bypass skips the first relevant encounter, including when an unrezzable outer ICE is passed without encounter.
3. An any-one-ICE bypass is saved for an inner hard lockout when the outer ICE has no mandatory effect.
4. A paid targeted bypass produces a soft credit lockout when unaffordable and is ignored when taking the subroutines costs less.
5. A server redirect compares the complete source-server route with the direct destination route without counting destination ICE twice.
6. Capability results do not change when hidden Runner Grip contents change without a corresponding public-state change.
7. A redirect paid by a run-only public credit source is detected during Corp-turn planning through F2's wrapper, without requiring or leaking a live run state.
8. In every scenario above, the allocated route cost is never lower than the cheapest legal assignment found by exhaustive enumeration in the test (each finite use at most once, scope rules respected).

## Acceptance gate
Not F4-gated: the allocator has a deterministic oracle, so correctness is shown by tests rather than seeded games. Adopt the unified allocator only when all of these hold:

- every existing Layer 4 regression in `tests/corp-server-security.test.js` passes unchanged;
- in each combined-bypass scenario, the route cost is no higher than the current per-class heuristic's and never cheaper than the legal traversal (scenario 8);
- decision snapshots (`tests/decision-snapshots.test.js`, `tests/corp-decision-fixtures.test.js`) are identical to the recorded baseline except for listed deltas, each justified by a combined or finite-use bypass the old heuristic mis-allocated.

The current hooks remain as compatibility shims during migration.

## Things to consider
- F2 and this item both change Baker's `AIRedirectsRun`; F2 lands first so this item builds on the shared wrapper instead of rewriting the card-local probe twice.
- Allocating finite-use bypasses and allocating shared strength-reducer counters (L9) are the same kind of problem; keep the allocator general enough to reuse.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] Decision snapshots are identical to the recorded baseline except for deltas listed and justified in the Resolution.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] The Resolution lists the cards updated in each set in scope and confirms none were missed.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.

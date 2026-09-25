# L4.1 Unified bypass capability allocation

**Roadmap item:** L4.1 · **Depends on:** none · **Sets:** playable sets (`documentation/card-sets.md`), including Baker
**Read first:** `documentation/corp-ai/principles.md`

## Goal
Replace the separate targeted, outermost, one-shot and redirect checks with one normalized capability model, so the evaluator allocates all public bypass tools across the complete run instead of optimizing each mechanic class independently.

## Current behaviour
Targeted paid bypasses use `AIBypassesIce`; reusable single-encounter and outermost-only bypasses use `AIBypassesOneIce` and `AIBypassesOutermostIce`; server redirects use `AIRedirectsRun` plus a generic wording fallback. Each class is evaluated on its own, and Baker's `AIRedirectsRun` evaluates run-only credit sources in a prospective Archives-run context under a card-local `try/finally`. See [architecture: type shifts, bypasses and redirects](../corp-ai/architecture.md#type-shifts-bypasses-and-redirects).

## Design
- **Capability contract:** introduce a declarative hook `AIBypassCapabilities(server)` that returns capability objects describing:
  - scope (`ice`, `outermost`, `any-one-ice` or `server-redirect`);
  - eligible target or target predicate;
  - credit cost and any non-credit cost (trash, counters, clicks, once-per-turn usage);
  - number of available uses and whether use persists across encounters;
  - source and destination servers for redirects.
- **Normalization and compatibility:** add `_runnerBypassCapabilities(server)` to normalize the new objects and adapt the existing `AIBypassesIce`, `AIBypassesOneIce`, `AIBypassesOutermostIce` and `AIRedirectsRun` hooks. Keep those hooks as compatibility shims until scoped cards have migrated.
- **Run-wide allocation:** add `_allocateBypassesForServer(server, capabilities)` to assign finite-use capabilities to ICE layers jointly. Optimize for the cheapest path through mandatory effects first, then total punishment avoided. Never spend the same card, counter or once-per-run ability twice. An outermost-only capability targets the first relevant encounter after unaffordable unrezzed ICE is skipped; an any-one-ICE capability may be saved for a more expensive inner lockout.
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
7. A redirect paid by a run-only public credit source is detected during Corp-turn planning without requiring or leaking a live run state.

## Acceptance gate
Adopt the unified allocator only if all existing Layer 4 regressions remain unchanged and combined bypass scenarios produce a traversal cost no higher than the current per-class heuristic. Keep the current hooks as the fallback during migration.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.

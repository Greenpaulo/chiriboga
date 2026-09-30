# Backlog Ticket: Layer 4.1 — Unified Bypass Capability Allocation

**Source:** `documentation\corp-ai\roadmaps\corp_ai_improvement_roadmap.md`

## Scope

Replace individual targeted, outermost, one-shot, and redirect checks with a normalized capability model (`AIBypassCapabilities(server)`) in `ai_corp.js`.

## Requirements

1. **Hook & Normalization**:
   - Implement `AIBypassCapabilities(server)` hook returning capability objects (scope, target predicate, credit/non-credit cost, available uses, persistence).
   - Add `_runnerBypassCapabilities(server)` to normalize existing `AIBypassesIce`, `AIBypassesOneIce`, `AIBypassesOutermostIce`, and `AIRedirectsRun` hooks as compatibility shims.
2. **Joint Allocation Logic (`_allocateBypassesForServer`)**:
   - Optimize for cheapest mandatory path first, then total punishment avoided.
   - Prevent double-counting cards, counters, or once-per-run abilities.
   - Position outermost capabilities to the first relevant encounter after skipping unaffordable unrezzed ICE.
3. **Safety & Information Boundary**:
   - Rely solely on public active Runner cards and public state.

## Required Card & Documentation Updates

- Migrate targeted cards across `/sets/systemgateway.js`, `/sets/systemupdate2021.js`, and `/sets/elevation.js` to the new hook format.
- Document `AIBypassCapabilities` in `documentation/ai.md`.
- Update the main Corp AI roadmap doc.

## Acceptance Criteria

- [ ] Two single-use bypass tools are allocated to different ICE and never double-spent.
- [ ] Outermost-only bypasses correctly skip the first relevant encounter (even with unrezzable outer ICE).
- [ ] Paid targeted bypasses produce soft lockouts when unaffordable and are ignored if taking subroutine hits is cheaper.
- [ ] Server redirects compare direct destination routes without double-counting destination ICE.

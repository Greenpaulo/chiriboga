# Corp AI finding 8: Reserved credits use title tables and skip central-server roots

**Status:** Implemented; ready for code review (2026-09-23).

**Source:** `documentation/backlog/corp_ai_review_findings.md`, item 8.
**File:** `ai_corp.js` — `_sufficientEconomy()` (~3153) and `_iceWorthRezzing()` (~3672). Line numbers drift; search by function name.
**Belongs in:** Bug half → bug ticket under `documentation/bugs/`. Design half → Install roadmap, new `#### Phase 5.1: Declarative Reserved-Credit Hook [PROPOSED]`, before Phase 6. Document the hook in `documentation/ai.md` when it ships.
**Suggested order:** Step 2 of 5 for the bug half; Step 5 of 5 for the design half.
**Depends on:** Design half benefits from the hook-over-titles work in finding 13.

---

## Review of the proposal

The title-table diagnosis was correct, but the claimed central-root bug was not.
`_sufficientEconomy()` first calls `InstalledCards(corp)`, which includes the
roots and ICE of HQ, R&D, Archives, and every remote. Its generic `CheckRez`
pass therefore already reserves an unrezzed _Hokusai Grid_ or _Crisium Grid_
on a central server.

The remote-only `rootUseCosts` pass was instead double-counting the printed rez
costs of _Manegarm Skunkworks_, _Hokusai Grid_, _SanSan City Grid_, and
_Crisium Grid_. It also continued reserving those costs after the cards were
rezzed, even though none has a paid ability. Conversely, it assigned zero to
_Anoetic Void_, whose defensive ability actually costs 2 credits.

The proposed `AIReserveCredits(server)` abstraction is still the right design
when its contract is narrowed to **post-rez ability spending**. Printed rez
costs remain the responsibility of the existing generic logic. This avoids
both double counting and requiring every rezzable card to repeat its printed
cost in an AI hook.

Review also found that `_iceWorthRezzing()`'s hard-coded Snare entry had become
ineffective for a same-server comparison: it was represented as a pretend ICE
with `value: Infinity`, but the current same-server branch only compares equal
server values. A declared credit reserve is now represented explicitly and
takes priority when the Corp can afford either the reserve or the approached
ICE, but not both.

## Implemented fix

- Added the sanitized `_reserveCreditsForCard(card, server)` consumer and
  removed both title tables.
- `_sufficientEconomy()` now adds declarations from installed cards after its
  existing central-and-remote rez-cost pass.
- `_iceWorthRezzing()` reads declarations from the attacked server's root and,
  for centrals, `server.cards`.
- Added state-sensitive hooks for:
  - _Aggressive Secretary_: 2 credits when installed and advanced;
  - _Project Junebug_: 1 credit when installed and advanced;
  - _Snare!_: 4 credits when it can be accessed outside Archives, including
    HQ/R&D central cards;
  - _Anoetic Void_: 2 credits when its existing `AIWouldTrigger()` policy says
    the Corp would use it.
- Did not add hooks to _Manegarm Skunkworks_, _Hokusai Grid_, _SanSan City
  Grid_, or _Crisium Grid_: their listed values were rez costs, already handled
  generically, rather than additional spending.
- Documented the hook and its ownership boundary in `documentation/ai.md`.

## Tests / acceptance criteria

- [x] Central _Crisium Grid_ / _Hokusai Grid_ rez costs are reserved by the
  generic installed-card pass and are not double-counted in a remote.
- [x] A synthetic future card's hook affects both economy and ICE-rez planning
  without a title check or another `ai_corp.js` edit.
- [x] _Snare!_ reserves 4 outside Archives and zero in Archives.
- [x] Hook values are deterministic, state-sensitive, and match actual ability
  spending rather than printed rez costs.
- [x] `node tests/corp-server-security.test.js` passes (115 cases).
- [x] `node tests/run-all-tests.js` passes: 21 test files, including 10 Corp
  decision fixtures and 9 decision snapshot tests.

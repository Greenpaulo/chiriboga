# Corp AI finding 8: Reserved credits use title tables and skip central-server roots

**Source:** `documentation/backlog/corp_ai_review_findings.md`, item 8.
**File:** `ai_corp.js` — `_sufficientEconomy()` (~3153) and `_iceWorthRezzing()` (~3672). Line numbers drift; search by function name.
**Belongs in:** Bug half → bug ticket under `documentation/bugs/`. Design half → Install roadmap, new `#### Phase 5.1: Declarative Reserved-Credit Hook [PROPOSED]`, before Phase 6. Document the hook in `documentation/ai.md` when it ships.
**Suggested order:** Step 2 of 5 for the bug half; Step 5 of 5 for the design half.
**Depends on:** Design half benefits from the hook-over-titles work in finding 13.

---

## Problem

- `rootUseCosts` is a 13-title table. Non-zero costs: _Aggressive Secretary_ 2, _Project Junebug_ 1, _Snare!_ 4, _Manegarm Skunkworks_ 2, _Hokusai Grid_ 2, _SanSan City Grid_ 6, _Crisium Grid_ 3.
- Its loop walks only `corp.remoteServers[i].root`, so central-server upgrades such as _Hokusai Grid_ and _Crisium Grid_ never reserve credits.
- `_iceWorthRezzing()` hardcodes _Snare!_ = 4 again in `costyAmbushes`, and that one does inspect `server.cards`.

## Fix — bug half (do first)

- Walk central-server roots too (not just `corp.remoteServers[i].root`).
- Keep the change small; this is the bug ticket.

## Fix — design half

- Add `AIReserveCredits(server) -> number`, sitting beside `AIPunishesAccess`.
- Both consumers (`_sufficientEconomy()` and `_iceWorthRezzing()`) read it, and the title tables go away.
- Document the hook in `documentation/ai.md` when it ships.

## Tests / acceptance criteria

- Bug half: a _Crisium Grid_ / _Hokusai Grid_ on a central server reserves credits.
- Design half: the reserve value comes from the card, not a title table; a new-set card with the hook is reserved for without an `ai_corp.js` edit.
- The value is deterministic and matches what the card would actually spend.

# Code Review: `4556eff` — Corp AI finding 8 (reserved credits)

**Repo:** Greenpaulo/chiriboga
**Commit:** [`4556eff`](https://github.com/Greenpaulo/chiriboga/commit/4556eff44ff222894c2dee4ff02d4653e736381c)
**Ticket:** `documentation/backlog/code-review/corp_ai_finding_08_reserved_credits.md`

> Note: GitHub's web diff truncated before showing the `sets/systemgateway.js`, `sets/systemupdate2021.js`, and `tests/corp-server-security.test.js` hunks, even though they were listed in the file tree. I pulled the full patch directly (`commit.patch`) to review those too, plus the actual `cardText` for every card this commit touches, rather than taking the ticket's summary of each hook at face value.

## Verdict

Approve. This is a case where the ticket's own "Review of the proposal" section already caught that the *diagnosed* central-root bug wasn't real, and narrowed the fix to what actually mattered (double-counted rez costs, a missed ability cost, and a same-server comparison that had gone dead). The implementation matches that narrowed scope precisely, and — importantly — every new `AIReserveCredits` hook matches the card's actual ability text, not just the ticket's paraphrase of it.

## Core mechanism

```js
_reserveCreditsForCard(card, server) {
  if (!card || typeof card.AIReserveCredits != "function") return 0;
  var reserve = Number(card.AIReserveCredits.call(card, server));
  if (!isFinite(reserve)) return 0;
  return Math.max(0, reserve);
}
```
Good defensive sanitization for a hook that any card file can declare: non-function, `NaN`, `Infinity`, and negative values are all neutralized rather than propagating into economy math. This matches the stated intent ("keep malformed third-party hooks from poisoning economy comparisons") and is the kind of thing that's easy to skip and annoying to debug later if skipped.

**`_sufficientEconomy()`** now sums `_reserveCreditsForCard` over the same `installedCards` list already used for the generic rez-cost pass, instead of a separate remote-only title table. This is the right fix for the diagnosis in the ticket: rez costs stay owned by the existing generic logic, `AIReserveCredits` is purely additive post-rez spending, and centrals and remotes go through one consistent path instead of two.

**`_iceWorthRezzing()`** replaces the hardcoded `{title: "Snare!", cost: 4, value: Infinity}` pretend-ICE entry with a loop over `server.root` and `server.cards` (centrals) calling `_reserveCreditsForCard` generically. The real fix here, and the one most likely to have gone unnoticed without the ticket's review pass, is this:
```js
if (
  isCreditReserve ||
  (!sameServer && valueToCompare > thisServerValue && this._iceWouldSecureServer(...))
)
```
The old Snare entry had `value: Infinity` but was compared under a branch gated by `!sameServer` — so a same-server Snare (the common case: Snare installed behind the ICE being evaluated) could never actually win the comparison, no matter how high its value. Adding `isCreditReserve ||` up front makes any declared reserve take priority unconditionally, which is what the ticket's diagnosis called for. This is a real behavioral fix, not just a refactor.

## Verified each new hook against actual card text

I checked `cardText`/ability implementation for all four newly-hooked cards rather than trusting the ticket's one-line description:

| Card | Hook | Checked against |
|---|---|---|
| Aggressive Secretary | `CheckCounters(this, "advancement", 1)` gate, returns 2 | `automaticOnAccess.Resolve` requires an advancement counter (no rezzed condition) — matches |
| Project Junebug | same shape, returns 1 | same pattern, same gate — matches |
| Anoetic Void | reuses existing `this.AIWouldTrigger()`, returns 2 | `AIWouldTrigger()` doesn't itself check credits, so reserving 2 alongside it is additive, not a double-check — correct reuse, avoids duplicating the ambush/HQ-size/cards-in-server logic that already lives there |
| Snare! | `server == corp.archives` excluded, returns 4 elsewhere it appears in `root` or `cards` | `cardText`: *"the Runner accesses this asset anywhere except in Archives, you may pay 4 credits"* — **no unrezzed condition**, so reserving unconditionally on rez state (which the hook does — it never checks `this.rezzed`) is actually correct, not an oversight. Worth calling out because it'd be a reasonable-looking bug to suspect at a glance. |

That Snare! check is worth a specific mention: my first read of the hook assumed it should gate on `this.rezzed` (most ambush cards only threaten while unrezzed), and it doesn't. Went to the actual card definition to check, and the real text has no unrezzed clause — every access outside Archives pays out regardless of rez state — so the implementation is correct as written.

## Minor points

1. **Mixed line endings introduced.** `ai_corp.js`, `sets/systemgateway.js`, and `sets/systemupdate2021.js` are otherwise CRLF, but the newly added/edited lines in this commit are LF-only (confirmed with `file` — these three now report "with CRLF, LF line terminators"). Cosmetic, but worth a `.gitattributes` rule or an editor EOL setting fix so future diffs in these files don't get noisy re-termination churn around every edit (the `ai_corp.js` diff already shows a few no-op `-`/`+` pairs that are pure line-ending changes, not real edits).
2. **No test exercises a card returning a negative or `NaN` reserve.** `_reserveCreditsForCard`'s sanitization is the main defensive addition in this commit, but the test suite only exercises well-behaved hooks (`return 3`, `return 2`, etc.). A quick case asserting a malformed hook (`() => -5` or `() => NaN`) is clamped to `0` would directly protect the one bit of new logic that isn't just "sum a value that's already known-good."
3. **`_iceWorthRezzing`'s central-card check silently returns nothing for a server with no `.cards`.** `typeof server.cards != "undefined"` guards it correctly for remotes, so this is fine — just noting it's relying on remotes genuinely lacking a `.cards` property rather than having it as `undefined`/empty array; worth being sure that invariant holds everywhere `_iceWorthRezzing` is called from, since a remote with a stray `.cards = []` would silently double up (harmlessly, since it'd just be empty, but worth a beat of thought if any refactor ever changes server object shape).

## Test coverage

`tests/corp-server-security.test.js` gets three well-targeted new cases:
- central Hokusai/Crisium rez costs reserved once via the generic pass, confirmed not double-counted when the same card also sits in a remote (`corp.creditPool` threshold flips exactly at the expected value)
- a synthetic `AIReserveCredits` hook on a fake card drives both `_sufficientEconomy()` and `_iceWorthRezzing()` without any title check — this is the test that actually proves the "no title table" design goal, not just the arithmetic
- Snare! reserves 4 from R&D, 0 from Archives — matches the corrected card text above

This maps cleanly onto the ticket's acceptance criteria (central rez costs not double-counted, a synthetic hook working without a title check, Snare's Archives exemption, deterministic/state-sensitive values) — all covered.

## Docs

`documentation/ai.md` gets a new §5.10 for `AIReserveCredits`, with a clear statement of the hook's boundary ("do not include a card's rez cost — `_sufficientEconomy()` already gathers that generically"). That boundary is exactly what the old title-table bug violated, so documenting it explicitly here is the right call to stop it recurring.

# Runner: any credit spent during a run silently drains Touchstone (or any hosted-credit source) first, with no choice given to the player

**Suggested location:** `documentation/bugs/` (move to `documentation/bugs/done/` once merged).
**Source log:** `documentation/debug-logs/any_cred_spent_during_run_is_removed_from_touchstone_no_choice_given.txt`
**File:** `mechanics.js` (root cause), `sets/vantagepoint.js` (Touchstone's over-broad `canUseCredits`). Line numbers are from `main` at `512a8f3`, 2026-09-24, and will drift; search by function name.
**Status:** Diagnosed, not yet fixed.

---

## 1. Summary

Every time the Runner pays a credit cost during a run in this log — breaking a subroutine with Marjanah, pumping Marjanah's strength, stealing an agenda — the very first credit of that cost is silently pulled from Touchstone's hosted credit instead of the Runner's credit pool, with no prompt and no way to decline:

```
1 credit placed on Touchstone
...
Using Marjanah:
Runner spent one credit from Touchstone
Marjanah gets +1 strength
Using Marjanah:
Runner spent one credit
Marjanah gets +1 strength
```

This isn't a Touchstone-specific special case and it isn't Marjanah-specific either. It's the generic cost-payment function, `SpendCredits()` in `mechanics.js`, which was rewritten to "automatically use extra credit sources when available" and had its player-facing choice step commented out rather than removed:

```js
function SpendCredits(player, num, doing = "", card = null, afterSpend, context) {
  //new version of this function just automatically uses extra credits sources when available
  ...
  //second, card-hosted credits
  if (num > 0) {
    var activeCards = ActiveCards(player);
    for (var i = 0; i < activeCards.length; i++) {
      if (typeof activeCards[i].credits !== "undefined") {
        if (typeof activeCards[i].canUseCredits === "function") {
          if (activeCards[i].canUseCredits(doing, card)) {
            var spendCred_card = Math.min(num, activeCards[i].credits);
            ...
```

Any card with a numeric `.credits` property and a `canUseCredits(doing, card)` hook that returns `true` gets drained, in `ActiveCards()` order, before the credit pool is touched at all — for *any* cost, not just ones the card's own text says it can pay. Touchstone is the card this bites hardest, because its `canUseCredits` doesn't even look at what's being paid for:

```js
// sets/vantagepoint.js
canUseCredits: function () {
  return attackedServer !== null;
},
```

`attackedServer !== null` is true for the entire duration of a run, so Touchstone will fund the very first credit spent on *anything* during a run — a pump, a break, a trash cost, a steal cost — whichever happens first, regardless of whether the player would rather have kept it.

That matters beyond convenience here: Touchstone is subtyped `Stealth`, and this same deck's Baker specifically requires its 1-credit Archives→HQ/R&D redirect to be **"paid only from stealth cards"** (`sets/vantagepoint.js`, Baker's `_stealthCreditCards()`/`responseOnWouldApproachServer`). Baker's own redirect payment is implemented correctly and separately from `SpendCredits()` — it enumerates the Runner's stealth-credit sources and opens a real `DecisionPhase` to choose one when more than one qualifies. But if `SpendCredits()` has already spent Touchstone's only hosted credit on an unrelated Marjanah pump earlier in the same run (as happens repeatedly in this log), Baker's redirect option silently disappears (`_stealthCreditCards()` returns empty), because there's no stealth credit left to offer — not because the player chose to spend it there, but because the engine spent it for them before they ever got a say.

---

## 2. What happened in the log

The same pattern repeats identically across three near-duplicate replays in the log (rewinds around lines 583-654, 627-684 pre-truncation, and 715-748):

```
Runner spent one click
Runner spent 2 credits
Played Tailgate
1 credit placed on Touchstone          <- Touchstone's once-per-turn trigger fires
Run initiated attacking HQ
...
Encountering Semak-samun
Using Marjanah:
Runner spent one credit from Touchstone   <- first credit of the pump auto-taken from Touchstone
Marjanah gets +1 strength
Using Marjanah:
Runner spent one credit                    <- Touchstone now empty, falls through to the pool
Marjanah gets +1 strength
Using Marjanah:
Runner spent one credit
Subroutine End the run unless the Runner suffers 3 net damage. broken
```

Touchstone only ever holds 1 credit at the point these costs are paid (it gains at most 1 per turn, from the "first event played" trigger), so the pattern is always "first credit from Touchstone, everything else from the pool" — consistent with `SpendCredits()` walking `ActiveCards()` and finding Touchstone with exactly 1 credit available before it runs out and falls through to `CreditPoolCanBeUsed(...)`.

At no point in the log is the player asked whether they want to spend from Touchstone, and there's no mechanism visible in the log for declining it — which matches the code: the choice-based `DecisionPhase` version of this function (see §3) is present only as a dead, commented-out block.

---

## 3. Root cause

**Where:** `SpendCredits()`, `mechanics.js` lines 1218-1373.

The function pays a cost in a fixed, automatic order with no player input at any step:

1. Temporary credits (bad publicity credits) — automatic, uncontroversial.
2. **Every active card with a `.credits` property whose `canUseCredits(doing, card)` returns true** — walked in `ActiveCards()` order (own installed cards first, then own identity/resolving cards; see `utility.js:3183-3208`), draining each until the cost is covered.
3. Whatever remains from the credit pool.

Step 2 is where the choice went missing. The function's own comment marks this as a deliberate rewrite ("new version... automatically uses extra credits sources when available"), and the previous, choice-driven implementation is still sitting in the file as a dead comment block (lines ~1299-1372): it built an `Enumerate`/`Resolve` `DecisionPhase` ("Spend recurring credits") offering `"Use N credits from <card>"` options for every eligible hosted-credit source, up to `num`, and only fell through to the pool once the player was done choosing. That phase is fully preserved in the comment but never runs.

Two things compound this:

- **`canUseCredits()` is a yes/no gate on *whether a source is eligible*, not a signal that the player wants to use it.** It was designed to answer "can this card's credits legally pay for `doing`" (see the parameter doc in `decks.js:19`), not "should this card's credits be spent right now instead of the pool." `SpendCredits()` treats "eligible" as "spend it," collapsing the two.
- **Touchstone's `canUseCredits` is unusually permissive by design** — the card's own text ("You can spend hosted credits during runs") is meant to open it up as an option for *any* run cost, not to make it mandatory-first for any run cost. Implemented as `attackedServer !== null` with no reference to `doing`/`card` at all, it has no way to defer to a different cost or to the pool; combined with `SpendCredits()`'s auto-drain, "optional, usable during runs" became "mandatory, spent on whatever comes first."

Contrast with Baker's redirect cost (`sets/vantagepoint.js`, `responseOnWouldApproachServer.Resolve`), which does not call `SpendCredits()` at all — it has its own `_stealthCreditCards()` enumeration and its own `DecisionPhase` when more than one stealth source qualifies. That code path still respects player choice; it's just disconnected from, and vulnerable to, whatever `SpendCredits()` already spent earlier in the same run.

---

## 4. Proposed fixes

1. **Restore a choice step in `SpendCredits()` for hosted/recurring credit sources**, using the existing commented-out `DecisionPhase` implementation as a starting point rather than writing it from scratch. At minimum, when more than one eligible source (including the pool) could cover the cost, ask; when there's exactly one non-pool source and the pool, a single yes/no ("Use 1 credit from Touchstone, or pay from your credit pool?") is enough — full per-credit allocation like the old block is more control than most costs need.
2. **Alternatively (lower-effort, if a prompt on every single credit is judged too noisy for costs like breaker pumps):** default to the credit pool first and only auto-spend hosted sources when the pool can't cover the cost, or when the source is specifically flagged as "prefer to auto-spend" (e.g., pure economy discards like a hypothetical always-use-me source) — reserving the explicit-choice prompt for sources like Touchstone that are stealth or otherwise strategically limited. This keeps common cases silent while not blowing through Baker's stealth-credit prerequisite as a side effect.
3. Either way, **don't let `canUseCredits()` alone decide spend order** — it should keep gating legality, and a separate signal (an explicit choice, or a "spend order priority" the source declares) should decide which eligible source actually gets drained first.
4. No change needed to Baker's own redirect payment — it already does the right thing and should be used as the reference implementation for whatever prompt gets added to `SpendCredits()`.

---

## 5. Tests

Follow `tests/fixtures/README.md` and whichever runner-side decision/mechanics test file already covers cost payment (e.g. `tests/mechanics-*.test.js` if one exists on this branch — otherwise this is a good candidate for a new `spend-credits-choice.test.js`).

1. **Reproduce directly:** Runner with Touchstone holding 1 credit and a normal credit pool, paying a 1-credit ability cost (e.g. Marjanah's pump) mid-run. Before the fix: credit silently comes from Touchstone, no phase change. After the fix: a choice/prompt phase should appear (or the pool should be preferred per whichever fix direction is taken), and declining Touchstone should leave its credit untouched.
2. **Baker interaction regression:** Touchstone with 1 credit, Baker installed, Runner pays an unrelated 1-credit run cost first, then reaches Baker's "approach Archives" decision. Before the fix, Baker's stealth-credit choices come back empty because Touchstone was already drained. After the fix, the player should have had the option to preserve that credit for Baker.
3. **Multiple hosted sources:** two eligible non-pool credit sources plus the pool, cost of 1 — confirm the player is offered a genuine choice among all three (or whichever subset the chosen fix direction supports), not just the first one found by `ActiveCards()` order.
4. Re-run existing fixtures that pay costs via `SpendCredits()` (trash costs, steal costs, ability costs) to confirm ordinary single-source-available cases still resolve without an unnecessary prompt when there's nothing to choose between.

---

## 6. Watch-outs

- **Don't reintroduce a prompt for every single credit when there's nothing to choose.** The old commented-out implementation prompts even when there's only one eligible non-pool source and enough in the pool to cover the rest — that's exactly the kind of always-on friction a "new version... automatically" rewrite was presumably trying to avoid. Any fix should skip the prompt when the outcome is unambiguous (no eligible hosted source, or only the pool has credits).
- **`ActiveCards()` order matters for anything that stays auto-spent.** If the fix keeps *any* auto-spend fallback (e.g., default-to-pool-first per §4.2), double check corp-side hosted-credit cards (rez discounts, recurring credits on corp assets) aren't accidentally reordered by the same change — `ActiveCards()` is shared by both players.
- **This function is called from many places** (`phase.js:985,1003,1018,1265,1292,1621,1636`, plus `mechanics.js:112,716,1995,2024`) covering trashing, stealing, ability costs, and more — a fix here is systemic, not local to runs or to Touchstone. Re-test corp-side costs (rez, trace) too, since `SpendCredits()` is shared.
- **Reconstructing a fixture from this log carries the same risk flagged in the Archives/Baker report:** the log's final state dump is captured after the last logged action, and hand/board contents earlier in the game are partly inferred from `SPOILER:` lines. Build the fixture at the specific point right before the first "spent one credit from Touchstone" line, not from the end-of-log snapshot.

---

## 7. Related observations (not part of this fix)

1. **Touchstone's `canUseCredits` ignoring `doing`/`card` is arguably correct per the card's actual text** ("You can spend hosted credits during runs" — no restriction to specific cost types), so no change is proposed there. It's `SpendCredits()`'s decision to auto-spend on any `canUseCredits() == true` source, rather than Touchstone's own eligibility check, that turns "optional and broad" into "mandatory and first."
2. Baker's redirect implementation (`_stealthCreditCards()` + its own `DecisionPhase`) is a good model for "give the player a real choice among qualifying credit sources" and is unaffected by this report — it's flagged only as the piece of the deck that makes this bug worth fixing rather than cosmetic.
3. The repeated `ERROR: Value above (.corpAbilities) is unsupported in ValueToString.` lines at nearly every phase boundary are present in this log too (as in the Archives/Baker log) and still look unrelated to this report.

# Runner: any credit spent during a run silently drains Touchstone (or any hosted-credit source) first, with no choice given to the player

## Implementation plan

Proposed at `f795a63`, 2026-10-02. **Approved 2026-10-02.**

- **Validation:** The remediation finding reproduces in the payment-choice data: `SpendCredits()` emits hosted sources as card choices but emits the pool as `{card: null}` without a `button`. `MakeChoice()` therefore takes its multi-card highlight path and returns without rendering a modal, leaving eligible hosted cards clickable but the pool option with no UI target. `ActiveCards()` already includes every supported active source location (installed cards, identity, and resolving cards), and `MakeChoice()` applies the same generic glow/click handling to every non-null `choice.card`; no Touchstone, card-type, or payment-purpose special case was found. The new pending regression below fails because the pool choice has no button.
- **Approach:** Add a `Spend 1[c] from pool` footer button to the pool choice in `SpendCredits()`. Each click spends exactly 1 credit and rebuilds the choices for the remaining cost, allowing any split between the pool and one or more hosted sources. Keep hosted sources as card choices so all eligible installed cards, identities, and in-flight events remain highlighted and clickable through the existing generic renderer. Do not change eligibility, AI payment order, or continuation behavior.
- **Tests:** Move `tests/pending/touchstone-credit-pool-choice-ui.test.js` into the green suite unchanged once it passes; it uses a multi-credit cost to require a one-credit pool contribution rather than an all-or-nothing payment. Extend `tests/credit-pool-lock.test.js` to exercise a split pool/hosted allocation, verify the pool button, and verify that eligible installed, identity, and resolving-card sources are all returned as selectable card choices. Run the focused tests and the full suite.
- **Risk:** `SpendCredits()` is shared by Runner and Corp payments, so the button will appear for either human side whenever pool-versus-hosted allocation is genuinely optional. Each pool selection now spends 1 credit and rebuilds the payment choices, allowing payment to split between the pool and hosted sources. Focused tests will retain the existing forced-payment, locked-pool, partial-allocation, callback, and continuation coverage.
- **Docs:** Add a dated remediation entry to the Resolution covering the live-test findings and final verification. No AI documentation or architecture update is needed because this changes only human payment UI and leaves AI behavior unchanged.

**Suggested location:** `documentation/bugs/` (move to `documentation/bugs/done/` once merged).
**Source log:** `documentation/debug-logs/bug_raised/any_cred_spent_during_run_is_removed_from_touchstone_no_choice_given.txt`
**File:** `mechanics.js` (root cause), `sets/vantagepoint.js` (Touchstone eligibility, verified correct). Line numbers are from `main` at `512a8f3`, 2026-09-24, and will drift; search by function name.
**Status:** Code review. The remediation adds the missing one-credit pool control and verifies generic selection/highlighting for every active-card source location, including resolving events.
**Reproduction:** `tests/pending/touchstone-credit-pool-choice-ui.test.js` — failed at `f795a63`, 2026-10-02: the legal pool option had no footer-button metadata and offered the full remaining payment rather than a one-credit contribution. Moved to `tests/touchstone-credit-pool-choice-ui.test.js`; passes with the assertions unchanged (only the repository-relative harness path changed after the move).

## Resolution

Implemented from `f795a63`.

### Remediation 2026-10-02

1. The missing pool control is fixed by giving the pool choice a visible `Spend 1[c] from pool` footer button.
2. A pool selection now contributes exactly 1 credit before `SpendCredits()` rebuilds the choices. This permits arbitrary splits between the pool and one or more eligible hosted sources instead of making pool payment all-or-nothing.
3. Hosted sources remain card choices. Coverage now verifies that an eligible installed card, identity, and resolving event (modelled on Overclock) are each discovered by `ActiveCards()`, offered by `SpendCredits()`, and highlighted by the generic card-choice UI while the pool button is visible. This covers the active locations used by all current hosted-credit sources, without card-title or card-type special cases.
4. The change is inside the shared `SpendCredits()` choice construction, so it applies equally to breaker payments, access trash costs, subroutine taxes, and other costs that use this payment flow. Forced payments, pool locks, callbacks, continuations, and deterministic AI allocation remain unchanged.

### Review follow-up 2026-10-04

The full suite was compared in fresh worktrees at the recorded base (`f795a63`) and the PR head (`8e1677f`). Both reproduced the same `flipped-identity.test.js` and `vantagepoint-integration.test.js` failures because Git worktrees omit the ignored local `images/` directory; neither test nor its referenced card/set code changes in this PR. With the repository's existing local image assets linked into the isolated PR worktree, `node tests/run-all-tests.js` passed all 43 test files. The three focused payment regressions also pass directly.

The pending reproduction was moved into the green suite. Its repository-root path required the expected one-level adjustment after moving from `tests/pending/` to `tests/`; its assertions were not changed.

### Historical observations before the 2026-10-02 remediation

The following observations describe the interim implementation before the pool
button and source-selection coverage were added. The remediation above addresses
these UI and verification gaps.

The diagnosis was confirmed. A payment-priority workaround was initially
considered, but rejected because it would merely replace "always spend
Touchstone first" with "always spend the pool first." Neither behavior matches
a real game: the player chooses how to combine all legal credit sources whenever
the allocation is not forced.

`SpendCredits()` now constructs a payment decision for a human player whenever
an eligible hosted-credit source and the credit pool (or multiple eligible
hosted sources) provide different legal allocations. Its decision data permits
spending any legal amount from a hosted source, choosing again for the
remaining cost, or paying the remainder from the pool. Live play-testing,
however, found that the rendered UI does not expose the pool choice, so the
player-facing payment flow remains incomplete. A forced payment with only one
legal source stays automatic. Computer players retain deterministic automatic
allocation.

Because this makes `SpendCredits()` asynchronous when a real choice exists,
callers that performed follow-up effects immediately after payment were audited.
Networking, Corporate Troubleshooter, Anoetic Void, and Datapike now put those
effects in the payment continuation, so they cannot resolve before the player
finishes choosing credit sources.

Touchstone itself needs no special payment-priority property. Its broad
`canUseCredits()` is correct, and live play-testing confirms that Touchstone can
be selected during a run. The same test found no player-visible credit-pool
option, and selection of every other kind of eligible hosted source has not yet
been verified. Baker's separate stealth-only payment remains unchanged.

Engine-level coverage in `tests/credit-pool-lock.test.js` verifies the hosted
source and credit-pool allocations, multi-source allocation, continuation
timing, hosted-source callbacks, and forced payment while the pool is locked.
It does not verify that the rendered UI exposes the pool choice or that every
eligible hosted source is player-selectable.

## Acceptance criteria

- [x] A mixed pool/hosted payment displays `Spend 1[c] from pool` as a selectable footer button.
- [x] The pool contributes one credit at a time so a payment can be split across the pool and hosted sources.
- [x] Eligible installed cards, identities, and resolving cards such as Overclock are offered and highlighted as clickable payment sources.
- [x] The shared payment flow retains forced-payment, locked-pool, callback, continuation, and AI behavior.
- [x] The full regression suite passes (`node tests/run-all-tests.js`: 43 test files).

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

## 4. Fix options reviewed

1. **Restore a choice step in `SpendCredits()` for hosted/recurring credit sources.** Implemented with a single-command `DecisionPhase` that can repeat until the full cost is allocated. Callers with immediate follow-up effects were converted to continuations.
2. **Use a separate spend-order priority.** Rejected. It protects one intended future use of Touchstone but still denies the player the rules-correct choice to spend Touchstone now.
3. **Don't let `canUseCredits()` alone decide spend order.** Implemented through explicit human choice; `canUseCredits()` now gates legality without selecting the source.
4. No change needed to Baker's own redirect payment — it already does the right thing and should be used as the reference implementation for whatever prompt gets added to `SpendCredits()`.

---

## 5. Tests

Follow `tests/fixtures/README.md` and whichever runner-side decision/mechanics test file already covers cost payment (e.g. `tests/mechanics-*.test.js` if one exists on this branch — otherwise this is a good candidate for a new `spend-credits-choice.test.js`).

1. **Direct regression:** with Touchstone and an ordinary pool both able to pay, confirm neither is spent before the decision and both are offered.
2. **Either allocation:** confirm choosing the pool preserves Touchstone and choosing Touchstone preserves the pool.
3. **Multiple hosted sources:** after a partial payment, confirm another eligible hosted source and the pool remain available for the balance.
4. **Continuation and callbacks:** confirm the payment continuation and `onCreditsSpent` fire only after the corresponding allocation completes.
5. **Forced payment:** when the pool is locked and only one hosted source can pay, confirm payment resolves without a redundant prompt.
6. Re-run the full suite, including the Corp decision fixtures and decision snapshots, because `SpendCredits()` is shared by Runner and Corp payment paths.

---

## 6. Watch-outs

- **Don't reintroduce a prompt for every single credit when there's nothing to choose.** Automatic payment should apply only when there is one legal allocation, such as pool-only payment with no eligible hosted source, or a forced contribution from the sole eligible hosted source with the balance paid from the pool. One eligible hosted source plus enough pool credits to pay the cost still offers different legal allocations: the player must be able to choose whether and how much to spend from the hosted source.
- **`ActiveCards()` order matters for anything that stays auto-spent.** If the fix keeps *any* auto-spend fallback (e.g., default-to-pool-first per §4.2), double check corp-side hosted-credit cards (rez discounts, recurring credits on corp assets) aren't accidentally reordered by the same change — `ActiveCards()` is shared by both players.
- **This function is called from many places** (`phase.js:985,1003,1018,1265,1292,1621,1636`, plus `mechanics.js:112,716,1995,2024`) covering trashing, stealing, ability costs, and more — a fix here is systemic, not local to runs or to Touchstone. Re-test corp-side costs (rez, trace) too, since `SpendCredits()` is shared.
- **Reconstructing a fixture from this log carries the same risk flagged in the Archives/Baker report:** the log's final state dump is captured after the last logged action, and hand/board contents earlier in the game are partly inferred from `SPOILER:` lines. Build the fixture at the specific point right before the first "spent one credit from Touchstone" line, not from the end-of-log snapshot.

---

## 7. Related observations (not part of this fix)

1. **Touchstone's `canUseCredits` ignoring `doing`/`card` is arguably correct per the card's actual text** ("You can spend hosted credits during runs" — no restriction to specific cost types), so no change is proposed there. It's `SpendCredits()`'s decision to auto-spend on any `canUseCredits() == true` source, rather than Touchstone's own eligibility check, that turns "optional and broad" into "mandatory and first."
2. Baker's redirect implementation (`_stealthCreditCards()` + its own `DecisionPhase`) is a good model for "give the player a real choice among qualifying credit sources" and is unaffected by this report — it's flagged only as the piece of the deck that makes this bug worth fixing rather than cosmetic.
3. The repeated `ERROR: Value above (.corpAbilities) is unsupported in ValueToString.` lines at nearly every phase boundary are present in this log too (as in the Archives/Baker log) and still look unrelated to this report.


## REMEDIATION - in game testing

With the new fix, the game correctly pauses to ask whether to spend credits instead of automatically removing them from touchstone, and you can now click on the touchstone itself to spend the credit, which is the correct behaviour.

However, the UI displays "Spend Credits" in the top right, but nothing in the bottom left box which look strange. The biggest issue is that there is no way of spending credits from the normal credit pool. We need a "Spend 1 credit from pool" type button in the bottom left, using the cred symbol instead of the word "credits", and also we need to make sure that ALL other cards hosting credits that are eligible to be spent are also highlighted and clickable in the same way that baker is, e.g. all other card types including events in flight (I've not tested this yet, so the code needs verifying that this is the case).

The above is also the case any time a credit can be spent during a run, not just breaking ICE, e.g. trashing an accessed card, or paying a "tax" on a subroutine.

Moving to remediation until this is fixed.

Original fix - commit `Addressed documentation/bugs/touchstone-credits-auto-spent-no-choice.md` on branch `24Sept-fixes`

# Corp AI: `_iceWorthRezzing()` silently refuses to rez ice hosting a Runner Trojan, with no logged reason, even when affordable and undefended

**Source log:** `documentation/debug-logs/bug_raised/corp_didnt_rez_ice_when_would_have_forced_runner_to_spend_creds.txt`
**Reproduction:** `tests/pending/hosted-trojan-blocks-rez-silently.test.js` — drafted, not yet run

---

## 1. Summary

The Corp approaches unrezzed ice guarding a remote server that holds an agenda
(Project Ingatan) and a grid (Mahkota Langit Grid) — clearly not an empty
server. The Corp has 12 credits, comfortably enough to rez the ice, and the
engine prints `Corp did not rez ice`. Unlike every other place in
`ai_corp.js` where the AI declines a rez, **no `AI:` reasoning line precedes
this one at all.** Every comparable decline elsewhere in `_iceWorthRezzing()`
logs something like `"Rez cost not worth it, need to save it for X"`; this
one leaves no trace, which is what made it hard to diagnose from the log
alone.

Reading `_iceWorthRezzing()` finds an unconditional, unlogged branch: if the
approached ice hosts any card without `AIHostedDoesNotPreventRez`, and
`Credits(corp) < currentRezCost * 5`, the function sets `rezIce = false` with
no `_log()` call. The end-of-game reproduction dump in the log confirms the
approached ice hosts Runner card `35030` — **Chromatophores**, a Shaper
Trojan with no `AIHostedDoesNotPreventRez` flag (the only card with that flag
is Saci). This heuristic treats every non-exempted hosted card as
categorically threatening enough to require the Corp be "super rich" (5x rez
cost) before rezzing, with no check on whether refusing to rez actually
protects anything the Corp cares about.

**Proposed fix:** at minimum, log a reason whenever this branch withholds the
rez, matching every other exit of the function. More substantively, this
branch should be evidence-based like the sibling cross-server
credit-reservation logic in the same function (which checks
`_iceWouldSecureServer` / `_icePreventsGameWinningBreach` before reserving),
rather than a flat multiplier on cost that ignores whether the approached
server is otherwise defenseless.

---

## 2. What happened in the log

Corp: Poétrï Luxury Brands. Runner: Barry Baz Wong, a no-icebreaker deck
(the decklist contains no Fracter/Decoder/Killer programs at all — it relies
on Trojans and click/credit efficiency instead).

By the final Runner turn of the log, the board (reconstructed from the
`SPOILER:` lines and the end-of-log reproduction dump) was:

| Server | Contents | Rezzed? |
|---|---|---|
| HQ | Scatter Field (ice) | no |
| R&D | one piece of ice | no |
| Remote 0 | one piece of ice, hosting a Runner Trojan; root holds Project Ingatan (agenda, 2 points) and Mahkota Langit Grid (upgrade) | no |
| Archives | (previously accessed/emptied) | — |

No ice was ever rezzed in this entire game (`grep -i rez` on the log finds
only the final decline and two unrelated `"I don't have code to handle this
situation"` messages from other decision points).

The Runner's turn (line numbers from the debug log):

403: SPOILER: Corp has 12 credit(s) and 5 card(s) in hand: [...]
406-411: Runner spent one click / gained one credit (x3, reaching 3 credits)
413: Run initiated attacking Remote 0
415: Side Hustle pays out 6 credits (Runner now has 9 credits)
419: Approaching outermost piece of ice protecting Remote 0
420: Corp did not rez ice
421: Approaching Remote 0
Run successful
Project Ingatan accessed
Project Ingatan stolen
Mahkota Langit Grid accessed


No Corp credit spend or gain is logged between line 403 and the decision at
line 420, so the Corp still had 12 credits at the moment of the decision.

Two Runner Trojans were installed earlier in the game, both `installOnlyOn`
any piece of ice (rezzed or not):

- **Tranquilizer** (id `30017`, derezzes its host at 3 virus counters) — the
  end-of-log dump shows it hosted on `corp.HQ.ice[0]` with 2 virus counters
  (`corp.HQ.ice[0].hostedCards[0].virus=2`), i.e. on **Scatter Field**, not
  on the Remote 0 ice.
- **Chromatophores** (id `35030`, gives its host ice every ice subtype) —
  the dump shows it hosted on `corp.remoteServers[0].ice[0]`
  (`InstanceCardsPush(35030, corp.remoteServers[0].ice[0].hostedCards, ...)`),
  i.e. **on the exact ice the Corp declined to rez**.

`Chromatophores` (`sets/elevation.js:614`) has no `AIHostedDoesNotPreventRez`
property.

---

## 3. Root cause

### 3.1 The hosted-card guard is unconditional and unlogged

`_iceWorthRezzing()`, `ai_corp.js` ~4601-4622:

```js
if (!card.AIDisablesHostedPrograms) {
  //if a card is hosted (e.g. Tranquilizer) only rez if super rich (the *5 is arbitrary, observe and tweak)
  //exception: cards with AIHostedDoesNotPreventRez are not threatening (e.g. Saci just gives runner 3c)
  if (
    typeof card.hostedCards !== "undefined" &&
    card.hostedCards.length > 0 &&
    Credits(corp) < currentRezCost * 5
  ) {
    var hasThreateningHosted = false;
    for (var h = 0; h < card.hostedCards.length; h++) {
      if (!card.hostedCards[h].AIHostedDoesNotPreventRez) {
        hasThreateningHosted = true;
        break;
      }
    }
    if (hasThreateningHosted) {
      rezIce = false;
    }
  }
}
```

There is no `this._log(...)` call anywhere in this block. Compare this to
every other `rezIce = false` assignment in the function (the cross-server
reservation branch, the same-server defensive-upgrade branch), which always
log why. Two further branches later in the function (`_iceToLeaveUnrezzed`
at ~4625 and the Inside Job exception at ~4629-4654) are also silent, but
this ticket's evidence is specific to the hosted-card branch.

### 3.2 Only one card in this decklist would escape the block

Only `AIHostedDoesNotPreventRez` (set solely on Saci,
`sets/automatainitiative.js:49`) exempts a hosted card. Chromatophores has no
such exemption, so with Corp credits at 12:

`Credits(corp) < currentRezCost * 5` → `12 < currentRezCost * 5`

Every ice in the Poétrï Luxury Brands decklist has a rez cost of 2 or more;
all but the 2-cost Kessleroid (`rezCost: 2`, threshold 10) satisfy this
inequality (Bumi 1.0 and Scatter Field: `rezCost: 3`, threshold 15; Ansel
1.0 / Brân 1.0: `rezCost: 6`, threshold 30; Mycoweb: `rezCost: 8`, threshold
40). The exact identity of the Remote 0 ice is hidden information (it was
never rezzed, so the log never reveals it), but the block would fire for any
candidate except Kessleroid — this is why the reproduction below uses a
representative rez cost of 3 rather than asserting the card's exact
identity.

### 3.3 The heuristic ignores what refusing to rez actually costs

Elsewhere in the same function, the cross-server credit-reservation branch
only withholds a rez when `_iceWouldSecureServer()` or
`_icePreventsGameWinningBreach()` shows the reservation is actually decisive
(see the `done/rez-decision-saves-credits-for-other-server-on-tie.md` and its
"Follow-up design correction" section). The hosted-card branch has no
equivalent check: it blocks the rez purely on cost multiplier, with no
regard for whether the server is otherwise undefended, whether this ice
would in fact stop the current access, or whether the hosted card's ability
(here: broadening the ice's own subtypes, which only helps the Runner if
they have a compatible special breaker — Barry Baz Wong's deck has none) is
even exploitable in the current game state.

---

## 4. Reproduction

`tests/pending/hosted-trojan-blocks-rez-silently.test.js` calls
`ai._iceWorthRezzing()` directly (the more reliable option noted in
`tests/fixtures/README.md`'s sibling ticket, since `Phase_Approaching`'s
"rez" option is a card object, not a string, and is not replayable through
the standard fixture format).

It builds a minimal board reconstructed from the log's reproduction dump:
unrezzed ice (rez cost 3, matching the deck's Bumi 1.0 / Scatter Field cost)
on a remote server whose root holds an agenda, with a copy of Chromatophores
in `hostedCards`, Corp at 12 credits, no other unrezzed ice anywhere to
compete for credits. Because nothing else in the board would ever cause a
legitimate reservation, this isolates the hosted-card branch as the only
possible reason to withhold the rez.

- [Inferred] `ai._iceWorthRezzing(ice, 3, remote)` returns `false` today.
- [Inferred] No message is logged during that call (captured via a temporary
  `ai._log` stub) — reproducing the "no reasoning printed" defect directly,
  not just the wrong decision.

Two guard cases are included so a fix does not overcorrect:

- The same board, but the hosted card carries `AIHostedDoesNotPreventRez`
  (the Saci exception) — must remain `true` (unaffected by any fix here).
- The same board with Chromatophores un-exempted, but Corp super rich
  (credits ≥ 5× rez cost) — already `true` today; guards against breaking the
  existing "super rich" path.

---

## 5. Root cause claims

- [Inferred] The Corp never rezzed any ice in this game; the specific decline
  at line 420 is the one this ticket investigates.
- [Inferred] The approached Remote 0 ice hosted card `35030` (Chromatophores),
  per the end-of-log reproduction dump (`corp.remoteServers[0].ice[0].hostedCards`).
- [Inferred] Chromatophores has no `AIHostedDoesNotPreventRez` property
  (checked in `sets/elevation.js`), so it is treated as a threatening hosted
  card by `_iceWorthRezzing()`.
- [Inferred] Corp had 12 credits at the decision point (no spend or gain
  logged between the last known total and the decision).
- [Inferred] Given the decklist's ice rez costs, the `Credits(corp) 
  currentRezCost * 5` condition holds for every candidate ice except the
  2-cost Kessleroid, so the block is very likely what fired, independent of
  the ice's exact hidden identity.
- [Inferred] The hostedCards branch (`ai_corp.js` ~4602-4621) contains no
  `_log()` call, unlike every other `rezIce = false` branch in the function.

---

## 6. Proposed fix

1. **Minimum (diagnosability):** add a `this._log(...)` call when the
   hostedCards branch sets `rezIce = false`, naming the hosted card and the
   "super rich" threshold that was not met, so a future log shows why.
2. **Behavioral:** replace the flat `Credits(corp) < currentRezCost * 5`
   multiplier with an evidence-based check in the same style as the
   cross-server reservation logic — e.g., only withhold the rez when *not*
   rezzing lets a decisive or otherwise-unstoppable access through
   (`_iceWouldSecureServer` / `_icePreventsGameWinningBreach`-style
   reasoning), or when the hosted card's ability is actually exploitable
   given the Runner's current rig (e.g. Chromatophores only matters if the
   Runner has an `AISpecialBreaker` installed that would benefit).
3. Do not special-case Chromatophores or Tranquilizer by title; keep the
   general `AIHostedDoesNotPreventRez` opt-out, but make the *default* path
   evidence-based rather than an unconditional block.
4. Leave `_iceToLeaveUnrezzed` and the Inside Job branch alone unless the
   maintainer wants them folded into the same fix — they are also silent but
   are not evidenced by this log.

---

## 7. Acceptance criteria

- [ ] The reproduction in section 4 fails before the fix and passes after,
      moved into the green suite, with its assertions unchanged.
- [ ] The hostedCards branch logs a reason whenever it sets `rezIce = false`.
- [ ] The Saci (`AIHostedDoesNotPreventRez`) guard case still returns `true`.
- [ ] The "super rich" guard case still returns `true`.
- [ ] A new case demonstrates the fixed behavior: a hosted, non-exempt Trojan
      no longer blocks the rez when refusing would leave the server otherwise
      undefended and the Runner cannot exploit the hosted card's actual
      effect (or, at minimum, that the decision is now logged either way).
- [ ] New or changed AI hooks are documented in `documentation/ai.md` (none
      expected — no card-facing hook changes, only internal AI logic).
- [ ] `node tests/run-all-tests.js` passes.

## Out of scope / related

- The `_iceToLeaveUnrezzed` and Inside Job silent branches noted in 3.1 —
  same defect pattern, not evidenced by this specific log.
- Whether Barry Baz Wong's no-breaker archetype is correctly weighed
  elsewhere in server-security evaluation — not investigated here.
- The exact identity of the Remote 0 ice is hidden information and was never
  confirmed; the reproduction uses a representative rez cost (3) rather than
  asserting a specific card.
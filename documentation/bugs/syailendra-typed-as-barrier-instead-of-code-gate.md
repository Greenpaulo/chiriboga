# Syailendra is implemented as a Barrier, so the game looks for a Fracter to break it instead of the Decoder it actually needs

**Suggested location:** `documentation/bugs/` (move to `documentation/bugs/done/` once merged).
**Source log:** `documentation/debug-logs/code_gate_is_looking_for_a_fracter_to_break_it.txt`
**File:** `sets/elevation.js` — Syailendra's card definition (`cardSet[35076]`).
**Confirmed against:** `carddata/carddata.json` (`code: 35076`, `keywords: "Code Gate - AP"`).
**Status:** Diagnosed, not yet fixed. One-line fix.

---

## 1. Summary

Syailendra is a Weyland Code Gate in the real card pool (`carddata/carddata.json` lists it as `keywords: "Code Gate - AP"`, matching `code: 35076`, the same ID used for this card's implementation). But its implementation is typed as a **Barrier**:

```js
//Syailendra
//Weyland Ice: Barrier                    <- wrong in the comment too
//Rez: 4, Strength: 5
...
cardSet[35076] = {
  title: "Syailendra",
  ...
  cardType: "ice",
  subTypes: ["Barrier"],                  <- should be ["Code Gate"]
  rezCost: 4,
  strength: 5,
  ...
```

Every breaker-matching check in the AI (`_matchingBreakerForIce`, `_aCompatibleBreakerIsInstalled`, `_numCompatibleIceInstalled` in `ai_corp.js`) is implemented correctly — Fracter↔Barrier, Decoder↔Code Gate, Killer↔Sentry are matched the right way round throughout. The bug isn't in that matching logic at all; it's that Syailendra hands those correct checks the wrong subtype to match against. The practical effect is exactly what the log's filename says: the game treats a Code Gate as if it needs a Fracter to break it, so the Runner's actual Code Gate breaker (Unity, a Decoder) is never recognised as capable against it, and only an installed Fracter (which this Runner never installs) would ever count.

The likely origin is copy-paste: Syailendra (`cardSet[35076]`) sits immediately after Kessleroid (`cardSet[35075]`) in `sets/elevation.js`, a genuine Weyland Barrier with the same faction and a near-identical boilerplate shape (`cardType: "ice"`, `subTypes: ["Barrier"]`, similar rez/strength fields). Card-specific fields (title, rez cost, strength, subroutines, the advancement mechanic) were all correctly written for Syailendra; only `subTypes` (and the header comment above it) were left as the template's `Barrier`.

---

## 2. What happened in the log

The Runner's deck contains Unity (a Decoder — the correct breaker for a Code Gate) and Marjanah (a Fracter — the correct breaker for a Barrier), per `carddata/carddata.json` and `sets/*.js`. Marjanah sits in the Runner's grip for the entire log and is never installed; Unity is installed partway through (line 438) and is confirmed working correctly against the deck's other Code Gate, Flyswatter (`subTypes: ["Code Gate"]`, correctly typed in `sets/elevation.js`):

```
Runner spent one click
Runner installed Unity
...
Approaching outermost piece of ice protecting HQ
AI: I will rez the approached ice
Corp rezzed Flyswatter
Using Unity:
Runner spent one credit
Subroutine End the run. broken          <- Unity correctly breaks the real Code Gate
Approaching next piece of ice protecting HQ
AI: I will rez the approached ice
Corp rezzed Syailendra
Encountering Syailendra
Firing You may place 1 advancement counter on an installed card you can advance. on Syailendra:
1 advancement counter placed on Syailendra
Firing The Runner loses 2[credit]. on Syailendra:
Runner lost 1 credit
Firing Do 1 net damage. on Syailendra:
```

No `Using Unity:` line ever appears for Syailendra — all three of its subroutines simply fire unbroken, one after another, even though the Runner had just used the exact same breaker one ice-piece earlier in the same run. With Syailendra mistyped as `Barrier`, Unity's `CheckSubType(card, "Decoder") && CheckSubType(iceCard, "Code Gate")` match in `_matchingBreakerForIce` (and the identical check the Runner's own interface-break enumeration uses) never fires for it, so the game never offers Unity as a way to break it — only a Fracter would qualify, and the Runner has none installed.

The same mistyping shows up throughout the Corp AI's own turn planning, for the entire game, in the repeated security-evaluation lines:

```
AI: HQ appears secure: Flyswatter has mandatory breaks with no capable breaker; Syailendra omitted from best affordable rez plan; break cost Infinity > Runner credits 6
```

Because Syailendra is (wrongly) treated as needing a Fracter the Runner never installs, `_matchingBreakerForIce` returns `null` for it every single turn regardless of what the Runner actually has installed, so it always contributes `hasHardLockout` on its own and the Corp's rez-plan search (`_evaluateServerSecurity` → `_icePlanOutcome`, `ai_corp.js` lines ~2716-2803) always finds that rezzing Flyswatter alone already achieves the same hard lockout for less money, correctly per its own logic (see §3) — and so correctly, but for the wrong underlying reason, "omits" Syailendra from the plan every turn. Once Unity is installed and Flyswatter stops being a lockout, this same mistyping is what leaves Syailendra as the Runner's sole remaining obstacle with **no correct breaker path at all** — not even a legitimate one requiring more credits or clicks, just a card with a real Decoder answer that the engine can never find because it's asking for the wrong kind of breaker.

---

## 3. Root cause

**Where:** `sets/elevation.js`, `cardSet[35076]` (Syailendra), specifically the `subTypes: ["Barrier"]` line and the `//Weyland Ice: Barrier` header comment directly above it.

This is a plain data-entry error, not a logic bug. Every consumer of ice subtypes handles `Code Gate` correctly elsewhere in the codebase:

- `ai_corp.js` `_matchingBreakerForIce` (line ~1842-1852): `CheckSubType(card, "Decoder") && this._iceHasEffectiveSubtype(iceCard, "Code Gate", ...)` is right; it's just never true for Syailendra because `_effectiveIceSubtypes` reads its subtype from `subTypes`, which says `Barrier`.
- `ai_corp.js` `_aCompatibleBreakerIsInstalled` / `_numCompatibleIceInstalled` (lines ~1521-1582): same correct Decoder↔Code Gate pairing, same dependency on the card's own `subTypes`.
- Whatever the Runner-side interface-break `Enumerate` check for icebreaker abilities uses (Unity's own `Break 1 code gate subroutine` ability text implies the same `CheckSubType(iceCard, "Code Gate")` gate) — not directly inspected here, but the log's behaviour (no `Using Unity:` option ever offered against Syailendra) is only explicable if that check reads the same wrong subtype.

There's nothing else Syailendra-specific that assumes `Barrier` — its `subroutines`, `responseOnEncounter`, `AIImplementIce`, and `AIAdvancementLimit` are all written generically and don't reference the ice type at all. Fixing `subTypes` is the entire fix.

---

## 4. Proposed fix

```js
//Syailendra
//Weyland Ice: Code Gate
//Rez: 4, Strength: 5
...
cardSet[35076] = {
  title: "Syailendra",
  ...
  subTypes: ["Code Gate"],
  ...
```

That's the whole change. No other field on this card needs to move, and no code outside `sets/elevation.js` needs to change — the Fracter/Decoder/Killer matching logic already does the right thing once it's given the right subtype.

Given the likely copy-paste origin (§1), it's worth a quick pass over any other ice implemented near a same-faction neighbour with a different real subtype, in case the same slip happened elsewhere in `sets/elevation.js` or the other set files — a short script comparing each `cardSet[N].subTypes` against `carddata/carddata.json`'s `keywords` for that `code` would catch this whole class of bug at once (see §5.3).

---

## 5. Tests

Follow `tests/fixtures/README.md` and whichever ice/breaker test file already exists on this branch (e.g. `tests/ice-breaker-matching.test.js`, or wherever the Fracter/Decoder/Killer pairing is otherwise covered).

1. **Direct regression:** Runner with only a Decoder (e.g. Unity) installed, encountering a rezzed Syailendra — after the fix, the Decoder's break ability should be offered and should successfully break Syailendra's subroutines; before the fix, no break option is offered at all.
2. **Negative check:** Runner with only a Fracter (e.g. Marjanah) installed and no Decoder, encountering Syailendra — after the fix, Marjanah should **not** be offered as a valid breaker for it (confirming the fix didn't just add Decoder support alongside the wrong Fracter support, but actually corrected the subtype).
3. **Corp-side regression, reusing this log's shape:** Corp with Flyswatter + Syailendra unrezzed in HQ, Runner with a Decoder installed and enough credits to break both. `_evaluateServerSecurity(corp.HQ)` should now find a real (non-Infinity) mandatory break cost that includes Syailendra, and `isSecure` should reflect the Runner's actual ability to get through both pieces — not treat Syailendra as an unconditional lockout regardless of what the Runner has installed.
4. **Cardpool-wide sanity check (see §4):** a small script or test that loads `carddata/carddata.json` and, for every `cardSet[N]` with `cardType == "ice"`, compares its `subTypes` against the `Barrier`/`Code Gate`/`Sentry` keyword(s) in the matching carddata entry's `keywords` field, flagging mismatches. This would have caught Syailendra immediately and is cheap to keep running.

---

## 6. Watch-outs

- **Don't touch `ai_corp.js`.** The breaker-matching logic there is correct and shared by every other ice in the game; the fix is entirely inside Syailendra's own card definition.
- **The Corp AI's rez-plan "omitted from best affordable rez plan" behaviour (§2) is itself working as designed** (prefer the cheapest plan that achieves the same lockout — see `_icePlanIsBetter`'s tie-break in `ai_corp.js`) and isn't part of this bug; it will naturally stop omitting Syailendra once the subtype fix lets the Runner's Decoder actually threaten it, changing what "best" plan means rather than requiring any change to that comparison logic itself.
- **Re-check the encounter/advancement mechanic still behaves correctly post-fix.** Syailendra's `responseOnEncounter` and its first subroutine both place advancement counters and are independent of ice subtype, but it's worth confirming nothing elsewhere in the codebase branches on `CheckSubType(iceCard, "Barrier")` in a way that was — even accidentally — relying on Syailendra being (mis)typed as one (e.g. any generic "count the Corp's Barriers" AI heuristic). A repo-wide search for `"Barrier"` checks combined with the cardpool sanity check in §5.4 should catch this.

---

## 7. Related observations (not part of this fix)

1. The log ends abruptly right after Syailendra's first (optional) subroutine fires, with no further Corp AI decision output — consistent with the Runner having no legal way to interact with Syailendra's remaining subroutines once Unity is (wrongly) ruled out and Marjanah was never installed, rather than any separate crash or hang.
2. `_icePlanOutcome`'s tie-break rule — prefer the cheaper of two plans that tie on lockout status and mandatory/total break cost (`ai_corp.js`, `_icePlanIsBetter`, final `return candidate.rezCost < current.rezCost;`) — is a reasonable, deliberate piece of design (don't pay to rez redundant ice) and is flagged here only because it's what made this particular bug's symptom read as "Syailendra omitted" turn after turn rather than something more obviously wrong.

# Code Review: `1b1dcc0` — Corp AI finding 3 (purge is a random roll)

**Repo:** Greenpaulo/chiriboga
**Commit:** [`1b1dcc0`](https://github.com/Greenpaulo/chiriboga/commit/1b1dcc0f2b37d0b55d67faaf6228e2da5c6ecd65)
**Ticket:** `documentation/backlog/code-review/corp_ai_finding_03_purge_random_roll.md`

> This commit is titled "Audited 2 backlog tickets, fixed another" — it's genuinely three things in one: findings 1 and 2 get a validation-only pass (no code changes, just re-checked against the current codebase and moved to `done/`), and finding 3 gets an actual correction. Unlike the finding-9 commit I flagged earlier for silently bundling in unrelated work, this one's title is honest about doing more than one thing, so I'm not raising the same hygiene concern here — just reviewing the finding-3 code, which is the substantive change.

## Verdict

Approve. This is specifically a **correction of an earlier, buggy attempt** at the same fix — the commit changes the hypothetical from setting an ad-hoc `card.disabled` flag to actually removing the card from its installed array and setting `notInstalled`. I traced that claim against the real engine (`checks.js`/`utility.js`, not just the commit's own description of itself) and it holds up.

## Verifying the core claim: "the real `CheckHasAbilities()` does not consult `.disabled`"

The ticket's self-correction says the original hypothetical set `card.disabled = true`, which the test harness respected but the production engine doesn't. I checked this directly rather than taking it on faith:

- `CheckInstalled(card)` in `checks.js` explicitly checks `card.notInstalled` first ("cards marked notInstalled are never considered installed") — this is a **pre-existing engine convention** (already used for Detente), not something invented for this fix. Reusing it is the right call, not a hack.
- `InstalledCards()` in `utility.js` has an important asymmetry worth knowing about: its inner loop over `hostedCards[j]` (cards hosted on another card) explicitly skips anything with `notInstalled` set — but its **outer loop** over top-level arrays (`runner.rig.programs/hardware/resources`, server roots/ice) has **no such check**. For a top-level card like Clot (installed directly as a program, not hosted on anything), `notInstalled` alone wouldn't be enough to make `InstalledCards()` stop returning it — the card has to actually be spliced out of its array.

That's exactly what the new code does — both, unconditionally where applicable:
```js
state.card.notInstalled = true;
if (state.location && state.locationIndex > -1)
  state.location.splice(state.locationIndex, 1);
```
So the fix covers both cases correctly: the splice handles top-level cards (where `notInstalled` alone wouldn't be read), and `notInstalled` handles hosted cards (which are filtered by the flag whether or not the splice also happens to apply there). This is the kind of thing that's easy to get half-right — setting only the flag would have "worked" for hosted purge-trash cards while silently still failing for top-level ones like Clot.

## Reverse-order removal

```js
//Remove in reverse installed order so saved indices remain valid.
for (var i = saved.length - 1; i >= 0; i--) {
```
This matters when two purge-trash cards share the same `cardLocation` array: splicing the lower-index one first would shift the higher-index one's stored index out from under it. Processing `saved` back-to-front only works correctly if same-array cards appear in `saved` in the same relative order they appear in that array — which holds here because `saved` is built directly from `purgeable`/`InstalledCards()`'s natural traversal order, so the logic is sound. I don't see a test that actually exercises two purge-trash cards in one shared array, though (see Test coverage below) — worth adding one, since it's the one piece of index-arithmetic in this diff that a single-card test can't catch a regression in.

## Restore logic

`restore()` re-inserts a card only if `location.indexOf(card) < 0` (not already present) and only when the removal conditions that applied during `apply()` would have applied — so it correctly no-ops for cards that were never actually removed (e.g. everything, when `purgeTrashCanBePrevented` was true throughout). Combined with `_withHypothetical`'s try/finally, this also means a partial failure mid-`apply()` (e.g. an exception after removing some but not all purge-trash cards) still restores correctly, since restore() checks each card's *actual current state* rather than assuming `apply()` ran to completion. Confirmed by the "restores counters, location and install state after an exception" test, which throws mid-evaluation and checks the card ends up back in `runner.cards` at its original position.

## `AIPreventsPurgeTrash` / Sacrificial Construct

Checked the real card definition rather than trusting the ticket's paraphrase: Sacrificial Construct's existing `responsePreventableTrash` hook is exactly the "save an installed card from being trashed" ability the new `AIPreventsPurgeTrash: true` flag is meant to represent conservatively. The `purgeTrashCanBePrevented` gate also runs the candidate through `CheckHasAbilities(card)`, so a Sacrificial Construct that's itself been silenced by some other effect won't incorrectly suppress the purge-trash modeling. Virus counters still clear unconditionally regardless of this flag, matching the stated intent that "a purge justified independently of the trash remains visible."

## `_purgeServerHasStakes` narrowing

```js
if (server == corp.RnD || server == corp.archives)
  return this._agendaPointsInServer(server) > 0;
```
Replaces the old `(server.cards || []).length > 0` (any card at all counted as "stakes," including a deck full of nothing but operations). `_agendaPointsInServer` is a pre-existing helper used in five other places in the file, so this isn't a one-off invention — it's reusing an established concept correctly. This closes the exact gap the ticket describes: a nonempty-but-agenda-free central server can no longer justify burning the Corp's whole turn on a purge.

## Test coverage

Good targeted additions:
- non-winning purge attempt on a central with no agenda → `null` (guards the narrowed `_purgeServerHasStakes`)
- unmodeled virus counters on an irrelevant card → `null`, counters untouched (guards against over-triggering on raw counter totals)
- Clot / bypass-breaker / virus-counter restoration tests all now assert the *array* is restored to its exact original contents (`deepStrictEqual(runner.cards, [...])`), not just that a flag got cleared — this is a meaningfully stronger assertion than the pre-correction tests had, since it's specifically checking the thing that was wrong before (array membership, not a flag)
- a new test for `AIPreventsPurgeTrash` confirms the card stays in play and the purge is correctly evaluated as not worth it in that case
- `Math.random` is stubbed to throw inside the determinism test, so a regression to RNG-based purge would fail loudly rather than just flaking

**Gap:** no test has two purge-trash cards sharing one `cardLocation` array, so the reverse-order removal logic's specific reason for existing isn't directly exercised. Given how easy off-by-one index bugs are to reintroduce silently in a later edit, I'd add one case with (for example) two Clots hosted in the same array before calling this fully covered.

## Docs

`documentation/ai.md` and the improvement roadmap's Layer 7.3 entry are both updated to describe the corrected mechanism (removal from installed state, not a `disabled` flag) and the new `AIPreventsPurgeTrash` hook, including it in the AI hook reference table. Consistent with the code.

# Backlog: Deckbuilder economy/draw pools shouldn't rely on hardcoded ID lists

**Context:** Raised during code review of the 18 Sept commits (`0df0a79` — deckbuilder generalisation to use all legal sets). See finding 4 in `chiriboga-code-review-2026-09-18.md`.

## The problem

`DeckBuildFromAllowedSets()` in `utility.js` fills part of each generated deck from fixed, hardcoded numeric-ID lists — e.g.:

```js
var runnerEconomy = DeckBuildFilterAllowedCards(
  [30007, 30018, 30020, 30027, 30029, 30030, 30033, 31010, 31011,
   31015, 31024, 31034, 31035, 31037, 31038, 33005],
  allowedSetCodes,
);
var runnerDraw = DeckBuildFilterAllowedCards(
  [30002, 30011, 30021, 30034, 31004, 31027, 31028, 31036, 31039, 33004],
  allowedSetCodes,
);
```
...and similarly for `corpEconomy`. These lists span several existing sets but obviously can't include ids from a set that hadn't been implemented yet at commit time (e.g. Vantage Point, ids 36000+, landed in the very next commits). As more sets ship, their economy/draw cards will never be picked up by these curated pools — only by the generic `nonAgenda` catch-all fill at the end, which is ELO-ranked but archetype-blind.

## Why "just delete the list and let ELO handle it" doesn't work

ELO (used by `DeckBuildAddFromPool`'s "pick 2 candidates, keep the higher-ELO one" tournament) is a general power/popularity signal, not an archetype tag. It answers "is this a strong card," not "does this generate credits" or "does this draw cards." Filling the whole deck from the general pool by ELO alone can plausibly produce decks with strong breakers/agendas and no economy or draw engine — a non-functional deck, not just a suboptimal one. The hardcoded lists exist specifically to *guarantee* those categories are represented before the general fill runs; deleting them removes that guarantee rather than just removing maintenance overhead.

## What's already in the codebase to build on

- `AIDrawInstall` exists today and is already used by some cards (e.g. Vantage Point's Nurse Hạnh) to signal "priority value for installing as a draw engine" — but it's not implemented on every card in the current `runnerDraw` list (several are one-shot events, which `AIDrawInstall` wasn't designed for).
- There is **no equivalent hook for "economy"** anywhere in the codebase yet.
- `ai_corp.js` already has a developer comment flagging this exact gap: *"could implement these on-card instead? (e.g. as `AIEconomyCard`) and move the check functions to there"* — so this has been identified before, just not acted on.
- Hardcoding by title/ID for per-card classification isn't unique to the deckbuilder — `_sufficientEconomy()`'s `rootUseCosts` list does the same thing. So today's approach is at least consistent with the rest of the codebase, not a one-off shortcut.

## Options, roughly in order of effort

### 1. Keep the lists, add a test that catches staleness (cheap, do this first)
Keep the current hardcoded-ID approach (it matches existing convention elsewhere in the codebase), but add a regression test asserting that every registered, non-hidden set contributes at least one card to each role list (`runnerEconomy`, `runnerDraw`, `corpEconomy`). That converts "silently goes stale as new sets ship" into "test fails until the list is updated" — the actual gap today.

### 2. Formal per-card classification tag (bigger, matches the codebase's own stated direction)
Add a lightweight, explicit hook at the card-definition level — something like `AIDeckbuildRole: "economy"` / `"draw"` — and have `DeckBuildCollectSetCards()` classify cards by that tag instead of (or alongside) the ID lists. New sets' cards get picked up automatically as long as whoever implements the card adds the tag; no `utility.js` edit required per set.

Costs/considerations:
- Requires retrofitting the tag onto the ~26 cards currently in the hardcoded lists (one-time job).
- Need to decide/document the tagging convention (e.g. does an event that draws cards once count the same as a persistent draw engine? Probably needs at least two role values, maybe a rough "strength" value too, similar in spirit to `AIDrawInstall`'s numeric priority).
- Realistically a "next set cycle" job, not a quick patch — touches every set file eventually.

## Recommendation

Do option 1 now (small, immediate, closes the actual "silent staleness" risk). Track option 2 as a proper backlog item — worth doing deliberately, not as a rushed follow-up patch, since it eventually touches every set file and the existing `AIEconomyCard` comment in `ai_corp.js` suggests there's appetite for this direction already.

## Open questions for whoever picks this up

- Should the "economy" tag also feed the Corp/Runner AI's own economy evaluation (`_sufficientEconomy` etc.), or stay deckbuilder-only? If it could serve both, that's a stronger case for doing option 2 sooner.
- Does `AIDrawInstall` get extended to cover events, or does draw get a separate, event-compatible hook?
- Do the existing hardcoded IDs get fully replaced by the tag, or kept as an explicit "always include if available" boost list on top of tag-based pooling (for known staples)?

# Hand keep and discard: shared design

Shared design for the `W` items. General rules are in
`documentation/ai-principles.md` and `documentation/runner-ai/principles.md`.

## Question and scope

Of the cards in the Runner's Grip, which are worth keeping, playing or
installing now, and which should be discarded first when the hand is full? This
covers:

- which Grip cards `_cardsWorthKeeping()` treats as worth keeping versus safe to
  discard at maximum hand size;
- the mulligan decision, which today mulligans when no card in the opening hand
  is judged worth keeping;
- which cards the generic decision loop plays or installs proactively;
- priority signals that are only read for cards already judged worth keeping
  (`AIEconomyInstall`, `AIEconomyPlay`, `AIDrawInstall`, `AIDrawTrigger`);
- the breaker-type coverage check used in that judgement;
- inspectable reasons and deterministic tests for keep/discard decisions.

Current behaviour: `documentation/runner-ai/architecture.md#keep-and-discard-decisions`.
Current coverage numbers (cards with a hook, subtype fallback only, or neither;
intent hooks that are dead code without `AIWorthKeeping`) are generated in
`documentation/card-status.md#runner-keep-coverage-playable-sets`. Quote that
file rather than hand counts.

## Area rules

1. **Centralise need computation; keep card logic for genuine synergy.** The
   question for the new tier is not "is this card good" (that is `elo`) but
   "does the Runner currently need what this card's declared role provides".
   Compute needs once per decision cycle and match them against declared roles
   generically. Keep hand-written `AIWorthKeeping` for logic that cannot reduce
   to a shared need (for example Conduit's counters or Docklands Pass's run
   timing).
2. **Explicit beats general beats fallback, strictly.** An explicit
   `AIWorthKeeping` result always wins over a matched need, which always wins
   over the ELO-ranked fallback. A card whose hook returns `false` stays
   excluded regardless of ELO or matched needs. (Today a subtype match can keep
   a card whose hook returned `false`; see the architecture section.)
3. **Every keep decision records which tier produced it and why.**

## Prior art

The Corp AI solves the equivalent problem in `_bestNonAgendaTutorOption()`: a
cascade of bespoke hooks, then board-state needs (`_sufficientEconomy()`,
affordable ICE), then a fallback that ranks by `elo` instead of excluding
anything.

## Proposed architecture

A needs record computed once per decision cycle:

```js
{
  needEconomy: bool,          // the main loop's prioritiseEconomy check, generalised
  needDraw: bool,             // the current/max overdraw check, generalised
  lockedOutServers: [...],    // servers whose cached run cost is Infinity
  missingBreakerTypes: [...]  // existing generic breaker checklist, kept as a secondary signal
}
```

Core helpers to refine during W1:

```js
_runnerNeeds(context);                 // computes the record above
_cardMatchesNeed(card, needs);         // hook-based matching
_cardsWorthKeeping(cards);             // explicit hook -> matched need -> subtype fallback -> ELO rank
_rankedDiscardCandidates(optionList);  // discard order aware of ELO among fallback-tier cards
```

`_cardsWorthKeeping()` keeps its external contract (it returns an array of
cards), so its consumers need no changes and benefit automatically.

## Test plan

Focused tests live in `tests/runner-worth-keeping.test.js` (created by W0).
Fixtures cover the cards listed as "intent hook but no `AIWorthKeeping`" in
`documentation/card-status.md`, Lampades, Sell Out and Tailgate, and a
representative set of cards already covered by a hook or the subtype fallback.
Any fixture that claims to respect the information boundary runs twice with
different hidden Corp cards.

## Definition of done for any W item

- The behaviour is implemented in `ai_runner.js` and the relevant card
  definitions.
- Deterministic tests cover success, failure and the information boundary.
- Existing AI and card tests pass, including `tests/vantagepoint-integration.test.js`.
- New or changed card-facing hooks are documented in `documentation/ai.md`.
- `documentation/runner-ai/architecture.md` describes the new behaviour.
- Decisions stay explainable: which tier produced a keep or discard, and why.

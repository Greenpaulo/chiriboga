# Engine: Tailgate's successful-run flag is never set, so its bonus HQ access never fires

**Source log:** `documentation/debug-logs/bug_raised/tailgate_access_2_additional_hq_cards_didnt_fire.txt`
**Reproduction:** `tests/pending/tailgate-hq-access-not-granted.test.js` — `node tests/pending/tailgate-hq-access-not-granted.test.js` (drafted, not yet run)

## Summary
Tailgate ("Run HQ. If successful, access 2 additional cards when you breach
HQ.") never grants its bonus accesses. The Runner plays it, the run on HQ
succeeds, but only the normal 1 card gets accessed instead of 3. The card's
`responseOnRunSuccessful` hook is written to expect a `server` parameter, but
the engine's automatic-trigger dispatch for this hook never passes one, so
the check that should flag the run as successful always fails silently.

## Evidence
`documentation/debug-logs/bug_raised/tailgate_access_2_additional_hq_cards_didnt_fire.txt`:
- Line 587: `Played Tailgate`
- Line 607: `Run successful`
- Line 608: `Empiricist accessed` — only one card, though Corp HQ held 5 cards
  (line 568) and Tailgate should add 2 more accesses
- Line 609: `Run ends` — no further accesses happened

## Root cause
`sets/vantagepoint.js:1054-1059` (Tailgate):
```js
responseOnRunSuccessful: {
  Resolve: function (server) {
    if (server == corp.HQ) this.runWasSuccessful = true;
  },
  automatic: true,
},
```
This callback fires through the phase-based "response" trigger system
(`phases.runSuccessful.triggerCallbackName = "responseOnRunSuccessful"`,
`phase.js`). For automatic hooks, that system's `AddTriggersToTriggerList`
invokes the callback as:
```js
initialList[i].card[triggerName].Resolve.call(initialList[i].card);  // phase.js:332
```
— with **no arguments**. So `server` is always `undefined`,
`server == corp.HQ` is always false, `this.runWasSuccessful` is never set,
and `modifyBreachAccess` (`vantagepoint.js:1060-1065`) always returns 0.

- [Inferred] `server` is undefined whenever this hook fires as an automatic
  trigger through `AddTriggersToTriggerList`, per the call at `phase.js:332`.
- [Inferred] This is a card-authoring mistake, not a missing engine feature:
  other cards using the same "run this server myself, then check
  `responseOnRunSuccessful`" pattern (e.g. Legwork,
  `sets/systemupdate2021.js:1332`, and the Archives-install event at
  `sets/systemupdate2021.js:243`) take **no parameter** and unconditionally
  set `this.runWasSuccessful = true`, since the event's own `Resolve`
  already guarantees which server was run. Tailgate is the only one of
  these that added an unnecessary, unsatisfiable `server` check — it looks
  copied from an `automaticOnBreach`/`AutomaticTriggers`-style hook (e.g.
  Docklands Pass, `sets/systemgateway.js:1080`), which *is* called via
  `AutomaticTriggers(name, [attackedServer])` and does receive its
  parameter (`utility.js:3709-3712`), unlike `responseOnRunSuccessful`.
- [Inferred] The existing unit coverage in
  `tests/vantagepoint-integration.test.js` does not catch this because it
  calls `tailgate.responseOnRunSuccessful.Resolve.call(tailgate,
  context.corp.HQ)` directly — manually supplying the parameter the real
  dispatch path never provides.

## Proposed fix
Change Tailgate's `responseOnRunSuccessful.Resolve` to match the working
Legwork/archives-event pattern: drop the `server` parameter and the
conditional, and unconditionally set `this.runWasSuccessful = true`, since
Tailgate's own `Resolve` already only ever calls `MakeRun(corp.HQ)`.
This is a single-file, single-card fix with no engine or AI-hook changes, so
no implementation plan is needed per the plan gate in
`.agents/skills/implement-ticket/SKILL.md`.

Rejected alternative: fixing `AddTriggersToTriggerList` (`phase.js`) to pass
`attackedServer` (or a generic parameter) to automatic `responseOn*`
resolvers. That would be the more "general" engine fix and would also bring
it in line with `AutomaticTriggers`'s behaviour, but it changes an engine
function with many callers across many cards' `responseOn*` hooks — out of
scope here per the plan gate; worth a separate ticket/backlog item if other
`responseOnRunSuccessful`/similar hooks are ever found relying on an unpassed
parameter.

## Acceptance gate

N/A — deterministic fix with a single correct outcome

## Acceptance criteria
- [ ] The reproduction passes and has moved into the green suite (`tests/`),
      expectation unchanged (2 additional accesses after a successful HQ
      run via Tailgate).
- [ ] `tests/vantagepoint-integration.test.js`'s existing Tailgate assertions
      are updated to call `responseOnRunSuccessful.Resolve` the way the real
      engine does (no arguments), not with a manually supplied `server`.
- [ ] `node tests/run-all-tests.js` passes.

## Out of scope / related
- Whether other cards using `responseOnRunSuccessful` (or other
  phase-dispatched `responseOnX` hooks) with `automatic: true` also
  wrongly expect a parameter — not found in a full-repo scan while
  investigating this ticket, but not exhaustively checked against gameplay.

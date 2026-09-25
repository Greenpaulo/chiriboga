# Install decisions: shared design

Shared design for every `I` item. Each item's spec names only what is specific
to that phase; this note holds the question, principles, architecture, test
plan, migration strategy and definition of done they share.

## Question and scope

The server-security area (`L` items) answers:

> How vulnerable, valuable, or urgent is each server?

The install area answers the next decision:

> Given that evaluation, what should the Corp install, where should it install
> it, and is installing it better than another available action?

The two systems remain separate but composable. Server security and public
Runner threat evaluation supply inputs to install planning; install planning
must not duplicate or weaken their information-boundary rules. Shared
deterministic-RNG, hypothetical-evaluation, decision-cache and batch-harness
infrastructure belongs to the `F` items.

The area covers Corp decisions involving:

- which ICE to install and on which server;
- which agenda, asset, ambush, or upgrade to install in a server root;
- whether a remote should be used for scoring, economy, bait, bluffing, defense,
  or disposable value;
- whether installing is preferable to gaining credits, playing an operation,
  advancing, rezzing, or waiting;
- sequencing related actions across the remaining Corp clicks and, eventually,
  across turns;
- preserving enough credits to rez and use the installed cards;
- producing inspectable reasons for install decisions and deterministic tests
  for them.

Card-hook work covers the playable sets listed in `documentation/card-sets.md`
unless an item states a different scope.

Whenever an item introduces or changes a card-facing AI hook, update
`documentation/ai.md` in the same change: signature, semantics, valid
information sources, out-of-run safety constraints, and at least one
card-definition example.

## Principles

The general principles (imperfect information, hooks over titles, tactical
safety, explainable and deterministic decisions, no unsafe state mutation) are
in `documentation/corp-ai/principles.md`. Two principles are specific to
install planning:

### Compare marginal outcomes

The relevant question is not whether a card has a positive generic value. It
is:

> How much better is the resulting board after this card is installed in this
> destination, compared with the current board and competing actions?

ICE and defensive upgrades are scored primarily by changes in security and
breach consequences, not printed rez cost as a proxy for strength.

### Separate capability, affordability, and commitment

The planner must distinguish:

- whether a card could provide the desired effect;
- whether the Corp can pay to install it now;
- whether the Corp can afford to rez and use it when required;
- whether spending those credits prevents other necessary defenses or scoring
  actions.

Installing unrezzable protection must not be credited as if it were active, but
delayed investment can still have bounded bluff or future value.

## Proposed architecture

### Install candidate record

A normalized candidate shape along these lines:

```js
{
  card: card,
  server: server,              // null means a new remote where legal
  kind: "ice" | "root",
  role: "protection" | "scoring" | "economy" | "trap" |
        "defensive" | "bluff" | "disposable",
  score: 0,
  scoreBreakdown: {},
  reasons: [],
  legal: true,
  rejectionReasons: [],
  immediateCost: 0,
  reservedCost: 0,
  securityBefore: null,
  securityAfter: null,
  protectionDelta: 0,
  plan: []
}
```

Names and exact fields may change during implementation, but every option must
be comparable and diagnosable without mutating the actual game.

Install planning must not be reduced to one globally chosen server. A server
can be the most urgent in the abstract while every ICE available for it is
illegal, unaffordable, redundant, or strategically weaker than a concrete
install on the next server. Candidate generation and ranking preserve both the
card and destination dimensions until feasibility and marginal outcome have
been evaluated.

### Core helpers

Candidate APIs to refine in I1:

```js
_enumerateInstallCandidates(cards, context);
_evaluateInstallCandidate(card, server, context);
_rankedInstallCandidates(cards, context);
_hypotheticalServerAfterInstall(card, server);
_installRoleForCard(card, server, context);
```

`_rankedInstallOptions()` may remain as a compatibility wrapper while callers
migrate. Engine-facing preferences still resolve back to the existing
`{cardToInstall, serverToInstallTo}` form.

### Score discipline

Avoid one unexplained aggregate formula. Score components are bounded and
named, for example:

```js
{
  tacticalSafety: 8,
  securityGain: 5,
  scoringValue: 0,
  economyValue: 2,
  deceptionValue: 0.5,
  installCost: -1,
  reserveCost: -3,
  opportunityCost: -2
}
```

Hard rejection rules stay separate from soft score penalties. An illegal Region
placement or unsafe match-winning agenda exposure must not merely receive a
lower numerical score.

## Cross-cutting test plan

Create a focused install-decision test file, expected initially as
`tests/corp-install-decisions.test.js`. Keep server-security mechanics in
`tests/corp-server-security.test.js`; install tests may rely on those public
interfaces but should not duplicate their complete implementation coverage.

Minimum fixture matrix:

| Dimension | Required cases |
| --- | --- |
| Server | naked HQ, naked R&D, Archives backdoor, empty remote, scoring remote, economy remote, trap remote |
| Security | hard lockout, soft credit lockout, affordable breach, no matching breaker, public bypass, hidden-threat risk only |
| Corp economy | cannot install, can install but not rez, can rez one candidate, rich enough for route, credits reserved elsewhere |
| Root card | agenda, economy asset, Ambush, disposable asset, scoring upgrade, defensive upgrade |
| Game state | opening, agenda flood, normal midgame, Corp match point, Runner match point, last click, multiple insecure servers |
| Runner pressure | balanced, HQ pressure, R&D pressure, non-interactive pressure, compatible breaker, missing breaker subtype |

The server/economy cross-product must specifically include:

- a Baker-backdoored Archives competing with R&D that has existing unrezzed ICE;
- multiple insecure servers where only the lower-ranked server has an
  affordable and materially effective ICE candidate;
- a highest-ranked server with legal but strategically ineffective ICE choices;
- a state where gaining one credit unlocks decisive protection for the first
  server, contrasted with a state where protecting the second server now is
  better than waiting.

All fixtures that purport to test imperfect information run at least twice
with different hidden Runner Grip/Stack contents and assert identical choices.

## Compatibility and migration strategy

1. Do not rewrite `_rankedInstallOptions()` wholesale in the first
   implementation.
2. Introduce normalized candidates behind a compatibility wrapper.
3. Preserve existing card hooks and translate their results into candidate
   constraints or score components.
4. Migrate one decision class at a time: ICE, roles, agendas, assets, upgrades,
   then action sequencing.
5. Keep legacy selection available as a fallback during calibration.
6. Remove obsolete branches only when deterministic fixtures and seeded
   simulations show that the replacement covers their purpose.
7. Treat `_serverToProtect(..., targetIsEligible)` as an interim compatibility
   bridge. Retire its use in ordinary ICE-install generation once joint
   `(ICE, server)` candidates perform legality, affordability, and
   marginal-value comparison directly; retain the underlying server ranking for
   diagnostics and consumers that genuinely need a server-only answer.

Card hooks remain narrow descriptions of card mechanics or tactical
suitability. They must not each recreate the global server-selection algorithm.

## Explicit non-goals for the initial items

- A complete adversarial game-tree search.
- Reading or predicting exact hidden Runner cards.
- Perfect multi-turn planning based on unknown draws.
- Replacing the completed server-security calculator.
- Rebalancing every card set before the scoped sets are validated.
- Using machine-learned opponent fingerprinting or persistent cross-game player
  profiles.
- Treating all numerical value estimates as exact economic truth; bounded
  heuristics with regression evidence are sufficient.

## Things to consider: edge cases and mitigations

### 1. The "derelict remote" problem (I3, I5)

- **Scenario:** The Corp installs a temporary economy asset (e.g. _Pad
  Campaign_ or _Mumba Temple_) into a remote with 1 ICE. Later the asset is
  trashed or used up, leaving an empty remote with 1 ICE.
- **Danger:** I3 might categorize this server as `disposable` or
  `uncommitted`, while I4 treats it as a non-scoring server. The Corp might
  repeatedly spin up new remotes for agendas instead of recycling its existing
  1-ICE server.
- **Mitigation:** `_remoteRole(server)` dynamically evaluates an empty server's
  upgraded potential rather than being permanently locked to its historical
  role.

### 2. Hidden cost collisions in multi-click planning (I8)

- **Scenario:** A 2-click plan evaluates `Click 1: Install ICE on HQ` ->
  `Click 2: Install Agenda in Remote 1`.
- **Danger:** Click 1 incurs an install credit cost equal to the current ICE
  count on HQ. If Click 2 also considers installing another card or triggering
  an ability whose cost depends on available credits, its credit budget must
  reflect `Credits - ImmediateCost(Click 1)`.
- **Mitigation:** The candidate evaluation pipeline explicitly tracks a
  projected credit pool (`projectedCredits`) across multi-action sequences so
  it does not double-count available funds.

### 3. Protection debt versus strategic sacrifice (I2, I7)

- **Scenario:** HQ or R&D is deeply vulnerable, creating high protection debt,
  so I2 aggressively ranks ICE installs on centrals. However, the Corp is at 5
  points and holds a winning agenda in hand with a secure scoring remote
  available.
- **Danger:** Central pressure score overpowers the immediate winning agenda
  line.
- **Mitigation:** I7 tactical overrides act as a hard short-circuit: if
  `ScoreWinProbability >= 1.0`, all central protection debt checks are
  suppressed in favour of the winning sequence.

## Definition of done for any item

An item is complete only when:

- the scoped behaviour is implemented in `ai_corp.js` and relevant card
  definitions;
- deterministic regression tests cover success, failure, affordability, and
  imperfect-information boundaries;
- existing security and AI tests still pass;
- any new or changed card-facing hooks are documented in `documentation/ai.md`;
- `documentation/corp-ai/architecture.md` describes the implemented behaviour,
  cards updated, remaining limitations, and calibration follow-ups;
- hypothetical evaluation is proven not to mutate live game state;
- logs or score breakdowns make the selected choice explainable;
- no speculative follow-up is mislabeled as completed behaviour.

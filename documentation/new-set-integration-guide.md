# Adding a Card Set

This is the project checklist for adding a set and taking its cards all the way
from metadata to playable, AI-aware implementations. The short notes at the top
of `config.js` are a registry reference; this document is the complete workflow.

Use these companion references while implementing cards:

- `documentation/engine_patterns.md` — established patterns for card mechanics.
- `documentation/ai.md` — AI hook contracts and examples.
- `documentation/card-implementation-backlog.md` — known unfinished cards and
  the current ELO audit.

## 1. Decide the scope before adding the set

Record the set's display name, short code, card list, legal formats and a fresh
numeric ID range. A registered set may be loaded into the browser even while it
is hidden, so `hidden: true` is not a substitute for safe card definitions.
Keep an incomplete set `untested: true`, and normally `hidden: true`, until its
mechanics and AI behaviour have been reviewed.

Existing ranges are defined by `setRegistry.availableSets` in `config.js`.
Check that the new range does not overlap any of them. Do not infer the next
range from the largest card ID; reserve and document the whole range.

## 2. Confirm metadata and local images

Add the set's cards to `carddata/carddata.json`. In particular, each entry needs
a card `code`, `title` and `pack_code` matching the new registry code. The
deckbuilder uses this data for card details and set filtering.

The repository's root `images/` directory already contains a JPG for every card
code currently present in `carddata/carddata.json`. Do not redownload those
images while adding a set that is already in the metadata. Definitions normally
use `imageFile: "<code>.png"`; the existing image helper converts that name to
the local `<code>.jpg` path.

If new metadata introduces genuinely new codes, run `python3 download_images.py`
from the repository root. It reads `carddata/carddata.json`, writes directly to
the runtime `images/` directory and skips files already present. The older
`download-all-images.py` currently expects a different JSON location and writes
to `assets/images/cards/<pack>/`, which is not the path used by the app.

Metadata does not implement a card. A card is playable only after it also has a
definition in the set file.

## 3. Scaffold the set file

`scaffold_set.py` creates definitions from the local metadata and preserves
card IDs that are already present in the target set file:

```sh
python3 scaffold_set.py <pack_code>
```

If the pack is new to the script, first add its pack code, target filename and
set identifier to `PACK_MAP`. The target filename must match the `file` value
that will be registered in `config.js`.

The generated objects contain metadata fields, type-specific boilerplate and
explicit TODO markers. They are scaffolds, not working cards: every rules-text
ability, AI hook and Trash or Busto ELO still has to be implemented and tested.
Review the generated diff before doing that work.

For a new file the scaffolder also adds:

```js
setIdentifiers.push("code");
```

## 4. Register the set

Add the set to `setRegistry.availableSets` in `config.js`:

```js
yourset: {
  file: "yourset",
  code: "code",
  name: "Your Set",
  hidden: true,
  untested: true,
  idRange: [36000, 36065],
},
```

The registry is used to load set scripts, populate settings, map card IDs back
to set codes and build format-aware random-deck pools. The `file`, `code` and
`idRange` therefore need to agree with the set file and card data.

Also update the range table in the `config.js` header.

## 5. Define every card's game mechanics

Each card is assigned to its reserved ID:

```js
cardSet[36001] = {
  title: "Example Card",
  imageFile: "36001.png",
  elo: CARD_ELO_FROM_TRASH_OR_BUSTO,
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "program",
  subTypes: ["Icebreaker", "Decoder"],
  installCost: 3,
  memoryCost: 1,
  // mechanics and AI hooks
};
```

Use `engine_patterns.md` and a working card with comparable rules text. Do not
leave an empty `Resolve`, empty subroutine array or comment-only placeholder in
a set that is marked complete. Implement all costs, restrictions, prevention,
triggers, choices, lingering effects, reset points and unusual hosting rules.

At minimum, check the structural fields relevant to the card type:

| Applies to | Required fields used by loading/deckbuilding |
| --- | --- |
| Every card | `title`, `imageFile`, `player`, `faction`, `cardType`, `subTypes`, finite numeric `elo` |
| Identity | `deckSize`, `influenceLimit` |
| Non-identity, non-agenda | finite numeric `influence` |
| Agenda | `advancementRequirement`, finite numeric `agendaPoints` |
| Installed card | appropriate install/rez and trash/memory/strength fields |

The exact mechanics require more than these fields; this table only prevents
the most common loading and deckbuilding omissions.

## 6. Implement AI support while implementing the card

Read `documentation/ai.md`, then add the hooks that describe how the AI should
value and use the card. Do this in the same change as the mechanics rather than
treating AI as a later polish pass.

Common checks include:

- Icebreakers: `AIImplementBreaker`; special breakers may also need
  `AISpecialBreaker`, `AIMatchingBreakerInstalled` or
  `AIHostedBreakContribution`.
- ICE: `AIImplementIce`, using the documented subroutine classifications.
- Economy, draw and install targets: the relevant `AIEconomy*`, `AIWould*`,
  `AIWorthKeeping`, install-choice and trash-choice hooks.
- Run events and run abilities: potential, credit, access, redirect and bypass
  hooks as applicable.
- Corp agendas, operations, assets and upgrades: advancement, scoring,
  placement, defensive-value and play-timing hooks as applicable.
- Cards that alter ICE strength or subtypes: the declarative security-planning
  hooks documented in the Runner section of `ai.md`.

Not every card needs every hook. It does need every hook required for the AI to
understand its meaningful decisions. Exercise both a human player using the
card and an AI player controlling or evaluating it.

### ELO is required

Give every definition a finite numeric `elo`. Look up the card on the
[Trash or Busto rankings](https://trash-or-busto.herokuapp.com/ranking) and
copy its published ELO exactly. Do not estimate it, tune it locally or derive it
from similar cards. The ranking is the source of truth for this property.
Record the lookup date in the set header, following `systemgateway.js` and
`systemupdate2021.js`, because the rankings can change as more votes are added.

`CARD_ELO_FROM_TRASH_OR_BUSTO` in the template above is deliberately not a
numeric default: replace it with the card's published value before committing
the definition. ELO is used for AI and random-deck preference decisions; it is
not merely display metadata.

The format-aware random deckbuilder defensively substitutes `1500` when ELO is
missing. That is runtime protection for legacy omissions, not an authoring
default; other AI call sites still read `card.elo` directly. See the current
audit in `card-implementation-backlog.md`.

## 7. Declare where the set is legal

Add the set's code to each applicable `formatRegistry.<format>.sets` array in
`config.js`. Add every released set to Eternal. Add the registry key (not the
short code) to `setRegistry.decklauncherSets` or
`setRegistry.gauntletSets` only when it should be selected by default there.

No card-ID list needs to be added to `utility.js`. In Custom Game mode,
`DeckBuildCollectSetCards()` derives the random-deck pool from all loaded cards
whose set codes are legal for the selected format. It classifies cards using
`player`, `cardType` and `subTypes`, and excludes definitions with unusable
influence or agenda-point data.

This means registration and card fields are the integration points. A new set
with correct definitions automatically becomes available to random decks in
every format that lists its code.

## 8. Verify the integration

Before removing `hidden` or `untested`:

1. Confirm every intended metadata card has exactly one engine definition and
   every engine definition maps to the correct metadata and image.
2. Search the new set file for `TODO`, empty `Resolve` functions, empty
   subroutine arrays and commented-out trigger stubs.
3. Test each card's mechanics, including cancellation, prevention, once-per-
   turn state and turn/run/encounter cleanup.
4. Test each meaningful AI hook with the relevant AI side active.
5. Generate Runner and Corp random decks in every legal format. Confirm deck
   size, agenda points, influence, copy limits, side and set legality.
6. Run the relevant card tests and the integration tests:

```sh
node tests/eternal-format.test.js
node tests/deckbuild-format-pool.test.js
node tests/decklauncher-identity-change.test.js
```

7. Run syntax checks for every edited JavaScript file and `php -l` for every
   edited PHP file.
8. Update `documentation/card-implementation-backlog.md`: remove completed
   entries, add any accepted limitations, and refresh its ELO counts if card
   definitions changed.

## Definition of done

A set is complete only when its intended cards are represented in metadata and
the set file; images resolve; rules work for human players; required AI hooks
and ELO values exist; legal formats and defaults are correct; random decks can
use the cards legally; and automated plus manual checks pass. Merely loading a
set without errors is not completion.

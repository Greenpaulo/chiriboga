# Runner AI documentation

Documentation for the Runner AI (`ai_runner.js`, with `runcalculator.js`). How
the files, statuses, IDs, template and commands work is shared with the Corp AI
and described in [../ai-planning.md](../ai-planning.md).

| File | Holds |
|---|---|
| [principles.md](principles.md) | Runner-specific rules, on top of [../ai-principles.md](../ai-principles.md) |
| [architecture.md](architecture.md) | How the implemented Runner AI works today |
| [roadmap.md](roadmap.md) | One entry per item (areas W and D) |
| [specs/](specs/) | Specs for `proposed` items, plus the hand-keep design note |
| [legacy/](legacy/) | The previous Runner AI roadmap, kept for comparison only |

Measured coverage (which Runner cards the keep/discard logic understands) is
generated in [../card-status.md](../card-status.md#runner-keep-coverage-playable-sets).

**Agents:** do not read `legacy/`. For an item, read `../ai-principles.md`,
`principles.md`, the item's ticket or spec, the design note it names, and only
the `architecture.md` sections it links to.

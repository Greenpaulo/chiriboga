# Chiriboga — Netrunner Browser Game

## Project Overview

This is a browser-based implementation of the Netrunner card game.

## IMPORTANT: Read Before Implementing Cards

**Before looking up any engine patterns or functions, read this file first:**

```
documentation/engine_patterns.md
```

This file contains ALL trigger hooks, engine function signatures, subroutine shapes, and copy-paste-ready patterns. **Do NOT read `systemgateway.js`, `elevation.js`, or `mechanics.js` to look up patterns** — they are huge files and will waste tokens. The patterns doc has everything you need.

## Architecture Quick Reference

- **Card definitions**: `sets/*.js` — each card is `cardSet[ID] = { ... }`
- **Set registry**: `config.js` → `setRegistry.availableSets` (controls visibility, decklauncher)
- **Decklauncher filter**: `decklauncher.php` — filter labels in `customSetFilterLabels`
- **Engine core**: `mechanics.js`, `phase.js`, `checks.js`, `command.js`, `utility.js`
- **Scaffolding script**: `scaffold_set.py` — run `python3 scaffold_set.py <code>` to stub missing cards

## Current Card Set Work

### Downfall (set code: `df`, file: `sets/downfall.js`)

- **Config**: `hidden: false, untested: false`, included in `decklauncherSets`
- **Decklauncher**: DOWNFALL filter added
- **Batch 1 (21 cards)**: ✅ Complete — see `documentation/engine_patterns.md` for implemented list
- **Remaining**: ~42 cards still stubbed — see batch estimates in conversation history

### Batch 2 candidates (easy tier, ~14 cards):

26042 Public Health Portal, 26007 Fencer Fueno, 26009 Trickster Taka,
26043 Storgotic Resonator, 26038 Cold Site Server, 26062 Reduced Service,
26055 Divested Trust, 26056 SDS Drone Deployment, 26063 Vulnerability Audit,
26047 Remastered Edition, 26017 "Baklan" Bochkin, 26008 The Nihilist,
26019 Lat (identity), 26039 Hyoubu Institute (identity)

## Engine Notes

- `utility.js` `ChoicesEncounteredSubroutines()` checks `!subroutine._lockedFromBreak` — required for Afshar
- `attackedServer` is global during a run; `approachIce` is the index in `server.ice[]`
- Phase `"Corp 2.2"` = corp action phase; `"Runner 1.3"` = runner action phase
- `automatic: true` on a trigger = fires without player decision
- `availableWhenInactive: true` on `modifyInstallCost` = fires even when card not rezzed

## Workflow for Card Implementation Sessions

1. Read `documentation/engine_patterns.md` (this is your only pattern reference)
2. Read the target card stubs from `sets/downfall.js` (grep for `TODO`)
3. Implement all cards in the batch in as few file edits as possible
4. Run `node -c sets/downfall.js` to verify syntax
5. Do NOT re-read large source files unless the pattern doc is truly insufficient

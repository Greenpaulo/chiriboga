# F4 Seeded AI-vs-AI batch harness

**Roadmap item:** F4 · **Depends on:** none · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`

## Goal
Provide a repeatable batch runner with fixed deck pairs, outcome metrics and per-decision latency, so every acceptance gate that says "seeded simulations" has something to run against, and a baseline exists before behaviour changes (review finding 12).

## Current behaviour
There is no seeded batch runner. The pieces exist but nothing joins them up: `decks.js` (fast AI-vs-AI debug mode), `tests/corp-server-security.test.js` (stubs the engine in `vm`), `gauntlet.php` (solo campaign seeding only), `deck/seedrandom.min.js`, and `CorpAI.GameEnded(winner)` in `ai_corp.js`, an empty stub. F1's `CorpAI._random` seam allows AI policy randomness to be seeded. See [architecture: foundations](../corp-ai/architecture.md#foundations).

## Design
Build a headless or browser-driven runner that:

- seeds with `Math.seedrandom(seed)`, injecting the seeded generator into Corp AI policy through F1 (`CorpAI._random`) rather than replacing global randomness for AI policy;
- uses fixed deck pairs;
- logs points scored and stolen, wins, and per-decision latency;
- stores a baseline before Install Phase 1.

Natural collection hook: implement `CorpAI.GameEnded(winner)` (currently an empty stub) to record the result.

## Safety and information boundary
- Seed Corp AI policy only through F1's `CorpAI._random` seam; new Corp AI policy must not call global `Math.random`, `RandomRange` or `Shuffle` directly. Gameplay randomness and engine shuffles remain owned by the engine.

## Test scenarios
1. Two runs with the same seed and deck pair produce the same result.
2. The runner reports points scored/stolen, win/loss and per-decision latency for a batch.

## Acceptance gate
A baseline is captured and stored before Install Phase 1 begins, and Install Phase 0 references this runner instead of creating a second one.

## Things to consider
- The findings' author may have missed an existing runner; confirm there is none before building.
- Consumers: review finding 4 (mulligan) calibrates against this; F3 measures call count and latency with it; review findings 1, 2 and 3 use it to validate evaluator and purge changes; L3.5.1, L5.1 and L7.1 need it for their acceptance gates.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
- [ ] Install Phase 0 references this runner.

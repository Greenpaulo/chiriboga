# Corp AI finding 12: No seeded AI-vs-AI batch harness

**Source:** `documentation/backlog/corp_ai_review_findings.md`, item 12.
**File:** New runner. Relevant existing pieces: `decks.js` (~780, fast AI-vs-AI debug mode), `tests/corp-server-security.test.js` (stubs the engine in `vm`), `gauntlet.php` (solo campaign seeding only), `deck/seedrandom.min.js`, and `CorpAI.GameEnded(winner)` (`ai_corp.js` ~5789), an empty stub.
**Belongs in:** Foundations doc F4, `documentation/corp-ai/roadmaps/corp_ai_foundations_roadmap.md`. Install Phase 0 should reuse it rather than build its own.
**Suggested order:** Step 1 of 5 — do this first, before any behaviour change, so there is a baseline.
**Depends on:** Foundations F1 (finding 9) for seedable randomness through `this._random`.

---

## Problem

Every acceptance gate in both roadmaps says "seeded simulations", but there is no runner for them. The pieces exist (`decks.js` AI-vs-AI mode, `seedrandom.min.js`, the `GameEnded` stub) but nothing joins them up. *Note the findings' author may have missed an existing runner — confirm before building.*

## Proposed fix — build a headless or browser-driven runner that

- seeds with `Math.seedrandom(seed)`;
- uses fixed deck pairs;
- logs points scored and stolen, wins, and per-decision latency;
- stores a baseline before Install Phase 1.

Natural collection hook: implement `CorpAI.GameEnded(winner)` (currently an empty stub) to record the result.

## Tests / acceptance criteria

- Two runs with the same seed and deck pair produce the same result.
- The runner reports points scored/stolen, win/loss, and per-decision latency for a batch.
- A baseline is captured and stored before Install Phase 1 begins.
- Install Phase 0 references this runner instead of creating a second one.

## Consumer notes

- Finding 4 (mulligan) calibrates against this.
- Finding 11 (evaluate once) measures call-count/latency with this.
- Findings 1, 2 and 3 use it to validate evaluator/purge changes.

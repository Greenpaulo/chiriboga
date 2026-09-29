# Corp AI: Shared Engineering Foundations

This roadmap owns infrastructure shared by the server-security and install-decision roadmaps. It does not define card policy or introduce card-facing AI hooks.

## Status

| Foundation | Status | Tracking |
| --- | --- | --- |
| F1: Injectable, seedable randomness | Completed | Corp AI finding 9 |
| F2: Guarded hypothetical evaluation | Partially completed | Corp AI findings 10 and 11 |
| F3: Per-decision evaluation cache | Proposed | Corp AI finding 11 |
| F4: Seeded AI-vs-AI batch harness | Proposed | Corp AI finding 12 |

## F1: Injectable, Seedable Randomness — `[COMPLETED]`

`CorpAI._random` is the single randomness seam for Corp decision policy. It defaults to `Math.random`, and deterministic tests or simulation harnesses may replace it with a seeded function returning a value in the same `[0, 1)` range. New Corp AI policy must not call global `Math.random`, `RandomRange`, or the engine's `Shuffle` helper directly.

Random choices must also have an explicit lifetime. Persistent deception postures cache their roll with the relevant card or server. Transient asset-destination tie-breaks are cached for one `Choice` and reused when install options are evaluated repeatedly during that decision. `_shuffleCopy()` preserves caller-owned rankings while consuming the injected RNG.

This seam governs AI policy only. Gameplay randomness and engine shuffles remain owned by the engine and are outside F1.

Regression coverage verifies that equal seeds produce equal destination orders, caller-owned arrays remain unchanged, global `Math.random` is not consulted after an RNG is injected, and repeated destination ranking consumes only one tie-break per decision.

## F2: Guarded Hypothetical Evaluation — `[PARTIALLY COMPLETED]`

`_withHypothetical(apply, evaluate, restore)` provides exception-safe restoration for migrated planning probes. Finding 10 tracks remaining unsafe mutations and the accidental array comparison; finding 11 tracks its interaction with decision-scoped caching.

## F3: Per-Decision Evaluation Cache — `[PROPOSED]`

Finding 11 owns a cache for repeated deterministic security evaluation within one `Choice`. It must be cleared at decision boundaries and bypassed during hypothetical state changes. The small F1 destination-order cache establishes the decision-lifetime pattern but does not cache security results or complete F3.

## F4: Seeded AI-vs-AI Batch Harness — `[PROPOSED]`

Finding 12 owns a repeatable batch runner with fixed deck pairs, outcome metrics, and per-decision latency. It should inject its seeded generator through F1 rather than replace global randomness.

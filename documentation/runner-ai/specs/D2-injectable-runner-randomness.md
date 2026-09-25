# D2 Injectable randomness for the Runner AI

**Roadmap item:** D2 · **Depends on:** none · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/runner-ai/principles.md`

## Goal
Give the Runner AI an injectable, seedable randomness source, as the Corp AI
has with `CorpAI._random`, so its decisions are reproducible in tests and
seeded simulations.

## Current behaviour
Run selection adds jitter to each server's potential with `Math.random()`
directly, re-rolled every time potentials are computed. See
[architecture: run selection and the run calculator](../architecture.md#run-selection-and-the-run-calculator).

## Design
- Add a `_random` property to the Runner AI, defaulting to `Math.random`.
- Route all Runner AI policy randomness through it.
- Give the server-potential jitter an explicit lifetime (for example one
  decision) so repeated evaluation within a decision does not re-roll.

## Safety and information boundary
Engine and gameplay randomness are unchanged.

## Test scenarios
1. With a seeded `_random`, identical boards produce identical run choices.
2. Global `Math.random` is not called by Runner AI policy after `_random` is
   injected.
3. Repeated potential evaluation within one decision uses one jitter roll per
   server.

## Acceptance gate
Runner AI policy has no direct calls to global randomness, and seeded runs are
reproducible.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] The side's `architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.

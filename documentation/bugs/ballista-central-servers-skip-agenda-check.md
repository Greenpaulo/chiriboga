# Corp AI: Ballista always trashes a program instead of ending the run when protecting a central server, even with an agenda sitting in it

**Source logs:**
- `documentation/debug-logs/bug_raised/ai_choose_to_trash_program_with_subroutine_instead_of_ending_run_then_agenda_stolen.txt`
- `documentation/debug-logs/bug_raised/trashed_program_with_sub_instead_of_etr_2.txt`

**Reproduction:** `tests/pending/ballista-central-servers-skip-agenda-check.test.js` — `node tests/pending/ballista-central-servers-skip-agenda-check.test.js` (fails at `8d6c70e`, 2026-09-27)

## Summary

Ballista's subroutine is "Trash 1 installed program or end the run." The
live choice between the two is made by `AIWouldTrigger()`
(`sets/systemgateway.js`), which is supposed to trash a program by default
but weigh ending the run when the protected server holds an agenda. Its
first line, `if (typeof thisServer.cards != 'undefined') return true;`,
identifies a central server (HQ, R&D or Archives — the only server objects
with a `.cards` array) and returns `true` (trash a program) immediately,
before the function ever reaches the `corp.AI._agendasInServer(thisServer)`
check a few lines below. For HQ specifically this means Ballista can never
choose to end the run to protect an agenda sitting in hand: it always lets
the run continue past itself. In both source logs, the Corp trashes the
Runner's only remaining program on Ballista guarding HQ, the run then
succeeds, and the agenda in HQ (Hostile Takeover, then Superconducting Hub
in the second log) is accessed and stolen the same turn.

## Evidence

Log 1 (`ai_choose_to_trash_program_with_subroutine_instead_of_ending_run_then_agenda_stolen.txt`):

231: Corp rezzed Ballista
232: Encountering Ballista
233: Firing Trash 1 installed program or end the run. on Ballista:
234: AI: I know this one
235: Paricia trashed
237: Run successful
238: Hostile Takeover accessed

At that point Corp's hand was `[Government Subsidy,Hostile Takeover,Hostile Takeover,Trick of Light,Government Subsidy]` (from the "At start of Runner turn" spoiler two lines earlier), so `_agendasInServer(corp.HQ)` would have returned 2 had it been consulted.

Log 2 (`trashed_program_with_sub_instead_of_etr_2.txt`), a second copy of the
same board/deck reaching the same decision later in the game, after Ballista
had already been swapped back onto HQ by the identity ability:

429: Encountering Ballista
430: Firing Trash 1 installed program or end the run. on Ballista:
431: AI: I know this one
432: Echelon trashed
434: Run successful
436: Superconducting Hub accessed
437: Superconducting Hub stolen

`Superconducting Hub` (`sets/systemgateway.js:5106`) is `cardType: "agenda"`, so this is the same mechanism firing a second time, not a different bug.

## Reproduction

`tests/pending/ballista-central-servers-skip-agenda-check.test.js` loads the
real `Ballista` card definition and a real `CorpAI` instance in a small VM
sandbox (the same technique as `tests/pending/corsair-stealth-offset-suppressed-by-lampades.test.js`),
forces the injected `Math.random` to `0` so any branch that reaches the
50/50 roll lands on "protect the agenda", and calls `AIWouldTrigger()`
directly:

- **control** — a *remote* server (`{root: [agenda]}`, no `.cards`) holding
  the agenda: `AIWouldTrigger()` correctly returns `false` (end the run).
- **bug** — `corp.HQ` (`{cards: [agenda], root: []}`) holding the same
  agenda: `AIWouldTrigger()` still returns `true` (trash a program).

I could not use the standard `tests/fixtures/corp-decisions-pending/`
fixture format for this decision: Ballista communicates its choice via
`corp.AI.preferred = {title: "Ballista", option: choice}`, and `_choiceInner`
matches that preference with `optionList.indexOf(this.preferred.option)` —
strict reference equality against the literal option objects built inside
the card's own `Resolve()`. A fixture's static `OPTIONS` string list can't
reproduce that object identity, which is exactly the "non-replayable"
case `tests/fixtures/README.md` says needs a purpose-built test in
`tests/pending/` instead.

Current failing output:

ok control: a remote server holding the accessed agenda ends the run on this roll
FAIL bug: HQ holding the accessed agenda still trashes a program instead of ending the run
central-server branch (thisServer.cards defined) returns true before ever calling _agendasInServer(), so an agenda sitting in HQ, R&D or Archives is never weighed against trashing the program


`node tests/run-all-tests.js` still has three pre-existing, unrelated failures
on top of this addition: `ai-roadmaps.test.js`, `flipped-identity.test.js`, and
`vantagepoint-integration.test.js`. They are present on `8d6c70e` before this
change too and are outside this ticket's scope.

## Root cause

- [Verified] `AIWouldTrigger()`'s central-server branch (`typeof thisServer.cards != 'undefined'`) returns `true` unconditionally, never reaching the `corp.AI._agendasInServer(thisServer)` check that the remote-server branch below it uses — demonstrated by the reproduction test.
- [Verified] `corp.HQ`, `corp.RnD` and `corp.archives` are exactly the server objects with a `.cards` property (`utility.js` `GetServer`/`GetServerByArray`, and `tests/corp-decision-fixtures.test.js`'s own `central()` helper), so this branch covers all three central servers, not HQ alone.
- [Verified] `_agendasInServer()` (`ai_corp.js`) already knows how to count agendas in a central server's `.cards` (hand/deck/archives pile) as well as a server's `.root`, so the information the fix needs is already available and already used correctly by the remote-server branch two lines down.
- [Inferred] The function's own comment — "which we'll do for central servers, if there is no agenda, or at random" — reads as though trashing a program was only meant to be the default when there is *no* agenda, with the "central servers" clause describing something else (maybe: prefer trashing over the 50/50 roll for centrals when there's no agenda). As written, the `return true` for central servers pre-empts the "or at random" behaviour entirely rather than combining with it.
- [Inferred] Ballista's `AIWouldTrigger()` also calls `Math.random()` directly rather than the injectable `corp.AI._random()`, which is a known, separately tracked principle-5 gap (`documentation/corp-ai/specs/P2-corp-card-policy-randomness.md`). Out of scope here, but a fix that starts touching this function is a natural place to also route it through `corp.AI._random()`.

## Proposed fix

Selected candidate policy: behind `ballistaAgendaAwareSubroutine`, remove the
unconditional central-server return and use the existing agenda-aware branch
for every server. A central with no agenda keeps the current
trash-a-program choice; a central with an agenda uses the same existing 50/50
choice as a remote. This avoids a new coefficient and any card-title or
server-title special case. Because choosing between program destruction and
ending the run is still strategic rather than rules-determined, the option
remains default-off until the gate below passes. Routing the roll through
injectable randomness remains the separately tracked D2 work.

## Acceptance gate

Gated under `documentation/ai-planning.md`; depends on F4. The deterministic
reproduction fixes the candidate policy, but it cannot establish that ending
the run is strategically better than trashing a program. Compare baseline
option `ballistaAgendaAwareSubroutine` off with candidate on using paired seeds,
the committed deck pool, 200 games per deck pair and bootstrap 95% confidence
intervals. Include committed mid-game starts for Ballista protecting HQ, R&D
and Archives while that central contains an agenda the Runner can access.

- Improvement: `agendaPointsStolenAfterBallistaChoice` per game decreases; the
  interval for baseline minus candidate has a lower bound above zero.
- Guard: `pointsStolen` per game does not rise by more than 0.10; the interval
  upper bound for candidate minus baseline is at most +0.10.
- Guard: Corp `winRate` does not fall by more than 0.02; the interval lower
  bound for candidate minus baseline is at least -0.02.

## Acceptance criteria

- [ ] The reproduction passes and has moved into the green suite (`tests/`), expectation unchanged.
- [ ] A variation covering R&D and/or Archives with an agenda (not just HQ), since the current bug affects all three central servers identically.
- [ ] The behaviour change ships behind the AI option
      `ballistaAgendaAwareSubroutine`, which defaults to off.
- [ ] Gate evidence is recorded in the Resolution: exact F4 command, committed
      deck pairs and mid-game starts, paired seeds, seed count, every metric's
      baseline/candidate result and bootstrap 95% confidence interval, guarded
      regression results, pass conditions and thresholds. Only then is the
      option switched on by default.
- [ ] The F4 collector `agendaPointsStolenAfterBallistaChoice` is added through
      the harness collector extension point. It records agenda points stolen
      on the same run after Ballista chose to trash a program instead of ending
      that run.
- [ ] New or changed AI hooks are documented in `documentation/ai.md` (note: `AIWouldTrigger()` as used here for a live subroutine choice on ice is a third, currently undocumented usage of that hook name, distinct from the two documented in sections 4.6 and 5.5 — worth reconciling or cross-referencing while this is touched).
- [ ] `node tests/run-all-tests.js` passes.

## Out of scope / related

- Ballista's `Math.random()` call bypassing `corp.AI._random()` (principle 5) — tracked in `documentation/corp-ai/specs/P2-corp-card-policy-randomness.md`.
- `documentation/ai.md`'s `AIWouldTrigger()` sections (4.6, 5.5) don't cover this ice-subroutine-choice usage; a third example/heading may be worth adding there rather than only in this ticket.

# Corp AI: agendas held while a protected remote is unavailable for scoring

**Source logs:** `documentation/debug-logs/bug_raised/corp_didnt_play_agendas_into_remote_when_it_was_secure.txt` (2026-09-23), `documentation/debug-logs/bug_raised/corp_wont_play_an_agenda.txt` (2026-10-28).
**Reproduction:** `tests/pending/corp-agenda-blocked-by-occupied-remote.test.js` — `node tests/pending/corp-agenda-blocked-by-occupied-remote.test.js` (0 passed, 2 failed at `be77bf2`, 2026-10-28, with the owner's local flag edits).
**Coordinated work:** [I3: remote availability and asset reuse](../backlog/I3-remote-role-and-root-suitability.md), [I4: agenda installation and scoring](../backlog/done/I4-agenda-installation-and-scoring-commitment.md).

**Pickup and closure:** I3 owns this ticket's disposition and reproduction as
an explicit acceptance criterion. Handle its review/closure with the relevant
I3/I4 work; it is not waiting for an independent bug pickup. If the proposed
strategic expectation is refuted, record that evidence here rather than
claiming an AI fix. I3 must explicitly track any remaining separate work.

## Summary
The newer playtest ends with five agendas in HQ and a protected remote occupied
by a Storgotic Resonator with no counters. The Corp gains credits instead of
starting a scoring line. Reconstructing the position shows two obstacles:
asset occupancy excludes the remote, and even clearing the asset leaves a
relative Archives-score rejection. This demonstrates missing choices and a
repeatable stall, not that installing an agenda must be the best strategy.
The fix must be coordinated with I3/I4 rather than adding an independent
placement rule alongside them.

## Evidence

New log:
- Lines 737, 761, 797 and 1077 record ICE installs; the game records six in
  total, including two on the asset remote. The final hand is agenda-heavy,
  but this was not a game in which the Corp never obtained ICE.
- Lines 1216–1219: 12 credits and five agendas in HQ:
  `[Project Yagi-Uda,Send a Message,Sting!,Project Yagi-Uda,Send a Message]`.
- Lines 1228–1247: I4 logs installation as preferable for some agendas, but
  `Scoring windows for empty servers: []` precedes gaining a credit.
  With `agendaDestinationPlan:false`, the I4 destination suggestions are logs.
- Lines 1248–1288: two more gain-credit actions, then a forced discard.
- Lines 1297–1298 and 1303–1344: the only remote holds Storgotic Resonator,
  protected by Semak-samun and Lionsmane; no Resonator counters are recorded.

Older log:
- Lines 149–154 recorded an empty remote at `score:6.8, secure:true` versus
  HQ at `score:9.10, secure:true`, followed by no install and a gain-credit action.
- Its reported historical reconstruction expected Hostile Takeover into the
  remote but chose `gain`. The named fixture
  `corp-agenda-held-while-secure-remote-available.txt` is absent from today's
  pending directory; do not treat the old verification as a current test run.

Actor: Corp AI. A difficult draw may contribute; it does not establish which
alternative would have played best over subsequent turns.

## Reproduction

The current pending test uses real engine/card definitions because the standard
Corp decision-fixture runner does not load Downfall. It reconstructs the second
Corp action from the final dump: 13 credits, two clicks, Runner on 8 credits.
It omits the unknown sixth card drawn and later discarded, assumes Hyoubu's
once-per-turn reward has been used, and lacks prior posture/pressure history.
Post-turn resource counters are retained. These assumptions isolate agenda
placement and do not constitute an exact replay of the whole game.

Flags explicitly match the owner's reported combination: opening HQ/R&D,
empty-Archives pressure, posture, feedback, marginal ICE, I4 advancement and
exposure on; secure-server gate, extra at-risk layering, legacy reserve bypass,
debt reset and I4 destination planning off. The log itself does not serialize
flags. The second case removes the asset without changing its ICE.

Both cases expect an agenda install into the existing remote and currently
choose `gain`; there are zero AI agenda options, although the engine offers
that remote as a legal target. This is a candidate strategic expectation,
not a rules oracle or evidence of overall policy improvement. If further
investigation refutes it, document why rather than changing it to get a pass.

## Root cause

- [Verified] The occupied case has `_remoteHasRoom() == false`, zero empty
  protected remotes and no ranked agenda installs — current reproduction.
- [Verified] Removing the asset gives an empty remote evaluated `isSecure:true`,
  but no agenda install and the same `gain` choice — second case.
- [Verified] Diagnostics are remote score 2.9125, HQ −2.225, Archives 7.1818
  and five agendas. `_isAScoringServer()` compares against Archives when
  agendas exceed `MaxHandSize(corp) - 1`, so the cleared remote fails that
  comparison. This board does not fail against HQ's score.
- [Inferred] `_obsoleteBluff()` allows replacement of some aging ordinary
  assets and obsolete ambushes, but excludes Hostile assets from its aging
  rule. Resonator is Hostile, so this route does not free its remote.
- [Inferred] The combination of limited asset replacement and relative
  scoring-server eligibility contributes to the stall. No isolated policy
  intervention or multi-turn replay has yet established a sufficient fix.

## Proposed fix

Revise the affected I3/I4 design first, following
[the owner-playtesting workflow](../ai-playtesting.md). I3 owns keeping or
making a scoring remote available, including considering replacement of an
asset still installed there. I4 owns whether and when an agenda should be
installed or held. I5 owns a broader asset-value system; do not build that
whole system or invent a card-title exception for this example.

Compare retaining the asset, replacing it and preparing another remote.
Account for remaining asset usefulness, agenda supply, available resources
and exposure risk; waiting or drawing may be the right choice in some states.
A Hostile subtype or zero counters alone should decide neither retention nor
replacement. Do not force bare agenda installs or enable I4 destination
planning to make the off-path reproduction pass.

The owner separately reported undefended last-click installs with I4
destination planning on. That needs its own captured decision; this log
cannot reproduce it. The two observations inform the same I3/I4 planning
work, but do not demonstrate one shared root cause.

## Acceptance gate
Human gate. Strategic changes delivered through the coordinated I3/I4 flags,
new behaviour off unless the owner requests otherwise. Owner-controlled
playtesting under `documentation/ai-playtesting.md`; no fixed sample or
numerical thresholds.
Assess: escaping prolonged agenda-placement stalls while retaining useful
assets and avoiding needless agenda exposure or diversion of central defence.
Adoption: Paul decides after playtesting; record actual flags and his decision.

## Acceptance criteria
- [ ] Coordinate the selected change with I3/I4 before implementation; the older standalone bypass plan below is superseded.
- [ ] Re-check the reconstruction assumptions and the strategic expectations against the real choices and available resources.
- [ ] Any fixed pending reproduction passes unchanged and moves into the green suite; unresolved parts remain explicitly tracked. If an expectation is refuted, record the evidence rather than weakening it to get a pass.
- [ ] Cover useful retained assets, replaceable aging assets, Hostile assets with and without useful remaining abilities, and a position where holding an agenda is safer.
- [ ] Exercise the actual selected I3/I4 placement consumer with destination planning off; preserve the shared meaning of unrelated scoring-server consumers.
- [ ] New strategic behaviour is separately switchable with a plain-language comment and owner-controlled adoption. Record what to assess, tested flags, useful logs and remaining weaknesses; adoption can remain pending after implementation merges.
- [ ] Changed AI card hooks are documented in `documentation/ai.md`; architecture documents only implemented behaviour.
- [ ] Required focused tests and final full ticket validation pass under `tests/README.md`.

## Historical proposal — superseded, not an implementation plan

The earlier proposal added `secureRemoteAgendaCommitment` to bypass the relative
bar for secure agenda-placement candidates, retaining it for scoring upgrades.
It would not make an occupied asset remote available. Its historical proposed
F4 gate used 200 paired games per committed deck pair, a decrease in
`secureRemoteAgendaHoldTurns`, and regression limits of +0.10 stolen points,
−0.10 scored points and −0.02 win rate, with bootstrap 95% intervals.
That collector and option were proposed, not delivered by this ticket.
Those figures remain provenance, not current adoption requirements. The old
approval-pending implementation plan is superseded by I3/I4 scope revision.

## Out of scope / related

- I3's full persistent-role/value formula is not automatically required by this log.
- I4 Part 2's reported last-click behaviour needs a separate reproduction.
- Security estimates can be optimistic; `isSecure:true` does not prove a safe score.
- No gameplay code or defaults are changed by this ticket update.

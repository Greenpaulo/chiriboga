# Vantage Point full set review — 2026-10-06

**Verdict: Changes required.** Implementation completion is not readiness approval.
Production code and existing tests were not changed in this review. The set
remains in-progress, hidden and untested; no limitation was silently accepted.

## Snapshot and scope

Reviewed all **66 cards, 36001–36066**, in the tracker's **13 recorded batches**.
Coordinator: Codex; independent batch reviewers audited disjoint recorded ranges.
Production snapshot: `45833a14c83fef2f9ce71506d344460181445021`. Review preparation
and partially completed reports were saved by the user in `bd733d6` on
`cards/vantage-point-set-review`. The continued audit uses that branch in
`/private/tmp/chiriboga-vantagepoint-set-review`, preserving the unrelated active
`decklist-card-selector-3-max-fix` checkout and its debug log.

The initial dirty-worktree state is recorded in [snapshot metadata](vantagepoint-review-snapshot.json).
The [final source and artifact manifest](vantagepoint-set-review-final.sha256)
records the completed handoff. The [original SHA-256 manifest](vantagepoint-set-review.sha256) identifies source,
metadata, tests and harnesses. On resume, **90 available manifest entries matched**;
the only absent entry is `ai_corp_original.js`, an untracked diagnostic backup
that no audited consumer or harness loads. The production code and green test
suite are unchanged across the two commits. Each batch report records its own
consumer/test/probe hashes; the continued review has an additional artifact
manifest below. The continued audit edited review documents/probes and workflow-status documentation;
production source and existing tests remained unchanged.

Evidence includes definition/rules inspection, actual engine dispatch,
selectors/planners, contrasting resource/timing decisions, opposing public
security models, integration queries, seeded legal decks and headless games.
Probe-specific board/UI scaffolding is documented in the batch reports. A
successful current-behavior observation probe can demonstrate a defect; it does
not constitute a repair test or a strategic Pass. Known-red pending tests remain
outside the green suite. No browser or human-operated game was performed.

## Batch findings and verdicts

**12 batches require repairs; 1 passed.**

| Batch | IDs | Verdict | Principal finding / evidence |
| ----: | --- | ------- | ---------------------------- |
| [1](vantagepoint-batch-1.md) | 36001–36004 | Changes required | Successful-run dispatch/reward crashes; winning agenda target missed |
| [2](vantagepoint-batch-2.md) | 36005–36008 | Changes required | Stick and Poke draw omitted from survivable routes; remaining contrasts recorded |
| [3](vantagepoint-batch-3.md) | 36009–36016 | Changes required | Reward and play-choice crashes; ignored identity/tag/tactical choices |
| [4](vantagepoint-batch-4.md) | 36017–36020 | Changes required | Ignored economy hook; Beta Build target/click budgets; Aircheck safety and shared credit loss |
| [5](vantagepoint-batch-5.md) | 36021–36025 | Changes required | Economy/hosting decisions require repair |
| [6](vantagepoint-batch-6.md) | 36026–36030 | Changes required | Click steal cost and central defense choices require repair |
| [7](vantagepoint-batch-7.md) | 36031–36035 | Changes required | Pass restriction and paid-defense/tactical choices require repair |
| [8](vantagepoint-batch-8.md) | 36036–36040 | Changes required | Identity, damage, target ordering, ICE swap and upgrade-placement decisions require repair |
| [9](vantagepoint-batch-9.md) | 36041–36045 | Changes required | Tutor and post-rez choices miss immediate kill alternatives |
| [10](vantagepoint-batch-10.md) | 36046–36050 | Changes required | Magistrate useful rez windows ignored |
| [11](vantagepoint-batch-11.md) | 36051–36055 | Changes required | Scapegoat loses critical breaker; shared bad-publicity credit-loss defect |
| [12](vantagepoint-batch-12.md) | 36056–36060 | Changes required | Meat damage modelled as net; prevention/security consequences |
| [13](vantagepoint-batch-13.md) | 36061–36066 | Pass | Current strategic/planner evidence passes; revalidate after shared repairs |


See the linked per-card tables, board states, real consumers and repair criteria.
Some cards retain named evidence gaps within an otherwise failing batch. These
must be resolved alongside repairs; a batch does not earn Pass just by fixing
its first reported defect. Batch 13's Pass is tied to its current source/test
snapshot and must be revalidated after shared payment, access or planner repairs.

## Set-wide finding S1 — bad-publicity funds still participate in credit loss

Affected interactions include **Aircheck 36018 and Paywall 36052**, plus legacy
credit-loss effects and later Vantage Point cards generating bad publicity.
Locations: `mechanics.js:1685` (`LoseCredits`), `utility.js:3372` (`Credits`),
`sets/vantagepoint.js:4374` (Paywall encounter resolution).

[Null Signal's current rules explanation](https://nullsignal.games/blog/the-return-of-bad-publicity-in-vantage-point/)
places bad-publicity credits outside the credit pool, so ordinary credit loss and
pool-balance effects must not count or consume them. Bad-publicity credits remain
spendable during a run; mid-run publicity changes do not change that run's fund.

Reproduction: [vantagepoint-bad-publicity-fund.js](probes/vantagepoint-bad-publicity-fund.js).
It loads actual card definitions and credit checks/helpers; only UI logging and
the board's active-card provider are supplied. With Runner pool 6 and fund 2,
Paywall produces pool 6/fund 1 instead of pool 5/fund 2. During an active Aircheck
run, Paywall should lose neither protected pool nor outside fund, but consumes
the fund. Calling `LoseCredits(corp, 1)` with Corp pool 5 and Runner fund 2 leaves
Corp pool 5 and reduces the Runner fund to 1, crossing the side boundary.

The same probe shows `Credits(runner)` returning 8 for a six-credit pool. Its
historical API conflates balance and available funding: repair must distinguish
pool-only rules queries from spendable funding, rather than mechanically changing
every call site. `AvailableCredits` should still include the fund for legal
payments. `UpdateCounters` temporarily merges it into the displayed pool and also
needs review when aligning presentation with the new rules.

**Impact:** printed loss effects resolve incorrectly, public route budgets can
agree with a different outcome from live play, and a Corp loss can take Runner
resources. Existing `credit-pool-lock.test.js` assertions explicitly expect fund
loss under a pool lock; their current green result does not establish compliance
with the updated rules. The evidence and rules basis must guide the repair;
production/tests were not changed during this review.

**Repair/re-review criterion:** separate funding from balance/loss and preserve
side ownership. Verify ordinary, empty-pool and pool-locked losses; Corp losses
during Runner runs; source-sensitive payments with Shackleton; finite recurring
and prevention budgets; existing playable cards; and read-only/hidden-information
boundaries. Preserve Stimhack's distinct treatment where applicable. Re-run both
planners and batch 13's opposing-source scenarios. Reopen batches 4 and 11 for
this cross-batch defect in addition to their independently reported findings.

## Integration and runtime evidence

- **Definition coverage:** all 66 metadata IDs have exactly one definition;
  queue ranges cover every intended ID exactly once. A source scan found zero
  generated scaffold markers, empty Resolve bodies or empty subroutine arrays;
  `node scripts/card-status.js --check` passed. These structural checks do not
  establish correct rules or strategic consumers. All printed numeric fields
  checked by the integration probe match metadata, and ELO values are finite.
  The definition header records a 2026-09-18 Trash or Busto lookup. Historical
  exact ranking values were not independently re-fetched from that date.
- **Images:** each configured PNG name resolves through the actual JPG helper to
  a nonempty local image. The isolated worktree uses ignored links to the original
  workspace's existing assets. No card art was loaded into chat and no images
  were edited. This establishes paths, not visual inspection of overlays/art.
- **Formats/defaults:** Vantage Point is configured for Startup, Standard and
  Eternal. Standard is disabled in the app; it was nevertheless tested for legal
  deck generation. The set remains absent from launcher/Gauntlet defaults, with
  hidden/untested true. [The publisher's release information](https://nullsignal.games/products/vantage-point/)
  confirms its format inclusion and Startup's System Gateway/Elevation/Vantage
  Point pool. These are app format-pool checks, not a tournament ban-list audit.
- **Random decks:** [integration probe](probes/vantagepoint-set-integration.js)
  generated **315 seeded decks**, three for every legal identity in each
  configured VP-containing format, checking size, influence, copy limits, side,
  identity exclusion, set legality and Corp agenda points. Zero mismatches.
- **Full games:** [eight seeded headless games](vantagepoint-headless-smoke.json)
  using all four Vantage Point identities and legal generated Startup decks
  reached winners with **zero recorded engine errors**. Resuming on the unchanged
  production snapshot reproduced all eight game log hashes, winners and results. This smoke sample is not
  a win-rate benchmark, exhaustive card exposure or a browser playthrough.
- **Cross-batch mechanics:** batch reports/probes cover strength modifiers with
  Corsair/Tungsten, source exhaustion with Shackleton, finite Event Horizon stops,
  public prevention, installed global defenses, access/protection restrictions,
  liability tutoring/recursion, scoring resources and owner-sensitive points.
  S1 and batch 2's damage/draw route are additional shared-mechanic counterexamples.
  The full suite exercises hosting/uninstall continuations, prevention and
  payment cleanup; all possible card combinations were not tested.

## Verification

Runtime: `/Users/paulbingham/.nvm/versions/node/v20.19.0/bin/node`, matching `.nvmrc`.
All commands below run from the isolated review worktree. Where `node` is written,
use the pinned executable or activate Node 20.19.0 first.

| Command | Result |
|---|---|
| `node tests/run-all-tests.js` | **50 test files passed**, both original run and continued audit. Includes Corp decision fixtures, decision snapshots and AI-batch integration; no unit-only shortcut. |
| `node tests/corp-decision-fixtures.test.js` | 15 passed, 0 failed. |
| `node tests/decision-snapshots.test.js` | 11 passed. |
| `node --check sets/vantagepoint.js` | Passed. |
| `node tests/vantagepoint-integration.test.js` | Passed, included in full run and reviewers' focused checks. |
| `node tests/eternal-format.test.js` | Passed; included in full run and original explicit shared check. |
| `node tests/deckbuild-format-pool.test.js` | Passed; included in full run and original explicit shared check. |
| `node tests/decklauncher-identity-change.test.js` | Passed; included in full run and original explicit shared check. |
| `node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-set-integration.js` | Passed: 66 definitions; 315 legal seeded decks; zero numeric-field differences. |
| `node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-headless-smoke.js` | 8 games, 0 failed; JSON results retained. |
| `node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-bad-publicity-fund.js` | **Expected red**: four current balance/loss mismatches; outside green suite. |
| `node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-batch2-access.cjs` | Four current access decisions reproduced. |
| `node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-batch2-strategy.cjs` | Destination/reveal and lethal/survivable observations reproduced. |
| `node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-batch2-draw-route.cjs` | Current survivable-route false rejection reproduced. |
| Batch review probes and focused tests | Exact commands/results in each linked report; expected bad behavior assertions are identified as observations. |
| `git diff --check` | Passed at final handoff. |

## Coverage limits and handoff

This review demonstrates necessary rules and AI repairs; it does **not** approve
Vantage Point for playability. Each report identifies any unexercised per-card
contrasts. No manual browser checks of clicks, overlays, optional-cost flows or
human-run matches were performed. Those checks and historical ELO provenance
verification remain visible requirements for final sign-off, rather than being
claimed on the strength of VM tests. Repaired shared consumers require targeted
revalidation of earlier evidence.

The coordinator records results in the tracker's separate batch-review log,
reopens only supported failing batches, preserves completion rows and updates
the backlog. Repairs proceed via `implement-card-batch` in the review branch's
worktree; independent re-review follows each repair. The original dated full
implementation tracker remains in history, with a further dated post-review
snapshot preserving the repair queue and review links. Nothing is committed,
merged, pushed or enabled by this continued audit.

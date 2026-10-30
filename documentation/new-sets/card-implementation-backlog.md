# Card Implementation Backlog

This is the living inventory of known unfinished card definitions and AI data.
It distinguishes confirmed code gaps from areas that have not received a full
rules audit. Update it when a card is implemented or a new gap is found.

Set-level counts and missing or unfinished cards are generated in
`documentation/card-status.md`; this file records confirmed mechanic gaps and
audit notes that a script cannot detect.

## Implementation set queue

`implement-card-batch` moves to the first Pending set here once the active set
is Implemented. Review/optimisation does not block that transition. Use metadata
and registry values to prepare the next tracker; never infer priority from the
order of the availability table. A user-requested different set takes precedence.

| Set (registry key) | Status | Notes |
| ------------------ | ------ | ----- |
| `vantagepoint` | Implemented | All 13 batches; optimisation remains in its Set record below. |
| `downfall` | Implemented | All 13 batches; §8 integration checks passed 2026-10-23; optimisation remains in its Set record below. |
| `uprising` | Implemented | All 16 batches; §8 integration checks passed 2026-10-30; optimisation remains in the [active tracker](current-set-implementation.md). |

Uprising is active. Downfall retains its [maintained set record](records/downfall.md)
and [immutable transition snapshot](history/downfall-2026-10-23-implementation-transition.md);
no set review exists yet. Vantage Point retains its [maintained set record](records/vantagepoint.md),
[immutable transition snapshot](history/vantagepoint-2026-10-16-implementation-transition.md)
and [set report](reviews/vantage-point/vantagepoint-set-review.md). Outstanding
review/optimisation work continues there independently.

## 1. Missing card definitions

Missing definitions, unfinished scaffold placeholders and per-set counts are
generated from the code in [card-status.md](../card-status.md) (run
`node scripts/card-status.js`); they are no longer maintained by hand here.
Which sets are playable is decided in [card-sets.md](../card-sets.md).

Core Set is not compared this way because its file intentionally omits a number
of cards duplicated by System Update 2021. Before expanding any partial set,
derive the exact work list from its `pack_code` entries and account explicitly
for reprints rather than assuming every metadata entry needs a duplicate object.

## 2. Confirmed missing or incomplete mechanics

### Elevation

The six missing NBN definitions (35057–35060, 35065–35066) are implemented in
the user-selected batch recorded in
[elevation-missing-cards-implementation.md](elevation-missing-cards-implementation.md).
Baseline tests exercise the real play, paid-ability, tutor/install selection,
and advancement-search consumers. Independent strategic review is not yet
requested; competing tag-punishment plans, identity flips, and tutor sequencing
remain in the batch's optimisation queue.

### Downfall

Batches 1–13 (26001–26065) have working gameplay and baseline AI; the §8
implementation checks passed on 2026-10-23 and Downfall is playable. Focused
real-consumer evidence and specific deeper-strategy work are recorded in
[the implementation notes](downfall-implementation-notes.md) and the separate
optimisation queue.

**Set record:** [Downfall](records/downfall.md), preserving both queues, logs and
verification; see the [transition snapshot](history/downfall-2026-10-23-implementation-transition.md).

### Uprising

Active implementation set (26066–26130). `sets/uprising.js` defines all 65 cards.
Batches 1–16 (26066–26130) are complete with baseline AI, including the six
pre-existing definitions (26073, 26088, 26090, 26091, 26094, 26095), which were
verified and repaired where needed. The §8 implementation checks passed on
2026-10-30 and Uprising is playable. Their optimisation rows are Pending in the
tracker. See the
[active tracker](current-set-implementation.md) and
[implementation notes](uprising-implementation-notes.md).

`sets/downfall.js` defines all 65 cards and no recorded gameplay gaps remain:
the Runner gaps closed in batches 1–6 and the Corp gaps in batches 7–13.

### Other sets

`sets/vantagepoint.js` contains structural definitions and exact, dated ELO
values for all 66 cards. The pre-review tracker recorded all 13 batches (36001–36066) as
implemented and behavior tested. This is an implementation status, not an
independent rules/strategy sign-off. Vantage Point is playable by user decision
on 2026-10-16 under the two-stage workflow. Review findings remain open as
required repairs for demonstrated baseline gameplay, baseline AI and integration
defects, alongside optional deeper strategic improvements in the optimisation
queue; this does not assert review approval.

**Set record:** [Vantage Point](records/vantagepoint.md), preserving separate
implementation/optimisation queues, ownership, verification, logs and review
links; see the [transition snapshot](history/vantagepoint-2026-10-16-implementation-transition.md).
Use `optimise-card-batch` for its outstanding repairs.

The [2026-10-06 implementation snapshot](history/vantagepoint-2026-10-06.md)
preserves all batch boundaries and the full append-only completion log before
final review. Future snapshots must retain later repair/review evidence before
the active tracker is replaced; do not overwrite older snapshots. The [2026-10-06 full set review](reviews/vantage-point/vantagepoint-set-review.md) has verdict
**Changes required**. Twelve batches are queued for optimisation for supported defects; batch 13
has current passing evidence requiring revalidation after shared repairs. Findings
include engine dispatch/reward crashes, missing draw/click/damage models, illegal
upgrade placement and missed immediate win/kill alternatives. The shared
bad-publicity fund/loss abstraction also needs repair. Remaining per-card and
manual coverage gaps are explicit in the reports; no new limitation is accepted.
The [post-review snapshot](history/vantagepoint-2026-10-06-reviewed.md) preserves
the repair queue, review log and original completion history.

Batch 12's AI review replaced Event Horizon's permanent Runner lockout with
finite continuation planning. The Runner budgets encounters and a fresh ordinary
run after each sacrifice, using only visible defenses. It assumes the Corp
will spend them even when the private Corp policy would decline. Continuations
use the currently installed rig and the existing run calculator's static-board
assumptions; they do not search intervening draw/install actions. Usable
baseline support is required during implementation; stronger strategic evidence
is developed and independently checked through optimisation/review.

No repository-wide rules-text comparison has yet been completed for the other
registered definitions. A lack of `TODO` does not prove a card is complete.
Their `untested` registry flags should be treated literally. Add confirmed
per-card findings here rather than describing an entire set as implemented.

### Vantage Point batch 13 dependency and strategic repair complete

Batch 13 (36061–36066) implements Shackleton's source-aware payments and opposing
AI funding/damage models, plus Let Them Dream's search strategy and owner-sensitive
points. The reopened Corsair/stealth security finding is repaired: Corp planning
now follows complete restricted-payment routes with source exhaustion, prevention
and finite-repeat/click budgets. Both real planners have same-board contrasting
coverage; all 50 test files pass. See the [repair evidence](vantage-point-implementation-notes.md#batch-13-corp-restricted-payment-repair-2026-10-06).
No new accepted limitation is recorded. Independent batch/set-wide review remains
separate; Vantage Point was made playable on 2026-10-16, with findings retained.

## 3. Confirmed AI hook gaps

| ID   | Card       | Gap                                                                                                                                                      |
| ---- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1008 | Datasucker | Missing `AIReducesIceStrength`; without it Corp security planning cannot reliably value its counters because this definition has no `cardText` fallback. |
| 1013 | Wyrm       | Missing `AIImplementBreaker` for its nonstandard break/pump/reduce sequence and missing strength-reduction modelling.                                    |

The earlier targeted AI notes also named Parasite, Chisel, Physarum Entangler
and Chromatophores. Current code already gives the first three
`AIMatchingBreakerInstalled`, and Corp security planning consumes
Chromatophores' `modifySubTypes`. They may merit better forecasting, but they
are not currently classified as missing those hooks. Botulus, Leech and Ice
Carver have their declarative hooks.

The remainder of the card pool has not had a complete card-by-card AI audit.
When auditing a card, compare its meaningful decisions with the hook catalogue
in `documentation/ai.md`; do not use the mere presence of a property beginning
with `AI` as proof of adequate support. Cards with missing mechanics should be
finished before their AI behaviour is assessed.

## 4. Missing ELO values

Every completed definition should have a finite numeric `elo` copied from Trash
or Busto. This audit checks numeric presence only; it does not verify each
existing number against its dated source snapshot. Counts were recomputed on
2026-10-23 by loading every registered set file; Uprising's 59 scaffolded
cards were filled from the 2026-10-23 ranking (see the `sets/uprising.js` header).

| Set                         | Definitions | Numeric ELO | Missing numeric ELO |
| --------------------------- | ----------: | ----------: | ------------------: |
| System Gateway              |          77 |          77 |                   0 |
| System Update 2021          |          82 |          82 |                   0 |
| Downfall                    |          65 |          65 |                   0 |
| Midnight Sun                |          12 |          12 |                   0 |
| Parhelion                   |           4 |           4 |                   0 |
| The Automata Initiative     |           3 |           3 |                   0 |
| Elevation                   |          82 |          82 |                   0 |
| Vantage Point               |          66 |          66 |                   0 |
| Uprising                    |          65 |          65 |                   0 |
| Rebellion Without Rehearsal |           2 |           2 |                   0 |
| Core Set                    |          62 |          62 |                   0 |
| Creation and Control        |          55 |          55 |                   0 |
| **Total**                   |     **575** |     **575** |               **0** |

Backfill each value from the card's exact published ELO on the
[Trash or Busto rankings](https://trash-or-busto.herokuapp.com/ranking). Do not
estimate values or tune them against neighbouring cards. If a card genuinely
cannot be found, record that exception here instead of inventing a rating. Do
not rely on the random deckbuilder's `1500` fallback: Corp and Runner AI code
also has direct `.elo` reads, where an omission can produce `undefined`/`NaN`
comparisons and arbitrary choices. Record the lookup date in the set header so
the values form an identifiable snapshot rather than an undated mixture.

## 5. Updating this backlog

For each completed item:

1. implement and test the human-facing mechanics;
2. add and test the necessary AI hooks;
3. add the exact Trash or Busto ELO value;
4. remove or narrow its entry here; and
5. keep the set `untested` until the remaining set-wide audit is complete.

When the card population changes, regenerate the ELO counts by loading
`config.js` plus every registered set file and counting definitions for which
`typeof card.elo !== "number" || !isFinite(card.elo)`.

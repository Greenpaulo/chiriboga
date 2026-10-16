# Card Implementation Backlog

This is the living inventory of known unfinished card definitions and AI data.
It distinguishes confirmed code gaps from areas that have not received a full
rules audit. Update it when a card is implemented or a new gap is found.

Set-level counts and missing or unfinished cards are generated in
`documentation/card-status.md`; this file records confirmed mechanic gaps and
audit notes that a script cannot detect.

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

### Downfall

`sets/downfall.js` defines all 65 cards, but the following definitions contain
explicit TODOs, empty effects, commented trigger stubs or otherwise explicit
notes that printed behaviour is absent.

Runner cards:

| ID    | Card                             | Known gap                              |
| ----- | -------------------------------- | -------------------------------------- |
| 26004 | Stargate                         | Ability/replacement access absent      |
| 26005 | Utae                             | Break and strength abilities absent    |
| 26006 | Climactic Showdown               | Triggers and replacement effect absent |
| 26007 | Fencer Fueno                     | Hosted-credit and turn triggers absent |
| 26008 | The Nihilist                     | Virus/draw triggers absent             |
| 26009 | Trickster Taka                   | Hosted-credit and turn triggers absent |
| 26010 | Az McCaffrey: Mechanical Prodigy | Identity discount absent               |
| 26011 | Always Have a Backup Plan        | Empty event effect                     |
| 26012 | Blueberry! Diesel                | Empty event effect                     |
| 26013 | Flip Switch                      | Abilities absent                       |
| 26014 | Lucky Charm                      | Prevention ability absent              |
| 26015 | Masterwork (v37)                 | Console abilities absent               |
| 26017 | “Baklan” Bochkin                 | Encounter/counter ability absent       |
| 26018 | The Class Act                    | Draw abilities absent                  |
| 26019 | Lat: Ethical Freelancer          | Identity trigger absent                |
| 26020 | In the Groove                    | Empty event effect                     |
| 26021 | Khusyuk                          | Empty run-event effect                 |
| 26025 | Pelangi                          | Counter and subtype ability absent     |
| 26028 | Direct Access                    | Empty run-event effect                 |
| 26029 | Rejig                            | Empty event effect                     |
| 26030 | Whistleblower                    | Access ability absent                  |

Corp cards:

| ID    | Card                               | Known gap                                                        |
| ----- | ---------------------------------- | ---------------------------------------------------------------- |
| 26031 | MirrorMorph: Endless Iteration     | Identity ability absent                                          |
| 26032 | Architect Deployment Test          | On-score effect is a commented stub                              |
| 26038 | Cold Site Server                   | Abilities and run cost absent                                    |
| 26039 | Hyoubu Institute: Absolute Clarity | Identity abilities absent                                        |
| 26040 | Project Yagi-Uda                   | On-score and agenda-counter ability absent                       |
| 26041 | Sting!                             | Score/steal damage trigger absent                                |
| 26043 | Storgotic Resonator                | Counter placement absent; damage ability exists                  |
| 26044 | Saisentan                          | Encounter choice and all subroutines absent; AI model is a no-op |
| 26045 | Complete Image                     | Empty operation effect                                           |
| 26046 | Letheia Nisei                      | Psi/approach ability absent                                      |
| 26052 | Focus Group                        | Empty operation effect                                           |
| 26053 | Game Over                          | Empty operation effect                                           |
| 26054 | Increased Drop Rates               | Access ability absent                                            |
| 26055 | Divested Trust                     | Agenda-steal response absent                                     |
| 26056 | SDS Drone Deployment               | Steal cost and on-score effect absent                            |
| 26061 | Secure and Protect                 | Empty operation effect                                           |
| 26062 | Reduced Service                    | Rez, run-cost and counter-removal abilities absent               |
| 26063 | Vulnerability Audit                | Installed-this-turn scoring restriction absent                   |

These cards are structurally eligible for format-aware random decks. Until
their mechanics are completed, selecting Downfall can therefore put unfinished
cards into generated decks.

### Other sets

`sets/vantagepoint.js` contains structural definitions and exact, dated ELO
values for all 66 cards. The pre-review tracker recorded all 13 batches (36001–36066) as
implemented and behavior tested. This is an implementation status, not an
independent rules/strategy sign-off. Vantage Point remains `in-progress`, hidden
and untested per `documentation/card-sets.md`; independent review and the
set-wide review demonstrate necessary rules/AI repairs; see the report below.

Vantage Point is the active batched implementation. Its live queue, ownership,
status summary and append-only completion log are maintained in
`documentation/new-sets/current-set-implementation.md`. The `implement-card-batch` skill must
update that tracker after every status transition and completed batch.

The [2026-10-06 implementation snapshot](history/vantagepoint-2026-10-06.md)
preserves all batch boundaries and the full append-only completion log before
final review. Future snapshots must retain later repair/review evidence before
the active tracker is replaced; do not overwrite older snapshots. The [2026-10-06 full set review](reviews/vantage-point/vantagepoint-set-review.md) has verdict
**Changes required**. Twelve batches are reopened for supported defects; batch 13
has current passing evidence requiring revalidation after shared repairs. Findings
include engine dispatch/reward crashes, missing draw/click/damage models, illegal
upgrade placement and missed immediate win/kill alternatives. The shared
bad-publicity fund/loss abstraction also needs repair. Remaining per-card and
manual coverage gaps are explicit in the reports; no new limitation is accepted.
Batch 1 repairs (36001–36004, CR1–CR4, TT1 and named strategic coverage) completed
on 2026-10-06 with all 51 regression files passing. Its independent [second re-review](reviews/vantage-point/vantagepoint-batch-1.md#second-independent-remediation-re-review--2026-10-06)
now records **Pass**, including affected run-calculator consumers, Runner
winning-steal priority and ordinary Corp income routes. Twelve new independent
scenarios and batch13 shared-consumer regressions pass; this does not renew
batch13's snapshot verdict or the set-wide review. Batch 2 is the next
implementation repair; 11 batches remain reopened.
No new limitation is accepted; shared finding S1 remains open.
The [post-review snapshot](history/vantagepoint-2026-10-06-reviewed.md) preserves
the repair queue, review log and original completion history.

Batch 12's AI review replaced Event Horizon's permanent Runner lockout with
finite continuation planning. The Runner budgets encounters and a fresh ordinary
run after each sacrifice, using only visible defenses. It assumes the Corp
will spend them even when the private Corp policy would decline. Continuations
use the currently installed rig and the existing run calculator's static-board
assumptions; they do not search intervening draw/install actions. Strategic
support is required during each batch; final review verifies it.

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
separate; playability flags are unchanged.

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
or Busto. This audit checks numeric presence only; it does not yet verify each
existing number against its dated source snapshot.

| Set                         | Definitions | Numeric ELO | Missing numeric ELO |
| --------------------------- | ----------: | ----------: | ------------------: |
| System Gateway              |          77 |          77 |                   0 |
| System Update 2021          |          82 |          82 |                   0 |
| Downfall                    |          65 |           0 |                  65 |
| Midnight Sun                |          12 |           7 |                   5 |
| Parhelion                   |           4 |           0 |                   4 |
| The Automata Initiative     |           3 |           0 |                   3 |
| Elevation                   |          76 |           1 |                  75 |
| Vantage Point               |          66 |          66 |                   0 |
| Uprising                    |           6 |           0 |                   6 |
| Rebellion Without Rehearsal |           2 |           0 |                   2 |
| Core Set                    |          62 |           0 |                  62 |
| Creation and Control        |          55 |           0 |                  55 |
| **Total**                   |     **510** |     **233** |             **277** |

Of the 277 omissions, 27 are identities and 250 are playable deck cards. The
five Midnight Sun omissions are:

- 33001 Esâ Afontov: Eco-Insurrectionist
- 33017 Cezve
- 33018 Revolver
- 33020 No Free Lunch
- 33030 Stoneship Chart Room

Parhelion, Automata Initiative, Uprising and Rebellion have ELO missing from
every currently defined card. Elevation's only numeric value is on 35050 Byte!;
it has not yet been checked against a dated Trash or Busto snapshot.

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

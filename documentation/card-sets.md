# Card sets

Which card sets are playable. This is a human decision, not something the code
can measure: a set can have every card defined and still not be implemented.
Change a row only by deliberate decision. Under the two-stage new-set workflow,
completed gameplay, usable baseline AI and passing implementation integration
checks authorize playability before independent strategic review. Optimisation
findings and review verdicts remain separate and do not automatically disable a set.

Tickets that touch card hooks cover the **playable** sets unless they say
otherwise. Measured status for every set (card counts, missing definitions,
scaffold markers, required AI hooks, and where `config.js` disagrees with this table) is in the
generated [card-status.md](card-status.md).

| Set (registry key) | Decision | Notes |
|---|---|---|
| `systemgateway` | playable | |
| `systemupdate2021` | playable | |
| `elevation` | playable | All 82 metadata cards have definitions. The six previously missing NBN cards have gameplay and baseline AI tests; see new-sets/elevation-missing-cards-implementation.md. |
| `vantagepoint` | playable | All 13 batches implemented. Playable by user decision on 2026-10-16 under the two-stage workflow; outstanding rules/AI findings remain in the [optimisation queue](new-sets/records/vantagepoint.md#optimisation-queue) and [review](new-sets/reviews/vantage-point/vantagepoint-set-review.md). Review approval is outstanding. |
| `downfall` | playable | All 13 batches implemented; implementation integration checks passed and made playable on 2026-10-23 under the two-stage workflow. Optional strategy work remains in the [optimisation queue](new-sets/records/downfall.md#optimisation-queue); no independent review yet. |
| `creationandcontrol` | not-implemented | Every card is defined but mechanics are incomplete (see `documentation/new-sets/creation_and_control_audit.md`). |
| `midnightsun` | not-implemented | |
| `parhelion` | not-implemented | |
| `automatainitiative` | not-implemented | |
| `uprising` | playable | All 16 batches implemented; implementation integration checks passed and made playable on 2026-10-30 under the two-stage workflow. Optional strategy work remains in the [optimisation queue](new-sets/current-set-implementation.md); no independent review yet. |
| `rebellion` | not-implemented | |
| `coreset` | deprecated | Legacy set; System Gateway and System Update 2021 reprint many of its cards. |

Decisions: `playable`, `in-progress`, `not-implemented`, `deprecated`.

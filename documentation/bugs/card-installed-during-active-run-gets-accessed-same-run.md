# Engine: a root card installed during a breach becomes accessible without the Runner's required choice

**Source log:** `documentation/debug-logs/bug_raised/corp_installs_upgrade_using_identity_ability_into_server_that_is_being_accessed.txt`
**Reproduction:** `tests/pending/card-installed-during-active-run-gets-accessed-same-run.test.js` — `node tests/pending/card-installed-during-active-run-gets-accessed-same-run.test.js` (fails at `8d6c70e`, 2026-09-26)

## Implementation plan

Proposed at `8d6c70e`, 2026-09-26. **Awaiting approval.**

- **Validation:** root cause confirmed live against the real `AccessCardList()`
  in `utility.js` (see Reproduction) — not just read, but executed. The
  identity-specific trigger path (`elevation.js`) was read to confirm how the
  mid-run install happens, but the fix targets the general engine function,
  not that card.
- **Approach:** track root access candidates for the breach. Seed the list when
  the breach begins, record the Runner's rule 7.4.6a choice for each card that
  enters the root, and have `AccessCardList()` read that state while still
  subtracting `accessedCards`. Rejected: special-casing individual install
  effects (see Proposed fix).
- **Tests:** move this ticket's reproduction into `tests/`; add a
  central-server-root variation; cover both accepting and declining the new
  candidate; confirm existing HQ/R&D/Archives access coverage still passes.
- **Risk:** `AccessCardList()` is reached by every access in the game
  (`ChoicesAccess()`'s four call sites). HQ, R&D and Archives card zones have
  separate behavior under rules 7.4.6b-d and must remain live as specified;
  only root candidates use the Runner-choice state.
- **Docs:** none — no AI hook is added or changed.

## Summary

While a run against a remote server is still open (`Run ends` has not fired), a
Corp trigger resolves and installs a fresh card into the root of that same
server. The engine immediately re-offers that freshly installed card as part
of the run's ongoing access, and the Runner accesses and trashes it before the
run is over. Comprehensive rule 7.4.6a requires the Runner to decide whether a
card entering the breached server's root becomes an access candidate. The
engine makes it a candidate automatically and never offers that choice. The
observed access is legal only if the Runner accepts it; forcing that outcome is
a rules violation, not just a bad AI trade.

## Evidence

`documentation/debug-logs/bug_raised/corp_installs_upgrade_using_identity_ability_into_server_that_is_being_accessed.txt`, lines 515-539:

```
515:Run initiated attacking Remote 0
517:Corp did not rez ice
518:Approaching Remote 0
521:Send a Message stolen
525:You may rez 1 installed piece of ice, ignoring all costs triggered
529:Install 1 resource or hardware from grip triggered
533:AI: I don't have code to handle this situation: [Poétrï Luxury Brands,Stolen,continue,...]
534:AI: I don't have code to handle this situation: [Poétrï Luxury Brands,Stolen,server,...Remote 0...]
535:Corp installed a card in root of a remote server
536:Humanoid Resources accessed
538:Humanoid Resources trashed
539:Run ends
```

The Runner's run on Remote 0 is still in progress (an agenda was already
stolen from it at line 521, but `Run ends` does not fire until line 539). The
Corp identity "Poétrï Luxury Brands: All the Rage" triggers `responseOnStolen`
("Whenever an agenda is stolen, you may install 1 non-agenda card from HQ"),
which calls `poetriInstallCard()`. It installs Humanoid Resources into Remote
0 — the server the run is still attacking — and the very next log line shows
it accessed, then trashed, inside the same run.

## Reproduction

`tests/pending/card-installed-during-active-run-gets-accessed-same-run.test.js`
extracts the real `AccessCardList()` from `utility.js` and runs it against a
minimal remote-server stub. It models run-scoped root candidates, then checks
both rule 7.4.6a choices for a card installed while the breach is open. The
accept case is already consistent with the live scan; the decline case still
returns the newly installed card. `node
tests/pending/card-installed-during-active-run-gets-accessed-same-run.test.js`
fails today:

```
FAIL the Runner may decline a root card installed during the breach
     AccessCardList() must not offer a mid-breach root install the Runner declined, but returned: ["Freshly installed asset"]
1 case(s) failed.
```

`node tests/run-all-tests.js` was run for comparison; it reports 3 pre-existing
failures (`ai-roadmaps.test.js`, `flipped-identity.test.js`,
`vantagepoint-integration.test.js`) unrelated to this change (missing local
card-image assets / roadmap data in this environment), and does not run
`tests/pending/`, so this reproduction does not affect the green suite.

## Root cause

- [Verified] `AccessCardList()` (`utility.js`, function starting at the
  `function AccessCardList()` declaration) determines a remote server's
  accessible root cards with a live scan: `for (var i = 0; i <
  attackedServer.root.length; i++) { if
  (!accessedCards.root.includes(attackedServer.root[i]))
  ret.push(attackedServer.root[i]); }`. It has no notion of "cards present when
  the breach began" or the Runner's choice for a new root card — any card in
  `attackedServer.root` that is not already in `accessedCards.root` is offered.
- [Verified] `phases.runAccessingCard.Resolve.n` (`phase.js`) calls
  `ResolveAccess()` after each access resolves and then calls `ChoicesAccess()`
  again to see if there are more cards to access — `ChoicesAccess()` calls
  `AccessCardList()` directly with no run-scoped root-candidate state
  (`phases.runBreachServer`, `phase.js`). So any card installed into the
  attacked server between two accesses is picked up without the checkpoint
  choice required by rule 7.4.6a.
- [Verified] `poetriInstallCard()` (`sets/elevation.js`, card 35036, "Poétrï
  Luxury Brands: All the Rage") offers the currently-attacked remote as an
  install destination for its `responseOnStolen` ability with no restriction;
  this is how the specific card in the log reached the server mid-run, but the
  underlying access bug is general and not specific to this identity. Any
  effect that installs a card into a server during an open run against it
  (Corp or Runner-triggered) would trigger the same access-list bug.
- [Inferred] The AI's own choice of Remote 0 as the install destination (lines
  533-534, defaulting to `optionList[0]` per `ai_corp.js` `Choice()` since no
  hook handles the situation) made this instance visible, but is a separate,
  secondary problem: even a well-reasoned choice to install there would still
  trigger the same bad access. AI decision logic for Poétrï's choices is out
  of scope here.

## Proposed fix

Track breach candidates explicitly instead of rebuilding them from the live
server on every `AccessCardList()` call. Initialize the root candidates when
the breach begins. Under comprehensive rule 7.4.6a, whenever a card enters the
breached server's root, give the Runner the required choice at the next
checkpoint and record that card as a candidate only when the Runner accepts
it. `AccessCardList()` should read that recorded candidate state and continue
excluding cards already in `accessedCards` and recorded root candidates that
are no longer in the breached server's live root. Rule 7.4.5 removes a card's
candidate status when it leaves the breached server.

Do not apply a fixed snapshot to the central-server card zones. Rules 7.4.6b-d
give cards entering HQ, R&D and Archives their own candidate behavior, so keep
those rules separate from the root choice. The run-scoped candidate state must
also be reset at the same lifecycle boundaries as `accessedCards`.

Rejected alternative: special-casing `poetriInstallCard()` (and other
mid-run-install effects) to refuse the currently-attacked server as a
destination. Rejected because it treats the symptom on one card instead of the
general rule, and a future card that installs into a server without going
through a destination-choice `DecisionPhase` (e.g. an automatic/forced
install) would reintroduce the bug.

This touches `AccessCardList()` in `utility.js`, reached by every server
type's access resolution (`ChoicesAccess()` → `phases.runBreachServer`,
`phases.runAccessingCard`, `init.js`). Validate HQ's random-order access,
R&D's top-down access with root cards mixed in (the `reducedRet` branch),
Archives' access-all behavior, and the `modifyBreachAccess` additional-access
modifier all still work unchanged when nothing is installed mid-run.

## Acceptance gate

N/A — deterministic fix with a single correct outcome

## Acceptance criteria

- [ ] The reproduction passes and has moved into the green suite (`tests/`),
      expectation unchanged.
- [ ] For a card installed mid-breach into the attacked remote's root, tests
      cover both Runner choices: accepting adds it as a candidate and
      declining does not.
- [ ] A recorded root candidate that leaves the breached server before access
      is no longer offered for access.
- [ ] The same two choices are covered for a card installed into the root of
      a breached central server (HQ, R&D or Archives).
- [ ] Existing access behavior for HQ (random single access), R&D (top-down
      with root cards), and Archives (access-all) is unchanged when no
      mid-run install occurs — add or confirm unit coverage.
- [ ] `node tests/run-all-tests.js` passes (pre-existing unrelated failures in
      this environment aside).

## Out of scope / related

- The AI's lack of any decision logic for Poétrï Luxury Brands' `Stolen`
  card-choice and server-choice `DecisionPhase`s (log lines 533-534) causes it
  to default to the first offered option (`ai_corp.js` `Choice()` returns `ret
  = 0` when nothing handles the situation). That is a separate, lower-severity
  gap worth a backlog item so the AI evaluates *which* card and *which server*
  are actually good, once installing into an actively-run server is no longer
  possible.

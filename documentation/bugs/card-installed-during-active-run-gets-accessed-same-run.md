# Engine: a card the Corp installs into a server while a run against it is still open gets accessed by that same run

**Source log:** `documentation/debug-logs/bug_raised/corp_installs_upgrade_using_identity_ability_into_server_that_is_being_accessed.txt`
**Reproduction:** `tests/pending/card-installed-during-active-run-gets-accessed-same-run.test.js` — `node tests/pending/card-installed-during-active-run-gets-accessed-same-run.test.js` (fails at `8d6c70e`, 2026-09-26)

## Implementation plan

Proposed at `8d6c70e`, 2026-09-26. **Awaiting approval.**

- **Validation:** root cause confirmed live against the real `AccessCardList()`
  in `utility.js` (see Reproduction) — not just read, but executed. The
  identity-specific trigger path (`elevation.js`) was read to confirm how the
  mid-run install happens, but the fix targets the general engine function,
  not that card.
- **Approach:** snapshot the attacked server's accessible cards once (at
  `phases.runBreachServer.Init` or the start of the access loop) into a new
  run-scoped list; have `AccessCardList()` read from that snapshot instead of
  live `attackedServer.root`/`.cards`, still subtracting `accessedCards`.
  Rejected: special-casing individual install effects (see Proposed fix).
- **Tests:** move this ticket's reproduction into `tests/`; add a
  central-server (HQ/R&D/Archives root) mid-run-install variation; confirm
  existing HQ/R&D/Archives access unit coverage still passes unchanged.
- **Risk:** `AccessCardList()` is reached by every access in the game
  (`ChoicesAccess()`'s four call sites); the R&D `reducedRet` branch and the
  `modifyBreachAccess` additional-access count both need re-checking against
  the snapshot, since they currently read `attackedServer.cards.length` live.
- **Docs:** none — no AI hook is added or changed.

## Summary

While a run against a remote server is still open (`Run ends` has not fired), a
Corp trigger resolves and installs a fresh card into the root of that same
server. The engine immediately re-offers that freshly installed card as part
of the run's ongoing access, and the Runner accesses and trashes it before the
run is over. Only cards present in the attacked server when the Runner began
accessing it should be accessible to that run; a card installed afterwards,
mid-run, should sit there untouched until a future run targets the server.
This wastes the Corp's install for nothing and is a rules violation, not just
a bad AI trade.

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
minimal remote-server stub. It puts one card in the server's root, accesses it
(mirroring what `phases.runAccessingCard.Init` does), then installs a second
card into the same root while the run is still open and calls
`AccessCardList()` again. It currently returns the newly installed card. `node
tests/pending/card-installed-during-active-run-gets-accessed-same-run.test.js`
fails today:

```
ok   control: a card already in the root when the run breaches is accessed
FAIL a card the Corp installs into the root mid-run must not join this run's access
     AccessCardList() must not offer a card installed into the attacked server after this run already began accessing it, but it returned: ["Freshly installed asset"]
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
  this run's access began" — any card sitting in `attackedServer.root` that
  isn't already in `accessedCards.root` is offered, regardless of when it was
  installed.
- [Verified] `phases.runAccessingCard.Resolve.n` (`phase.js`) calls
  `ResolveAccess()` after each access resolves and then calls `ChoicesAccess()`
  again to see if there are more cards to access — `ChoicesAccess()` calls
  `AccessCardList()` directly with no snapshot of the server's root taken at
  breach time (`phases.runBreachServer`, `phase.js`). So any card installed
  into the attacked server between two accesses in the same run — via a
  triggered ability window that opens before `Run ends` — is picked up.
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

Give the access flow a fixed list of "cards accessible to this run" captured
once, instead of a live re-scan of the server on every `AccessCardList()`
call. The natural place is `phases.runBreachServer.Init` (where breach
triggers already fire) or the start of the access loop: snapshot
`attackedServer.root.slice()` (and, for Archives, `attackedServer.cards.slice()`)
into a new run-scoped variable, and have `AccessCardList()` build `ret` from
that snapshot rather than the live `attackedServer.root`/`.cards` arrays,
still excluding anything already in `accessedCards`. R&D and HQ's
count-based access (`num`) is unaffected by this — they already access a fixed
number, not a live list — but the snapshot should still be taken for
consistency and to protect against a similar "install extra R&D/HQ card
mid-access" edge case (e.g. Send a Message's own ice-rez trigger has no such
effect today, but nothing rules it out for a future card).

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

## Acceptance criteria

- [ ] The reproduction passes and has moved into the green suite (`tests/`),
      expectation unchanged.
- [ ] A card installed mid-run into the attacked central server (HQ/R&D/
      Archives root) is likewise excluded from that run's access — add a
      variation covering a central server's root, not just a remote's.
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
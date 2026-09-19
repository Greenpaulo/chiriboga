1. [FIXED] Precons are messed up for custom game - runner had deck full of corp cards, and crop runner cards, not sure on repro steps. Also noticed a bug, where you load into a custom game format like "Core Sets" and it'll load a identiy with a precon deck for that format, but then if you selecy an identity that doesn't have a precon for that format, it doesnt choose a random deck fitting the new identities card limit and influence limit, instead it leaves the old precon deck from the old identity you just switched from. This shouldn't happen, if you switch to an identity that has no precon for that format then it should just load a random valid deck for that identity, just like if you pressed the "Random deck" button.

   **Resolved — 17 Sept:** The identity-change handler previously only changed
   the identity and parsed the existing deck text, despite its comment saying it
   regenerated the deck. It now replaces the deck with a legal matching precon,
   or calls the same `DeckBuild()` generator used by Random Deck when no matching
   precon exists. Precon contents are validated against the selected identity's
   player side; an unloaded, malformed, or opposite-side card invalidates the
   precon and triggers random generation instead. Regression coverage verifies
   matching-precon selection, no-precon fallback, and wrong-side rejection.

2. [FIXED] Performance issue and slowdown noticeable, maybe linked to number of servers, could be due to the card pool scan no-caching issue mentioned in `code_review_16_sept.md`.

   **Resolved — 17 Sept:** The identified multiplicative hot path was removed.
   `_estimateRunnerBypassRisk()` no longer scans the entire `cardSet` every time
   each single-ICE server is evaluated. `_hiddenThreatProfiles(runnerFaction)`
   scans once for a Runner faction, keeps only `AIHiddenThreat` definitions,
   applies the public faction priors (including Neutral and discounted
   out-of-faction cards), and caches that small list on the Corp AI instance.
   Later server evaluations reuse it while still recalculating the dynamic
   `AppliesToServer`, Heap, Grip-size, and Stack-size inputs. Evaluation remains
   necessarily linear in the number of servers, but it is no longer multiplied
   by the size of the full card pool. A regression invokes the estimator twice
   and verifies that a threat definition is read only during the first scan;
   the full 64-case Corp-security suite passes.
3. [FIXED] No sound effects when taking credits from cards like Red Team or Telework Contract. Every credit gain should trigger one of the gain-credit sound effects.

   **Resolved — 17 Sept:** Credit audio had been added to `GainCredits()` but
   Red Team, Telework Contract, and other hosted-credit cards use
   `TakeCredits()`. The 1-credit, 2-credit, and 3+-credit selection now lives in
   the shared `PlayCreditGainSound(num)` helper, and both credit-transfer paths
   call it after successfully increasing a player's credit pool. Existing sound
   suppression is respected, so cards with a bespoke combined sound do not also
   play a generic credit sound. Four regressions cover ordinary gains, Red
   Team-style three-credit takes, two-credit takes, and suppression.
4. [FIXED] CSS issue - On large browser zoom, opponents' archived cards, cards in the Heap, and opponents' scored agendas get covered by the menu buttons in the top-left corner.

   **Resolved — 17 Sept:** Raising a card inside the PIXI stage could not place
   it above the menu because the entire game canvas and the fixed HTML interface
   are separate stacking contexts. Zooming now registers the card in a shared
   zoom set and adds `card-zoom-active` to the document body. While that set is
   non-empty, CSS raises the transparent game canvas from `z-index: 0` to
   `z-index: 3`, allowing the rendered card to appear over the top-left menu
   where they overlap. The gameplay footer remains one layer higher so controls
   such as the R&D access "Next" button stay clickable while an accessed card is
   automatically zoomed. Unzooming the final card removes the class and restores
   normal canvas priority. The set handles overlapping enforced and hovered zoom
   states without lowering the canvas too early. Five regressions cover
   activation, multiple zoomed cards, final cleanup, the raised canvas, and the
   footer remaining above it.
5. [FIXED] Corp went into negative credits; investigated using `chiriboga-log-2026-09-16T20_57_27.816Z.txt` and `chiriboga-log-2026-09-16T21_09_16.816Z.txt`.

   **Resolved — 17 Sept:** Both logs identify Mycoweb's second subroutine as
   the cause. After rezzing Mycoweb left the Corp with 2 credits, the subroutine
   selected Palisade at its discounted cost of 2. It manually spent those 2
   credits and then called ordinary `Rez(Palisade)`, which charged Palisade's
   full 4-credit cost again, producing the logged `2 - 2 - 4 = -4` balance.
   `Rez()` now accepts an initiating-effect credit reduction and applies it in
   its central payment calculation. Mycoweb passes its 2-credit reduction into
   that path instead of paying separately, so Palisade costs exactly 2 once.
   Keeping the operation inside `Rez()` also preserves any non-credit additional
   rez costs instead of bypassing them. A regression recreates the logged
   2-credit Corp/4-credit Palisade case and verifies one 2-credit payment, a
   zero balance, and a successfully rezzed card.
6. [FIXED] Accessing archives triggers a sound effect for every single card, far too annoying 10+ times in a row for 10+ cards in archives.

   **Resolved — 17 Sept:** The `runSuccessful` sound was incorrectly played by
   `ResolveAccess()`, which runs after every individual card access. An Archives
   breach therefore replayed the sound once per archived card. The sound now
   plays when the run is actually declared successful in the Run 5.1 phase, so
   it fires once per successful run and not during individual accesses. It is
   also correctly omitted when an effect prevents the run from being declared
   successful. Regression coverage verifies that the successful-run phase owns
   the single sound call and `ResolveAccess()` no longer plays it.
7. [FIXED] Identities that flip just disappear after being flipped.

   **Resolved — 17 Sept:** Dewi Subrotoputri, the currently implemented flip
   identity, changed its renderer to `images/35023-0.jpg` after flipping, but
   that reverse-side image was absent from the repository. PIXI therefore
   displayed an empty texture even though the identity remained in play. The
   official reverse-side artwork has been added at the expected filename and
   normalized to the same 300×420 dimensions as the other card images. The
   gameplay state was already changing correctly: Side A flips to Side B and
   gains 1 credit, while Side B's successful-run condition flips back and draws
   1 card. Regression coverage now verifies the reverse asset, both state
   transitions, both rewards, both sides' trigger conditions, and the renderer's
   texture update. Nebula Talent Management is separately listed in the README
   as an unimplemented card, rather than an implemented identity affected by
   this display bug.

# Corp AI did not protect Archives with the Baker backdoor active

**Source log:** `documentation/debug-logs/bug_raised/corp_not_protecting_archives_when_i_have_baker_to_redirect_to_hq.txt`  
**Status:** Fixed, with the original diagnosis corrected after review against the current code, card definitions, game rules, and tests.

## Outcome

The report correctly identified that Archives protection was ineffective, but its proposed primary cause was not sufficient and several supporting claims were wrong.

The implemented fix has three parts:

1. Baker's public `AIRedirectsRun` model now checks hosted stealth credits in the prospective Archives-run context. This allows Corp-turn planning to recognize a credit on Touchstone even though Touchstone can spend credits only during a run.
2. ICE-install planning can skip a higher-ranked server whose next layer is disallowed by the economy/layer policy and try the next ranked viable target instead of abandoning ICE installation entirely.
3. `_serverHasStakes()` now treats visible agendas in Archives, an active Archives backdoor, and current public/recent run pressure as real Archives stakes. It deliberately does not inspect hidden R&D contents.

No title-specific Baker check was added. The Corp still consumes the generic `AIRedirectsRun` hook.

## Corrected diagnosis

### Baker was not detected with Touchstone outside a run

The earlier report said `_archivesIsBackdoorToHQ()` correctly detected Baker. It did not in the logged board state.

Baker's `AIRedirectsRun` called `_stealthCreditCards()`. That helper called each source's `canUseCredits()`. Touchstone returns true only while `attackedServer !== null`, which is correct during real payment but false during Corp-turn planning. Consequently, Baker reported no redirect while the AI was deciding where to install ICE.

The log supports this correction. Immediately after Baker was installed, Archives retained the ordinary score of `3` (line 84), rather than receiving the HQ/backdoor formula. Later scores of `2` are explained by the bounded recent-run pressure nudge and are not proof that Baker was recognized.

The fix lets Baker's helper temporarily supply the proposed source server while making this read-only planning query and restores the real `attackedServer` in a `finally` block. Real redirect enumeration and payment still use the actual active run state.

### The reserve gate could not veto Archives' first ICE

The proposed `_serverHasStakes()` diagnosis did not explain a completely naked Archives. `_shouldInstallIceLayer()` starts with:

```js
var shouldInstall = this._unrezzedIce(server).length == 0;
```

For Archives with no ICE, that is true. The low-economy branch only turns it off when the server already has rezzed ICE. Therefore changing `_serverHasStakes()` alone could not make the first Archives layer possible; it was already permitted.

The real downstream planning defect was that `_rankedInstallOptions()` asked for one server before applying the layer policy. In the later log states, accumulated debt often ranked R&D first. R&D already had unrezzed ICE, so the low-economy policy rejected another layer, and planning returned no ICE options without considering Archives next.

`_serverToProtect()` now accepts an optional action-specific eligibility predicate. ICE-install planning uses it to rank only servers that can accept a layer under the current economy policy. Other callers retain the existing ranking and HQ fallback behavior. The Archives rotation guard is applied to this viable set, so an ineligible R&D target cannot suppress a valid Archives install.

### The ICE affordability claim was incorrect

The report described Diviner, Empiricist, and Mycoweb as cost 2–5 and affordable throughout the late game. Current card definitions give these rez costs:

| ICE | Rez cost | Relevant state |
|---|---:|---|
| Diviner | 3 | Already installed in Remote 0 during the early Baker turn |
| Empiricist | 7 | Not affordable at the repeated 4–6 credit decisions |
| Mycoweb | 8 | Not affordable at those decisions |

At the logged 7-credit decision, advancement was considered first and spent a credit; the following decision therefore had only 6 credits. The original log does not prove that the Corp declined an executable Archives ICE install on those exact clicks. The decision fixture is consequently documented as a variation of the 7-credit state with advancement omitted from the offered actions, isolating the protection-install decision without claiming an exact replay.

## Why R&D was not changed as proposed

The original proposal suggested making R&D a stake when an agenda is known or likely to be near the top. The current code has no validated public-state estimate for that fact, and reading `corp.RnD.cards` would let the AI use hidden card order. That change was rejected.

R&D threats already affect ranking through public central-pressure and run-history models. The new viable-target fallback prevents a blocked R&D layer from suppressing another legal protection target. A future R&D reserve exception should be based on a separately calibrated public signal and its own fixtures, not hidden deck contents.

The `.cards` test in `_serverHasStakes()` was therefore not simply inverted. Central servers have `.cards`; remote servers do not. The function now handles HQ and Archives explicitly, deliberately leaves R&D on the ordinary economy policy, and falls through to the HVT-root check only for remotes.

## Tests

Coverage added or extended:

- `tests/vantagepoint-integration.test.js` verifies Baker recognizes a real Touchstone credit outside a run and restores `attackedServer` after planning.
- `tests/corp-server-security.test.js` covers Archives stakes from agendas, backdoors, and run pressure; confirms hidden R&D contents do not bypass the reserve; and verifies that ICE planning can fall through from a blocked higher-ranked target.
- `tests/fixtures/corp-decisions/corp-protects-baker-backdoor-after-rnd-layer-blocked.txt` reconstructs the logged board, supplies its recorded R&D/Archives debt, and verifies an affordable Empiricist is installed on Archives in the isolated install decision.
- The decision-fixture harness now loads `sets/vantagepoint.js`, so the fixture uses the real Baker and Touchstone implementations.

The generic hook contract and Baker's prospective-run handling are documented in `documentation/ai.md`.

## Unchanged behavior

- Empty Archives without an agenda, backdoor, public reward, or recent pressure remains ineligible.
- Baker remains optional per run; direct Archives runs and redirected runs are both possible.
- The overall economy reserve arithmetic is unchanged.
- The Corp still avoids adding frivolous layers when poor, and affordable-install checks include existing unrezzed ICE rez costs.
- R&D contents remain hidden from AI heuristics that should use only public information.

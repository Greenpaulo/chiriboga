# Carnivore is not offered while using “Access All” on cards already in Archives

**Source:** `documentation/debug-logs/chiriboga-log-2026-09-19T22_44_37.628Z.txt` (lines 1659-1701)
**Files:** `checks.js`, `sets/systemgateway.js`, `utility.js`, `phase.js`
**Status:** Resolved as correct rules behavior. Regression coverage added; no gameplay change is required.

---

## 1. Summary

The Runner used **Access All** during a breach of Archives and automatically accessed 17 cards without being offered Carnivore. This initially looked like the bulk-access shortcut had skipped a legal access ability.

It did not. Every card shown in the log was already in Archives. Netrunner Comprehensive Rules 7.1.5b says that the Runner cannot trash or pay the trash cost of a card in the Corp's discard pile, either with the basic trash ability or with another mid-access ability. Carnivore is therefore not legal for any of those accesses.

The existing implementation enforces that rule through `CheckTrash()`. Carnivore calls `CheckTrash(accessingCard)` before offering its ability, and `CheckTrash()` returns `false` for a card whose location is `corp.archives.cards`. Because there was no legal choice to make, **Access All** correctly continued through the cards.

No gameplay code was changed. A focused regression test now protects both sides of the behavior: Carnivore is unavailable for a card already in Archives and remains available for a trashable card accessed elsewhere.

---

## 2. What happened in the log

The relevant run begins at line 1659. After passing Syailendra, the Runner breached Archives and selected **Access All**. Lines 1685-1701 list these accesses:

```text
Petty Cash accessed
Seamless Launch accessed
Semak-samun accessed
Otto Campaign accessed
Nanomanagement accessed
Mercia B4LL4RD accessed
Mahkota Langit Grid accessed
Brân 1.0 accessed
Regolith Mining License accessed
Mercia B4LL4RD accessed
Spin Doctor accessed
Manegarm Skunkworks accessed
Otto Campaign accessed
Ansel 1.0 accessed
Hedge Fund accessed
Hedge Fund accessed
Hedge Fund accessed
```

Carnivore was installed (line 1240), unused that turn, and the Runner had five cards in grip, so its once-per-turn restriction and two-card cost were not the blockers. The blocker was the location of the accessed cards: all 17 were in the Corp's discard pile.

There was no card installed in the root of Archives in this breach. If there had been an installed, trashable root card, it would not have had `corp.archives.cards` as its location and Carnivore would have been offered normally.

---

## 3. Rules and root cause

### 3.1 Carnivore is a mid-access trash ability

Carnivore reads:

> Access, once per turn — Trash 2 cards from your grip: Trash the card you are accessing.

Comprehensive Rules 7.1.5b applies to Carnivore as well as the basic paid trash ability: a card already in the Corp's discard pile cannot be trashed by a mid-access ability. Trashing is a move to the owner's discard pile, so a card already in that location is not a legal object to trash.

### 3.2 The implementation already applies the rule

`checks.js` rejects cards already in either discard pile:

```js
function CheckTrash(card) {
  if (card == null) return false;
  if (card.cardLocation == corp.archives.cards) return false;
  if (card.cardLocation == runner.heap) return false;
  if (CardEffectsForbid("trash", card)) return false;
  return true;
}
```

Carnivore's `Enumerate()` method uses that central legality check:

```js
if (!CheckAccessing()) return [];
if (!CheckTrash(accessingCard)) return [];
```

This returns no Carnivore option for each card in the Archives pile. The access phase then has only **Continue**, which the **Access All** mode resolves automatically as intended.

### 3.3 Why this is not an “Access All” pause bug

Bulk access does not suppress legal commands. The run-access phase still enumerates `trash`, `steal`, and access-triggered abilities for each card. It only auto-continues when there is no decision for the human player.

The absence of a Carnivore prompt in this log is therefore the visible result of the trash-legality rule, not the cause of the behavior.

---

## 4. Fix

No gameplay change was made because allowing Carnivore to trash cards already in Archives would violate rule 7.1.5b and could incorrectly fire effects that care about the Runner trashing Corp cards.

Added `tests/carnivore-archives-access.test.js`. It executes the real `CheckTrash()` function and Carnivore's real `Enumerate()` method to verify:

1. A card located in `corp.archives.cards` is not trashable.
2. Carnivore is not offered while that card is being accessed.
3. Carnivore is still offered for a trashable accessed card outside Archives when the Runner can pay its two-card cost.

This documents and locks down the intended distinction between cards **in the Archives pile** and installed cards **in the root of Archives**.

---

## 5. Acceptance criteria

- [x] The source log is checked and all cards involved are confirmed to be in the Archives pile.
- [x] Carnivore is not offered while accessing a card already in `corp.archives.cards`.
- [x] **Access All** continues automatically when no legal access action exists.
- [x] Carnivore remains available for a trashable card accessed outside the Archives pile when its cost can be paid.
- [x] A regression test covers the location check and both Carnivore outcomes.
- [x] No rules-invalid gameplay change is introduced.
- [x] `node tests/carnivore-archives-access.test.js` passes.
- [x] `node -c checks.js`, `node -c sets/systemgateway.js`, `node -c utility.js`, and `node -c phase.js` pass.

---

## 6. Implementation record (2026-09-21)

Traced the reported breach in `chiriboga-log-2026-09-19T22_44_37.628Z.txt`, verified Carnivore's state and cost were otherwise valid, and identified `CheckTrash()`'s Archives-location guard as the reason no ability was offered. Compared that guard with Comprehensive Rules 7.1.5b and confirmed the implementation is correct.

Added the focused regression test described above. No production code was changed.

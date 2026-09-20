# Backlog: Hardcoded card titles should not be in the ai logic if possible

Line 4074 of `ai_corp.js` includes hardcoded cards, breaking our guidelines issued in `documentation\corp-ai\roadmaps\corp_ai_improvement_roadmap.md`

```js
Phase_PostAction(optionList) {
    if (optionList.indexOf("rez") > -1) {
      var rezzableNonIceCards = this._rezzableNonIceCards();
      //list of cards (by title) to rez post-action
      var cardsToRezPostAction = ["SanSan City Grid"];
      if (this._clicksLeft() > 0)
        cardsToRezPostAction.push(
          "Regolith Mining License",
          "Ronin",
          "Reversed Accounts",
        );
```

Should this be made into a new AI hook and implemented on the cards themselves in `/sets` that should be included here? e.g. `AIShouldRezPostAction`

For reference, existing AI Hooks are defined in `documentation/ai.md`

We also have a similar hardcoded issue at line 4407

```js
for (var i = 0; i < corp.resolvingCards.length; i++) {
  if (corp.resolvingCards[i].title == 'Neurospike')
    startingDamage += corp.resolvingCards[i].printedAgendaPointsThisTurn;
  else if (corp.resolvingCards[i].title == 'Punitive Counterstrike')
    startingDamage += corp.resolvingCards[i].printedAgendaPointsLastTurn;
}
```

Actually looking at the ai_corp.js file this is a bigger problem than I first thoughts, there 60 hits of "title" in the file...

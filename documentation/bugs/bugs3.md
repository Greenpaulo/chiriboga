So...back when we intially started to improve the corp ai the first thing i noticed was that it tended to flood it's own hand with agendas when HQ wasn't even secure enough to protect them. The outcome of this investigation was `_evaluateHQDanger` function line 1430 of `ai_corp.js`....and then used at line 3135 as the check to use before drawing a card.

Since then we introduced many more improvements to the corp ai, outlined in `documentation/corp-ai/roadmaps/corp_ai_improvement_roadmap.md`. Specifically, we now have `_evaluateServerSecurity()`....a much more thorough check which takes in a "server" argument.

Evaluate whether we still need `_evaluateHQDanger`, or if we would be better deleting this function and using the improved `_evaluateServerSecurity`, passing in HQ as the argument.

Note: This bug was noted still occuring in the recent debug log `documentation\debug-logs\corp_drew_3_agendas_even_though_hq_wasn't_secure.txt` - hence the investigation above.

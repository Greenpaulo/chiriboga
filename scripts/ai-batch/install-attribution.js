'use strict';

// Harness-only return capture. Wrappers call each policy method exactly once;
// they never evaluate a missing input or modify a returned option/candidate.
function observeInstallDecisions(ai, {safe, active, tracker, turn, corp}) {
  let frame = null, nextDecision = 0, choiceId = 0, nextChoice = 0;
  const recent = new WeakMap(), selected = new WeakMap(), hookResults = new WeakMap();
  const scalar = value => typeof value === 'number' ?
    (Number.isFinite(value) ? value : String(value)) : 'unknown';
  const wrap = (name, capture) => {
    const original = ai[name];
    if (typeof original !== 'function') return;
    ai[name] = function(...args) {
      const value = original.apply(this, args);
      if (active()) safe(() => capture(args, value));
      return value;
    };
  };
  const valuesFor = (card, server) => {
    if (!frame.values.has(card)) frame.values.set(card, new Map());
    const values = frame.values.get(card);
    if (!values.has(server)) values.set(server, {});
    return values.get(server);
  };
  wrap('_scoringServers', ([servers], value) => {
    if (frame) { frame.empty = Array.from(servers); frame.scoring = Array.from(value); }
  });
  wrap('_isAScoringServer', ([server], value) => {
    if (frame) frame.eligibility.set(server, value);
  });
  wrap('_isHVT', ([card], value) => { if (frame) frame.hvt.set(card, value); });
  wrap('_uniqueCopyAlreadyInstalled', ([card], value) => { if (frame) frame.unique.set(card, value); });
  wrap('_scoringWindow', ([server], value) => { if (frame) frame.windows.set(server, scalar(value)); });
  wrap('_protectionScore', ([server, options], value) => {
    if (!frame) return;
    if (!frame.protection.has(server)) frame.protection.set(server, []);
    // Different callers pass different flags; retain the call context rather
    // than presenting the last assessment as the destination's decisive score.
    frame.protection.get(server).push({value: scalar(value), options: Object.fromEntries(
      Object.entries(Object.getOwnPropertyDescriptors(options || {}))
        .filter(([, descriptor]) => ['string', 'number', 'boolean'].includes(typeof descriptor.value))
        .map(([key, descriptor]) => [key, typeof descriptor.value === 'number' ? scalar(descriptor.value) : descriptor.value]))});
  });
  wrap('_advancementLimit', ([card, server], value) => {
    if (frame) valuesFor(card, server).advancementLimit = scalar(value);
  });
  wrap('_deceptionInstallDistance', ([card, server], value) => {
    if (!frame) return;
    const row = valuesFor(card, server);
    // This call site is the actual root sort comparator, including generic
    // assets. A singleton never sorted has unknown comparator inputs.
    row.profileDistance = scalar(value);
    row.scoringWindow = frame.windows.get(server) ?? 0;
    row.sortObserved = true;
  });
  // One seam records a card hook's existing result; invoking the hook again
  // would violate passive observation and can consume randomness.
  ai._installAttribution = (card, destinations, result) => safe(() => {
    if (!active()) return;
    const hook = {destinations: Array.from(destinations), result: scalar(result), choiceId};
    hookResults.set(card, hook);
    if (frame) frame.hooks.set(card, hook);
  });
  const rank = ai._rankedInstallOptionsCore;
  ai._rankedInstallOptionsCore = function(...args) {
    if (!active()) return rank.apply(this, args);
    const previous = frame;
    frame = {id: ++nextDecision, values: new Map(), eligibility: new Map(), windows: new Map(),
      protection: new Map(), hvt: new Map(), unique: new Map(), hooks: new Map(), empty: [], scoring: []};
    try {
      const options = rank.apply(this, args);
      safe(() => {
        for (const card of args[0]) {
          const preferences = options.flatMap((option, rank) => option.cardToInstall === card ? [{
            serverId: tracker.serverId(option.serverToInstallTo), rank, reason: option.reason || 'unknown',
            iceCount: option.serverToInstallTo?.ice.length ?? 0,
            advancementLimit: 'unknown', profileDistance: 'unknown', scoringWindow: 'unknown', sortObserved: false,
            ...(frame.values.get(card)?.get(option.serverToInstallTo)?.sortObserved ?
              frame.values.get(card).get(option.serverToInstallTo) : {}),
          }] : []);
          const hook = frame.hooks.get(card);
          const record = {decisionId: frame.id, choiceId, source: 'ranked', turn: turn(), hvt: frame.hvt.get(card) ?? 'unknown',
            uniqueBlocked: frame.unique.get(card) ?? 'unknown',
            hook: hook ? {result: hook.result, destinations: hook.destinations.map(tracker.serverId)} : null,
            destinations: Array.from(corp().remoteServers || [], server => ({emptyProtected: frame.empty.includes(server), serverId: tracker.serverId(server), iceCount: server.ice.length, rootCount: server.root.length,
              scoringEligible: frame.eligibility.get(server) ?? 'unknown',
              protectionAssessments: frame.protection.get(server) ?? 'unknown',
              scoringWindow: frame.windows.get(server) ?? 'unknown'})), preferences};
          recent.set(card, {record, options: options.filter(option => option.cardToInstall === card)});
        }
      });
      return options;
    } finally { frame = previous; }
  };
  // Capture actual engine-option matching even when DecisionSnapshots is off.
  wrap('_bestInstallOption', ([options], index) => {
    const choice = options[index];
    if (!choice?.card) return;
    const prior = recent.get(choice.card);
    selected.set(choice.card, {server: choice.server, prior, selection: 'legalSelection', legalDestinations: options
      .filter(option => option.card === choice.card).map(option => tracker.serverId(option.server))});
  });
  wrap('_returnPreference', ([options, command, preference]) => {
    const card = preference?.cardToInstall;
    if (command !== 'install' || !card) return;
    const ranked = recent.get(card), observedHook = hookResults.get(card);
    const hook = observedHook?.choiceId === choiceId ? observedHook : null;
    const prior = ranked?.options.includes(preference) ? ranked : {
      record: {decisionId: ++nextDecision, choiceId, source: 'directCommand', turn: turn(), hvt: 'unknown', uniqueBlocked: 'unknown',
        hook: hook ? {result: hook.result, destinations: hook.destinations.map(tracker.serverId)} : null,
        destinations: [], preferences: [{serverId: tracker.serverId(preference.serverToInstallTo),
          rank: 0, reason: preference.reason || 'direct command preference',
          iceCount: preference.serverToInstallTo?.ice.length ?? 0,
          advancementLimit: 'unknown', profileDistance: 'unknown', scoringWindow: 'unknown', sortObserved: false}]},
      options: [preference],
    };
    selected.set(card, {server: preference.serverToInstallTo, prior, selection: 'commandPreference', chosen: preference, legalDestinations: null});
  });
  if (typeof ai.Choice === 'function') {
    const choice = ai.Choice;
    ai.Choice = function(...args) {
      if (!active()) return choice.apply(this, args);
      const previous = choiceId;
      choiceId = ++nextChoice;
      try { return choice.apply(this, args); }
      finally { choiceId = previous; }
    };
  }
  return {
    request(card, server) {
      if (!active() || !card) return;
      const actual = selected.get(card), prior = actual?.server === server ? actual.prior : recent.get(card);
      const matched = prior?.options.some(option => option.serverToInstallTo === server);
      const at = actual?.chosen ? prior?.options.indexOf(actual.chosen) :
        prior?.options.findIndex(option => option.serverToInstallTo === server);
      const preference = at >= 0 ? prior.record.preferences[at] : null;
      tracker.request(card, server, {selection: actual?.server === server ? actual.selection :
        matched ? 'matchingPriorRanking' : 'unknown',
        decision: matched ? prior.record : null,
        chosenRank: preference?.rank ?? null, chosenReason: preference?.reason ?? 'unknown',
        legalDestinations: actual?.server === server ? actual.legalDestinations : null});
      recent.delete(card); selected.delete(card); hookResults.delete(card);
    },
  };
}

module.exports = {observeInstallDecisions};

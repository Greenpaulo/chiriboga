'use strict';

// Harness truth only. Never call a policy evaluator or write on a game object.
function createRealizedDefenseTracker(emit) {
  const serverIds = new WeakMap(), rootIds = new WeakMap(), queries = new WeakMap(), installed = new Map(), events = new Map();
  let nextServer = 0, nextRoot = 0, nextCommitment = 0, sequence = 0;
  const serverId = server => {
    if (!serverIds.has(server)) serverIds.set(server, ++nextServer);
    return serverIds.get(server);
  };
  function observe(corp, turn, preexisting = false) {
    const present = new Set();
    for (const server of corp.remoteServers || []) {
      for (const card of server.root || []) {
        present.add(card);
        const old = installed.get(card);
        if (old && old.server === server) continue;
        if (old) leave(card, old, turn);
        if (!rootIds.has(card)) rootIds.set(card, ++nextRoot);
        const entry = {server, rootId: rootIds.get(card), serverId: serverId(server), commitmentId: ++nextCommitment,
          installedTurn: preexisting ? null : turn, leftCensored: preexisting};
        installed.set(card, entry);
        queries.delete(card);
        // A previous installation's guard/roll cannot label a reinstall.
        const policyId = corp.AI?._postureCardIds?.get(card);
        if (policyId !== undefined) events.delete(policyId);
        emit('realizedDefenseLifecycle', {action: 'install', turn, ...scalars(entry)});
      }
    }
    for (const [card, entry] of installed) if (!present.has(card)) leave(card, entry, turn);
  }
  function scalars(entry) {
    return {rootId: entry.rootId, serverId: entry.serverId, commitmentId: entry.commitmentId,
      installedTurn: entry.installedTurn, leftCensored: entry.leftCensored};
  }
  function leave(card, entry, turn) {
    installed.delete(card);
    emit('realizedDefenseLifecycle', {action: 'leave', turn, ...scalars(entry)});
  }
  function posture(card, server, ai) {
    const policyId = ai?._postureCardIds?.get(card);
    const event = events.get(policyId);
    const query = queries.get(card);
    const queryCurrent = query && (!event || event.sequence <= query.sequence);
    const record = ai?.options?.postureEpochs ? ai._postureEpochRecords?.get(server)?.get(card) :
      [ai?._serverBaitDecisions?.get(server), ai?._agendaBluffDecisions?.get(server)]
        .find(value => value?.card === card);
    const cached = record ? (ai.options.postureEpochs ? record.selectedScript !== 'neutral' :
      Boolean(record.bait || record.bluff)) : null;
    const horizonExpired = record && ai.options.postureEpochs ? ai._postureEpoch >= record.commitmentHorizon : null;
    const safety = queryCurrent ? (query.guarded ? 'stopped' : query.postured ? 'allowedAtLastQuery' : 'unknown') :
      event?.action === 'guard' ? 'stopped' :
      event && ['roll', 'reuse'].includes(event.action) ? 'allowedAtLastQuery' : 'unknown';
    // An expired script can remain cached until a later query. Report it, but
    // do not claim that the stale commitment is a known active posture.
    const structurallyIneligible = Boolean(card.faceUp || card.rezzed || card.knownToRunner) ||
      (card.cardType === 'agenda' || ai?.options?.deceptionLegibility) && server.root.length !== 1;
    const staleActive = cached && (structurallyIneligible || queryCurrent && (!query.postured || query.rootCount !== server.root.length));
    // Activation requires a stored roll in both epoch and lifetime modes.
    // No record establishes "not selected yet", even before the first query;
    // it says nothing about whether a later query would pass the safety guard.
    const effective = safety === 'stopped' ? 'safetyStopped' : !record ? 'unrolled' :
      !(query || event) ? 'unknown' : horizonExpired ? 'expired' : staleActive ? 'unknown' : cached ? 'active' : 'neutral';
    return {posture: effective, cachedPostured: cached, horizonExpired,
      safety, epochId: record?.epochId ?? null, lastQueryEpoch: query?.epoch ?? event?.epoch ?? null,
      lastQueryResult: query?.postured ?? null, lastQueryRootCount: query?.rootCount ?? null};
  }
  return {
    start(corp, turn) { observe(corp, turn, true); },
    observe,
    onPosture(event) {
      if (['bait', 'bluff'].includes(event.kind) && ['guard', 'roll', 'reuse'].includes(event.action))
        events.set(event.cardId, {...event, sequence: ++sequence});
    },
    // Observe returns of queries the AI already made, including silent early
    // returns. This never invokes a query or punishment hook for measurement.
    onQuery(kind, server, requestedCard, result, corp) {
      if (![true, false].includes(result)) throw Error('invalid observed posture query result');
      if (!server || !(corp.remoteServers || []).includes(server)) return;
      const cards = kind === 'bluff' ? server.root.filter(card => card.cardType === 'agenda') : requestedCard ? [requestedCard] :
        [server.root.find(card => card.player === corp && typeof card.AIPunishesAccess === 'function' &&
          !(card.faceUp || card.rezzed || card.knownToRunner))];
      for (const card of cards) {
        if (!card || installed.get(card)?.server !== server) continue;
        const event = events.get(corp.AI?._postureCardIds?.get(card));
        const previous = queries.get(card);
        queries.set(card, {postured: result, rootCount: server.root.length, epoch: corp.AI?._postureEpoch ?? null,
          guarded: event?.action === 'guard' && event.sequence > (previous?.sequence || 0), sequence: event?.sequence || 0});
      }
    },
    snapshot(corp, turn) {
      observe(corp, turn);
      const rows = [];
      for (const [card, entry] of installed) {
        const rootType = card.cardType === 'agenda' ? 'agenda' :
          (card.subTypes || []).includes('Ambush') || typeof card.AIPunishesAccess === 'function' ? 'trap' : null;
        if (!rootType) continue;
        rows.push({...scalars(entry), turn, rootType, iceCount: entry.server.ice.length,
          revealed: Boolean(card.faceUp || card.rezzed || card.knownToRunner),
          multiRoot: entry.server.root.length > 1,
          rootAge: entry.installedTurn === null ? null : turn - entry.installedTurn,
          ...posture(card, entry.server, corp.AI)});
      }
      emit('realizedDefenseSnapshot', {turn, rows});
      return rows;
    },
  };
}

module.exports = {createRealizedDefenseTracker};

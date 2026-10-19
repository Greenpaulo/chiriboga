'use strict';

// Harness truth only. Never call a policy evaluator or write on a game object.
function createRealizedDefenseTracker(emit) {
  const serverIds = new WeakMap(), rootIds = new WeakMap(), queries = new WeakMap(), installed = new Map(), events = new Map();
  const ice = new Map(), requests = new WeakMap(), leaving = new Map(), states = new Map(), overwritten = new WeakMap();
  let nextServer = 0, nextRoot = 0, nextCommitment = 0, sequence = 0;
  const serverId = server => {
    if (!server) return 0; // prospective new remote
    if (!serverIds.has(server)) serverIds.set(server, ++nextServer);
    return serverIds.get(server);
  };
  const rootType = card => card.cardType === 'agenda' ? 'agenda' :
    (card.subTypes || []).includes('Ambush') || typeof card.AIPunishesAccess === 'function' ? 'trap' : 'other';
  function observe(corp, turn, preexisting = false, runner = null) {
    const present = new Set();
    for (const server of corp.remoteServers || []) {
      for (const card of server.root || []) {
        present.add(card);
        const old = installed.get(card);
        if (old && old.server === server) continue;
        if (old) leave(card, old, turn);
        if (!rootIds.has(card)) rootIds.set(card, ++nextRoot);
        const entry = {server, rootId: rootIds.get(card), serverId: serverId(server), commitmentId: ++nextCommitment,
          installedTurn: preexisting ? null : turn, leftCensored: preexisting, rootType: rootType(card)};
        installed.set(card, entry);
        queries.delete(card);
        // A previous installation's guard/roll cannot label a reinstall.
        const policyId = corp.AI?._postureCardIds?.get(card);
        if (policyId !== undefined) events.delete(policyId);
        const request = requests.get(card);
        if (request) request.committed = true;
        requests.delete(card);
        emit('realizedDefenseLifecycle', {action: 'install', turn, ...scalars(entry),
          iceCount: preexisting ? null : server.ice.length,
          requestedIceCount: preexisting ? null : request?.iceCount ?? null,
          observedIceCount: server.ice.length, multiRoot: server.root.length > 1,
          revealed: Boolean(card.faceUp || card.rezzed || card.knownToRunner),
          ...posture(card, server, corp.AI),
          placement: preexisting ? null : request?.placement ?? null});
      }
    }
    for (const [card, entry] of installed) if (!present.has(card)) leave(card, entry, turn);
    // Changes are recorded once per server, with the commitments sharing that
    // defense. Root rows must not turn one layer into several allocations.
    const servers = new Set(corp.remoteServers || []);
    for (const server of new Set([...servers, ...ice.keys()])) {
      const previous = ice.get(server), current = new Set(servers.has(server) ? server.ice : []);
      if (previous && !preexisting) {
        const commitments = [...installed.values()].filter(entry => entry.server === server).map(entry => entry.commitmentId);
        for (const [action, cards, other] of [['iceAdded', current, previous], ['iceRemoved', previous, current]]) {
          const count = [...cards].filter(card => !other.has(card)).length;
          if (count) emit('realizedDefenseChange', {action, turn, serverId: serverId(server), count, commitments});
        }
      }
      if (servers.has(server)) ice.set(server, current); else ice.delete(server);
    }
    for (const [card, entry] of installed) transition(card, entry, corp.AI, turn);
    settle(corp, runner, turn);
  }
  function scalars(entry) {
    return {rootId: entry.rootId, serverId: entry.serverId, commitmentId: entry.commitmentId,
      installedTurn: entry.installedTurn, leftCensored: entry.leftCensored, rootType: entry.rootType};
  }
  function leave(card, entry, turn) {
    installed.delete(card);
    states.delete(entry.commitmentId);
    leaving.set(entry.commitmentId, {card, entry, turn});
    emit('realizedDefenseLifecycle', {action: 'leave', turn, ...scalars(entry)});
  }
  function settle(corp, runner, turn, final = false) {
    for (const [id, {card, entry, turn: leftTurn}] of leaving) {
      const location = card.cardLocation;
      if (location && location === corp.archives?.cards && overwritten.has(card) && !overwritten.get(card).committed && !final) continue;
      const fate = location && location === corp.scoreArea ? 'scored' :
        location && location === runner?.scoreArea ? 'stolen' :
        location && location === corp.archives?.cards ? overwritten.get(card)?.committed ? 'overwritten' : 'trashed' :
        location && (location === corp.HQ?.cards || location === corp.RnD?.cards) ? 'returned' :
        [...installed.keys()].includes(card) ? 'movedOrReinstalled' : final ? 'unknown' : null;
      if (!fate) continue;
      emit('realizedDefenseLifecycle', {action: 'endpoint', fate, turn, leftTurn, ...scalars(entry)});
      leaving.delete(id);
      overwritten.delete(card);
    }
  }
  function transition(card, entry, ai, turn) {
    const current = posture(card, entry.server, ai);
    const value = JSON.stringify([current.posture, current.safety, current.epochId]);
    const previous = states.get(entry.commitmentId);
    if (previous?.value !== value) {
      states.set(entry.commitmentId, {value, posture: current.posture});
      emit('realizedDefenseChange', {action: 'posture', turn, ...scalars(entry),
        previous: previous?.posture ?? null, ...current});
    }
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
      card.cardType === 'agenda' && server.root.length !== 1;
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
    serverId,
    request(card, server, placement) {
      const request = {iceCount: server?.ice.length ?? 0,
        placement: {...placement, requestedServerId: serverId(server)}, committed: false};
      requests.set(card, request);
      if (['agenda', 'asset'].includes(card.cardType))
        for (const root of server?.root || [])
          if (['agenda', 'asset'].includes(root.cardType)) overwritten.set(root, request);
    },
    start(corp, turn) { observe(corp, turn, true); },
    observe,
    finish(corp, runner, turn) {
      observe(corp, turn, false, runner);
      settle(corp, runner, turn, true);
      for (const entry of installed.values())
        emit('realizedDefenseLifecycle', {action: 'endpoint', fate: 'gameEnd', turn, ...scalars(entry)});
    },
    onPosture(event) {
      if (['bait', 'bluff'].includes(event.kind) && ['guard', 'roll', 'reuse'].includes(event.action))
        events.set(event.cardId, {...event, sequence: ++sequence});
    },
    // Observe returns of queries the AI already made, including silent early
    // returns. This never invokes a query or punishment hook for measurement.
    onQuery(kind, server, requestedCard, result, corp, turn = 0) {
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
        transition(card, installed.get(card), corp.AI, turn);
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

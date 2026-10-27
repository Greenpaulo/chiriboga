// Feature reproduction: bulk Archives access should not zoom routine cards.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, path.basename(__dirname) === 'pending' ? '../..' : '..');
const source = fs.readFileSync(path.join(root, 'phase.js'), 'utf8');
const start = source.indexOf('phases.runAccessingCard = {');
const end = source.indexOf('//Run: run unsuccessful', start);
assert(start >= 0 && end > start, 'access phase must exist');

function access({bulk = true, agenda = false, rootCard = false, server = 'archives'} = {}) {
  let zooms = 0;
  const events = [];
  const runner = {AI: null};
  const corp = {archives: {cards: [], root: []}, HQ: {cards: [], root: []}};
  const attackedServer = corp[server];
  const card = {
    cardType: agenda ? 'agenda' : 'operation', imageFile: 'test.png',
    cardLocation: rootCard ? attackedServer.root : attackedServer.cards,
    renderer: {ToggleZoom() { zooms++; }},
  };
  card.cardLocation.push(card);
  const context = {
    phases: {}, runner, corp, attackedServer, accessingCard: card,
    accessedCards: {cards: [], root: []}, viewingPlayer: runner, playerTurn: runner,
    autoAccessing: bulk,
    SetHistoryThumbnail() {}, RecordPublicPostureEvent() {},
    AutomaticTriggers(name) { events.push(name); },
    TriggeredResponsePhase(player, name) { events.push(name); },
    ChoicesActiveTriggers() { return []; },
    ChoicesTriggerableAbilities() { return []; },
    CheckSteal() { return agenda; }, CheckTrash() { return false; },
    StealCost() { return {credits: 0, clicks: 0, programs: 0}; },
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);
  context.currentPhase = context.phases.runAccessingCard;
  context.currentPhase.Init();
  assert.deepStrictEqual(events, ['automaticOnAccess', 'responseOnAccess'], 'access triggers must still run');
  assert.strictEqual(context.accessedCards[rootCard ? 'root' : 'cards'][0], card, 'normal access bookkeeping must run');
  return zooms;
}

assert.strictEqual(access({bulk: false}), 1, 'individual access must still show the card');
assert.strictEqual(access({agenda: true}), 1, 'bulk access must still show agendas');
assert.strictEqual(access({rootCard: true}), 1, 'installed root cards must still be shown');
assert.strictEqual(access({server: 'HQ'}), 1, 'other servers must retain normal presentation');
assert.strictEqual(access(), 0, 'bulk Archives access must not zoom routine non-agendas');
console.log('5 Archives fast-access presentation cases passed.');

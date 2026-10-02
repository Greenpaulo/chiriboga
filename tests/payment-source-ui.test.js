// Run with: node tests/payment-source-ui.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
let footerHtml = '';
const jqueryResult = {
  html(value) {
    if (typeof value !== 'undefined') footerHtml = value;
    return this;
  },
  show() { return this; },
  hide() { return this; },
  css() { return this; },
};
const context = {
  console: {log() {}, warn() {}, error() {}},
  $() { return jqueryResult; },
  activePlayer: {AI: null, testAI: null},
  viewingPlayer: {},
  runner: {heap: [], stack: [], grip: [], identityCard: {}},
  corp: {
    archives: {cards: []},
    RnD: {cards: []},
    HQ: {cards: []},
  },
  attackedServer: null,
  accessingCard: null,
  accessibilityMode: 'graphics',
  currentPhase: {},
  phaseOptions: {},
  executingCommand: 'continue',
  TutorialWhitelist: null,
  TutorialBlacklist: null,
  useHostForAvailability: false,
  viewingGrid: [],
  GetServer() { return null; },
  OptionsAreOnlyUniqueServers() { return false; },
  OptionsAreOnlyUniqueSubroutines() { return false; },
  Iconify(value) { return value; },
  AutoContinueButtonHTML() { return ''; },
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'command.js'), 'utf8'), context);

function selectableCard(title) {
  const card = {title, player: context.activePlayer};
  card.renderer = {
    glows: 0,
    UpdateGlow() { this.glows += 1; },
  };
  return card;
}

const installedSource = selectableCard('Installed source');
const identitySource = selectableCard('Identity source');
const overclock = selectableCard('Overclock');
context.validOptions = [
  {card: installedSource, num: 1, label: 'Use 1 credit from Installed source', command: 'continue'},
  {card: identitySource, num: 1, label: 'Use 1 credit from Identity source', command: 'continue'},
  {card: overclock, num: 1, label: 'Use 1 credit from Overclock', command: 'continue'},
  {card: null, num: 1, label: 'Spend 1 credit from the credit pool', button: 'Spend 1[c] from pool', command: 'continue'},
];

context.MakeChoice();

assert(footerHtml.includes('Spend 1[c] from pool'), 'the pool choice renders in the footer');
for (const source of [installedSource, identitySource, overclock]) {
  assert.strictEqual(source.renderer.glows, 1, `${source.title} is highlighted as clickable`);
}

console.log('4 payment-source UI regression cases passed.');

// Independent review probe. Run from any directory with Node pinned in .nvmrc.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '../../../../..');
let seed = 36066;
const seededMath = Object.create(Math);
seededMath.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const c = {console: {log() {}, warn() {}, error() {}}, runner: {side: 'runner'}, corp: {side: 'corp'}, cardSet: [], setIdentifiers: [], Math: seededMath, Date};
vm.createContext(c);
for (const file of ['config.js', 'utility.js']) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), c, {filename: file});
for (const info of Object.values(c.setRegistry.availableSets)) {
  const file = 'sets/' + info.file + '.js';
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), c, {filename: file});
}
const metadata = JSON.parse(fs.readFileSync(path.join(root, 'carddata/carddata.json'), 'utf8')).data.filter(d => d.pack_code === 'vp');
const source = fs.readFileSync(path.join(root, 'sets/vantagepoint.js'), 'utf8');
const definitionIds = [...source.matchAll(/^cardSet\[(\d+)\]\s*=/gm)].map(m => +m[1]);
assert.strictEqual(metadata.length, 66);
assert.deepStrictEqual(definitionIds, metadata.map(d => +d.code).sort((a, b) => a-b));
assert.strictEqual(new Set(definitionIds).size, 66, 'exactly one definition per ID');
const tracker = fs.readFileSync(path.join(root, 'documentation/new-sets/current-set-implementation.md'), 'utf8');
const queue = tracker.split('## Batch queue')[1].split('## Completion log')[0];
const covered = [...queue.matchAll(/^\|\s*\d+\s*\|\s*(\d+)–(\d+)\s*\|/gm)].flatMap(m => Array.from({length: +m[2]-+m[1]+1}, (_, i) => +m[1]+i));
assert.deepStrictEqual(covered, definitionIds, 'batch boundaries cover intended IDs once');
const issues = [];
const fieldMap = {influence_cost: 'influence', agenda_points: 'agendaPoints', advancement_cost: 'advancementRequirement', minimum_deck_size: 'deckSize', influence_limit: 'influenceLimit', memory_cost: 'memoryCost', base_link: 'link', trash_cost: 'trashCost', strength: 'strength'};
for (const data of metadata) {
  const card = c.cardSet[+data.code];
  assert.strictEqual(card.title, data.title);
  assert.strictEqual(card.cardType, data.type_code);
  assert.strictEqual(card.player, c[data.side_code]);
  assert(Number.isFinite(card.elo), data.code + ': finite ELO');
  assert.strictEqual(card.imageFile, data.code + '.png');
  const image = path.join(root, 'images', c.ChangeImageFileToJPG(card.imageFile));
  assert(fs.statSync(image).size > 0, data.code + ': nonempty resolved image');
  const map = {...fieldMap, cost: ['ice', 'asset', 'upgrade'].includes(data.type_code) ? 'rezCost' : ['event', 'operation'].includes(data.type_code) ? 'playCost' : 'installCost'};
  for (const [metaField, codeField] of Object.entries(map)) {
    if (typeof data[metaField] === 'number' && typeof card[codeField] !== 'function' && card[codeField] !== data[metaField]) {
      issues.push(`${data.code} ${data.title}: ${codeField}=${card[codeField]}, metadata ${metaField}=${data[metaField]}`);
    }
  }
}
assert.strictEqual(c.setRegistry.availableSets.vantagepoint.hidden, true);
assert.strictEqual(c.setRegistry.availableSets.vantagepoint.untested, true);
assert(!c.setRegistry.decklauncherSets.includes('vantagepoint'));
assert(!c.setRegistry.gauntletSets.includes('vantagepoint'));
let decks = 0;
const formats = [];
for (const [key, format] of Object.entries(c.formatRegistry)) {
  if (!format.sets.includes('vp')) continue;
  formats.push(`${key} (${format.enabled ? 'enabled' : 'disabled'})`);
  const identities = c.cardSet.map((card, id) => ({card, id})).filter(x => x.card && x.card.cardType === 'identity' && format.sets.includes(c.DeckBuildSetCodeForCard(x.id)));
  for (const {card: identity, id} of identities) {
    for (let repetition = 0; repetition < 3; repetition++) {
      const deck = c.DeckBuild(identity, undefined, undefined, undefined, undefined, format.sets);
      const size = identity.deckSize + (identity.player === c.corp ? 4 : 0);
      assert.strictEqual(deck.length, size, `${key}/${id}: size`);
      assert(c.CountInfluence(identity, deck) <= identity.influenceLimit, `${key}/${id}: influence`);
      const counts = new Map();
      for (const code of deck) {
        const card = c.cardSet[code];
        assert(card && card.cardType !== 'identity');
        assert.strictEqual(card.player, identity.player);
        assert(format.sets.includes(c.DeckBuildSetCodeForCard(code)));
        counts.set(code, (counts.get(code) || 0) + 1);
      }
      for (const [code, count] of counts) {
        const card = c.cardSet[code];
        const limit = typeof card.AILimitPerDeck === 'number' ? card.AILimitPerDeck : typeof card.limitPerDeck === 'number' ? card.limitPerDeck : 3;
        assert(count <= limit, `${key}/${id}/${code}: copies`);
      }
      if (identity.player === c.corp) {
        const points = deck.reduce((sum, code) => sum + (c.cardSet[code].agendaPoints || 0), 0);
        const min = 2 * Math.floor(size/5) + 2;
        assert(points >= min && points <= min+1, `${key}/${id}: agenda points`);
      }
      decks++;
    }
  }
}
console.log(`Set integration: 66 unique cards, exact batch coverage, finite ELO and nonempty images; ${decks} seeded legal decks across ${formats.join(', ')}.`);
for (const issue of issues) console.error(issue);
console.log(`Printed numeric-field comparison: ${issues.length} differences requiring inspection.`);
process.exitCode = issues.length ? 1 : 0;

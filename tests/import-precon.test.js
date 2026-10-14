// Run with: node tests/import-precon.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {EventEmitter} = require('events');

const scriptDir = path.resolve(__dirname, '../scripts');
const source = fs.readFileSync(path.join(scriptDir, 'import-precon.js'), 'utf8');

async function importDeck(identity, cards) {
  let output;
  const errors = [];
  const context = {
    __dirname: scriptDir,
    process: {
      argv: ['node', 'import-precon.js', 'fixture', identity],
      exit: code => errors.push(`Exited with ${code}`),
    },
    console: {log() {}, error: message => errors.push(message)},
    require(name) {
      if (name === 'fs') return {
        readFileSync: fs.readFileSync,
        writeFileSync: (filename, contents) => { output = contents; },
      };
      if (name === 'https') return {
        get(url, callback) {
          const response = new EventEmitter();
          response.statusCode = 200;
          callback(response);
          process.nextTick(() => {
            response.emit('data', JSON.stringify({
              success: true, data: [{name: 'Import fixture', cards}],
            }));
            response.emit('end');
          });
          return new EventEmitter();
        },
      };
      return require(name);
    },
  };
  vm.runInNewContext(source, context, {filename: 'import-precon.js'});
  await new Promise(resolve => setImmediate(resolve));
  assert.deepStrictEqual(errors, []);
  assert(output, 'Importer must write a precon');
  const identityCard = JSON.parse(fs.readFileSync(
    path.join(scriptDir, '../carddata/carddata.json'), 'utf8',
  )).data.find(card => card.code === identity);
  assert(output.includes(`identity: "${identity}",  // ${identityCard.title}`),
    'Identity entry must include its card title');
  let deck;
  vm.runInNewContext(output, {registerPrecon: value => { deck = value; }});
  return deck;
}

(async () => {
  const mixed = await importDeck('30001', {
    '30001': 1, '30030': 3, '35019': 3, '36015': 1,
  });
  assert.deepStrictEqual(Array.from(mixed.sets), ['sg', 'elev', 'vp']);
  assert(!Object.hasOwn(mixed.cards, '30001'), 'Identity must stay out of deck cards');

  const identityOnly = await importDeck('36017', {'30030': 3, '35019': 3});
  assert.deepStrictEqual(Array.from(identityOnly.sets), ['sg', 'elev', 'vp'],
    'Include the identity set even when absent from deck cards and API response');

  const existing = await importDeck('31001', {'01001': 1, '30030': 3, '31002': 1});
  assert.deepStrictEqual(Array.from(existing.sets).sort(), ['core', 'sg', 'su21']);
  console.log('Precon importer regression cases passed (3 cases).');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

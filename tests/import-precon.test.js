// Run with: node tests/import-precon.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {EventEmitter} = require('events');

const scriptDir = path.resolve(__dirname, '../scripts');
const source = fs.readFileSync(path.join(scriptDir, 'import-precon.js'), 'utf8');

async function importDeck(identity, cards, expectedError) {
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
  if (expectedError) {
    assert(errors.some(message => expectedError.test(message)), errors.join('\n'));
    assert.strictEqual(output, undefined, 'An unknown set must fail before writing a precon');
    return;
  }
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
  const splitReleases = await importDeck('26010', {
    '03001': 1, '26065': 1, '26066': 1, '26130': 1,
    '33001': 1, '33065': 1, '33066': 1, '33128': 1,
    '34001': 1, '34065': 1, '34066': 1, '34130': 1,
  });
  assert.deepStrictEqual(Array.from(splitReleases.sets).sort(),
    ['cac', 'df', 'ms', 'ph', 'rwr', 'tai', 'ur'],
    'Use the configured ranges, including both sides of split-release boundaries');
  const downfallIdentity = await importDeck('26010', {'30030': 3});
  assert.deepStrictEqual(Array.from(downfallIdentity.sets), ['sg', 'df']);

  for (const name of ['Az', 'Hyoubu', 'Nebula']) {
    let precon;
    vm.runInNewContext(fs.readFileSync(path.join(scriptDir,
      `../precons/[Standard So Far] - ${name}.js`), 'utf8'),
      {registerPrecon: value => { precon = value; }});
    const imported = await importDeck(precon.identity, precon.cards);
    assert.deepStrictEqual(Array.from(imported.sets), ['df', 'sg', 'elev', 'vp']);
    assert.deepStrictEqual(Array.from(precon.sets), Array.from(imported.sets),
      `The committed ${name} precon must agree with a fresh import`);
  }
  await importDeck('30001', {'99999': 1}, /Cannot determine set for card 99999/);
  console.log('Precon importer regression cases passed (9 cases).');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

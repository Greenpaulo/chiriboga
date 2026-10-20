// Run with: node tests/elo-scripts.test.js
// Every CSV and fetch response here is synthetic; never read the repository cache.
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const {spawnSync} = require('child_process');
const root = path.resolve(__dirname, '..');
let cases = 0;
const failures = [];
function test(name, check) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chiriboga-elo-test-'));
  for (const folder of ['scripts', 'sets', 'data']) fs.mkdirSync(path.join(dir, folder));
  for (const file of ['fill-elo.mjs', 'scrape-elo.mjs'])
    fs.copyFileSync(path.join(root, 'scripts', file), path.join(dir, 'scripts', file));
  const put = (file, text) => fs.writeFileSync(path.join(dir, file), text);
  const get = file => fs.readFileSync(path.join(dir, file), 'utf8');
  const run = (file, args = [], success = true) => {
    const result = spawnSync(process.execPath, file === 'scrape-elo.mjs'
      ? ['--import', './mock-fetch.mjs', 'scripts/' + file, ...args]
      : ['scripts/' + file, ...args], {cwd: dir, encoding: 'utf8'});
    assert.strictEqual(result.status === 0, success, result.stdout + result.stderr);
    return result.stdout + result.stderr;
  };
  const csv = rows => put('data/elo.csv', 'id,name,elo,votes\n' + rows + '\n');
  const values = file => {
    const context = {cardSet: [], coreSet: []};
    vm.runInNewContext(get(file), context);
    return context;
  };
  const mockFetch = (status, html) => put('mock-fetch.mjs',
    `globalThis.fetch = async () => ({ok: ${status === 200}, status: ${status}, text: async () => ${JSON.stringify(html)}});`);
  try { check({put, get, run, csv, values, mockFetch}); cases++; }
  catch (error) { failures.push(name + ': ' + error.message); }
  finally { fs.rmSync(dir, {recursive: true, force: true}); }
}

test('CRLF and BOM CSV, legacy coreSet, Unicode and padded IDs', ({put, get, run, values}) => {
  put('data/elo.csv', '\uFEFFid,name,elo,votes\r\n01001,"Noise: Hacker Extraordinaire",1831,158\r\n01002,"Déjà Vu",1869,179\r\n');
  put('sets/example.js', 'coreSet[1001] = {\r\n  title: "Noise: Hacker Extraordinaire",\r\n};\r\ncardSet[1002] = {\r\n  title: "Déjà Vu",\r\n};\r\n');
  run('fill-elo.mjs');
  assert.strictEqual(values('sets/example.js').coreSet[1001].elo, 1831);
  assert.strictEqual(values('sets/example.js').cardSet[1002].elo, 1869);
  assert(!/(?<!\r)\n/.test(get('sets/example.js')), 'preserve CRLF source');
});

test('preserve tabbed existing ELO, then force the entire numeric value', ({put, get, csv, run, values}) => {
  csv('31003,"En Passant",1600,20');
  const source = "cardSet[31003] = {\n\ttitle: 'En Passant',\n\telo: 1534.5, // old rating\n};\n";
  put('sets/example.js', source);
  run('fill-elo.mjs');
  assert.strictEqual(get('sets/example.js'), source);
  run('fill-elo.mjs', ['--force']);
  assert.strictEqual(values('sets/example.js').cardSet[31003].elo, 1600);
  assert.strictEqual((get('sets/example.js').match(/elo:/g) || []).length, 1);
  assert(get('sets/example.js').includes('// old rating'));
});

test('name fallback handles reprints, CSV escaped quotes and typography', ({put, csv, run, values}) => {
  csv('99001,"Rielle ""Kit"" Peddler: Transhuman",1800,20\n99002,"Rielle ""Kit"" Peddler: Transhuman",1700,40\n99003,"Daily Casts",1900,30\n99004,"Daily Casts",1800,30');
  put('sets/example.js', 'cardSet[3028] = {\n  title: "Rielle “Kit” Peddler: Transhuman",\n};\ncardSet[3053] = {\n  title: "daily   casts",\n};\n');
  const report = run('fill-elo.mjs');
  assert(report.includes('2 matched by name'));
  const cards = values('sets/example.js').cardSet;
  assert.strictEqual(cards[3028].elo, 1700, 'prefer most votes for a missing printing');
  assert.strictEqual(cards[3053].elo, 1900, 'stable ID tie-break for equal votes');
});

test('exact printing ID wins over a more-voted name match', ({put, csv, run, values}) => {
  csv('03053,"Daily Casts",1500,1\n99003,"Daily Casts",1900,100');
  put('sets/example.js', 'cardSet[3053] = {\n  title: "Daily Casts",\n};\n');
  run('fill-elo.mjs');
  assert.strictEqual(values('sets/example.js').cardSet[3053].elo, 1500);
});

test('single-quoted escaped title, quoted commas, and LF dry-run/idempotence', ({put, get, csv, run, values}) => {
  csv('99001,"Director\'s, Favorite",1234,1');
  const source = "cardSet[1] = {\n\ttitle: 'Director\\'s, Favorite',\n};\n";
  put('sets/example.js', source);
  run('fill-elo.mjs', ['--dry']);
  assert.strictEqual(get('sets/example.js'), source);
  run('fill-elo.mjs');
  assert.strictEqual(values('sets/example.js').cardSet[1].elo, 1234);
  const applied = get('sets/example.js');
  run('fill-elo.mjs');
  assert.strictEqual(get('sets/example.js'), applied);
});

test('malformed or empty CSV fails before source changes', ({put, get, run}) => {
  const source = 'cardSet[1] = {\n  title: "Example",\n};\n';
  put('sets/example.js', source);
  for (const data of ['id,name,elo,votes\n', 'id,name,elo,votes\nmalformed\n']) {
    put('data/elo.csv', data);
    run('fill-elo.mjs', [], false);
    assert.strictEqual(get('sets/example.js'), source);
  }
});

test('missing names report CSV absence without changing source', ({put, get, csv, run}) => {
  csv('99001,"Different card",1500,1');
  const source = 'cardSet[1] = {\n  title: "Missing card",\n};\n';
  put('sets/example.js', source);
  assert(run('fill-elo.mjs').includes('1 not in CSV'));
  assert.strictEqual(get('sets/example.js'), source);
});

const row = (id, name, elo, votes) => `<tr><td><a href="https://netrunnerdb.com/en/card/${id}">${name}</a></td><td>${elo}</td><td>${votes}</td></tr>`;
test('HTTP failure and empty ranking preserve the previous cache', ({put, get, run, mockFetch}) => {
  const original = 'synthetic previous cache\n';
  for (const [status, body] of [[503, row('01001', 'Example', 1500, 1)], [200, '<html>Unavailable</html>']]) {
    put('data/elo.csv', original);
    mockFetch(status, body);
    run('scrape-elo.mjs', [], false);
    assert.strictEqual(get('data/elo.csv'), original);
  }
});

test('successful scrape decodes names, quotes CSV and prefers more votes', ({get, run, mockFetch}) => {
  mockFetch(200, row('01001', '&lt;Noise&gt; &amp; &quot;Kit&quot; &#x1f600;', 1400, 1) +
    row('01001', '&lt;Noise&gt; &amp; &quot;Kit&quot; &#x1f600;', 1500, 20));
  run('scrape-elo.mjs');
  assert.strictEqual(get('data/elo.csv'), 'id,name,elo,votes\n01001,"<Noise> & ""Kit"" 😀",1500,20\n');
});

test('scraped whitespace stays on one CSV line and supports name fallback', ({put, get, run, values, mockFetch}) => {
  mockFetch(200, row('99001', '\r\n Daily\n\t Casts&#10;&#13;&#9;&nbsp; &amp;  &quot;Friends&quot; \n', 1500, 20));
  put('sets/example.js', 'cardSet[1] = {\n  title: \'Daily Casts & "Friends"\',\n};\n');
  run('scrape-elo.mjs');
  assert.strictEqual(get('data/elo.csv'), 'id,name,elo,votes\n99001,"Daily Casts & ""Friends""",1500,20\n');
  assert(run('fill-elo.mjs').includes('1 matched by name'));
  assert.strictEqual(values('sets/example.js').cardSet[1].elo, 1500);
});

if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else if (process.env.VERBOSE) console.log(`ELO scripts: ${cases} cases passed.`);

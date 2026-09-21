// Run with: node tests/run-success-sound.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const phaseSource = fs.readFileSync(path.join(root, 'phase.js'), 'utf8');
const utilitySource = fs.readFileSync(path.join(root, 'utility.js'), 'utf8');

function extractFunction(source, name) {
  const start = source.indexOf('function ' + name + '(');
  assert(start >= 0, 'Could not find ' + name);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let i = bodyStart; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('Could not extract ' + name);
}

const resolveAccessSource = extractFunction(utilitySource, 'ResolveAccess');
assert.strictEqual(
  resolveAccessSource.includes("PlaySound('runSuccessful')"),
  false,
  'finishing an individual card access must not replay the successful-run sound'
);

const successfulRunStart = phaseSource.indexOf('if (currentPhase.identifier == "Run 5.1")');
const successfulRunEnd = phaseSource.indexOf('//build trigger list', successfulRunStart);
assert(successfulRunStart >= 0 && successfulRunEnd > successfulRunStart, 'Could not find the successful-run phase');
const successfulRunSource = phaseSource.slice(successfulRunStart, successfulRunEnd);
assert.strictEqual(
  (successfulRunSource.match(/PlaySound\('runSuccessful'\)/g) || []).length,
  1,
  'the successful-run phase must play its sound exactly once'
);
assert(
  successfulRunSource.indexOf("PlaySound('runSuccessful')") > successfulRunSource.lastIndexOf('if (modifySuccess == 0)'),
  'the sound must only play after the run passes the final success-prevention check'
);
assert.strictEqual(
  (
    successfulRunSource.match(
      /corp\.AI\._recordSuccessfulRunForProtection\(attackedServer\)/g
    ) || []
  ).length,
  1,
  'a declared successful run must report recent pressure to the Corp AI exactly once'
);
assert(
  successfulRunSource.indexOf('corp.AI._recordSuccessfulRunForProtection(attackedServer)') > successfulRunSource.lastIndexOf('if (modifySuccess == 0)'),
  'prevented successful runs must not create Corp protection pressure'
);

console.log('5 run-success regression cases passed.');

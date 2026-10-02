// F6 reproduction promoted unchanged from tests/pending/.
'use strict';
const {spawnSync} = require('child_process');
const path = require('path');

const testsDir = path.basename(__dirname) === 'pending'
  ? path.resolve(__dirname, '..')
  : __dirname;
const testFile = path.join(testsDir, 'corp-server-security.test.js');
const result = spawnSync(process.execPath, [testFile], {
  encoding: 'utf8',
  env: {...process.env, F6_PENDING: '1'},
});
process.stdout.write(result.stdout || '');
process.stderr.write(result.stderr || '');
if (result.error) throw result.error;
process.exitCode = result.status;

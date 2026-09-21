#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');

const testsDir = __dirname;
const files = fs.readdirSync(testsDir)
  .filter(file => file.endsWith('.test.js'))
  .sort();

for (const file of files) {
  const result = spawnSync(process.execPath, [path.join(testsDir, file)], {
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log(files.length + ' test files passed.');

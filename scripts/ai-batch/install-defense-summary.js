#!/usr/bin/env node
'use strict';
// Reads completed reports only: no engine, simulations or policy changes.
const fs = require('fs'), crypto = require('crypto');
const {analyzeReports} = require('./install-defense-analysis');
const files = process.argv.slice(2);
if (!files.length) throw Error('usage: node scripts/ai-batch/install-defense-summary.js <report.json> [...]');
const sources = files.map(file => ({file, bytes: fs.readFileSync(file)}));
const result = analyzeReports(sources.map(s => JSON.parse(s.bytes)));
result.sources = sources.map(({file, bytes}) => ({file, sha256: crypto.createHash('sha256').update(bytes).digest('hex')}));
console.log(JSON.stringify(result, null, 2));

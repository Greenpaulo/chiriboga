#!/usr/bin/env node
'use strict';

const path = require('path');
const {spawnSync} = require('child_process');

const usage = 'Usage: node scripts/post-merge.js [--move <ticket.md>]';

function parseArgs(args) {
  if (!args.length) return null;
  if (args.length === 2 && args[0] === '--move' && args[1] && !args[1].startsWith('--')) {
    return args[1];
  }
  throw new Error(usage);
}

function postMerge(args, run = command => {
  const result = spawnSync(process.execPath, command, {
    cwd: path.resolve(__dirname, '..'), stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Post-merge stopped: ${command.join(' ')} failed${result.signal ? ` (${result.signal})` : ''}.`);
  }
}) {
  const ticket = parseArgs(args);
  for (const format of ['beginner', 'startup']) {
    run(['scripts/refresh-ai-baseline.js', '--format', format]);
  }
  if (ticket) run(['scripts/ticket.js', 'move', ticket, 'done']);
}

if (require.main === module) {
  try {
    postMerge(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {postMerge};

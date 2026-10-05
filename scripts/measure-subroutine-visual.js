#!/usr/bin/env node
// scripts/measure-subroutine-visual.js — entry point for the subroutine
// overlay (`visual: { y, h }`) measurement workflow.
//
// Usage (from repo root):
//   node scripts/measure-subroutine-visual.js [CODE...] [--preset modern|ffg]
//
// Forwards to scripts/subvis/audit.js, which holds the implementation.
// See scripts/subvis/README.md for the full workflow and known traps.
const { spawnSync } = require('child_process');
const path = require('path');
const r = spawnSync(
  process.execPath,
  [path.join(__dirname, 'subvis', 'audit.js'), ...process.argv.slice(2)],
  { stdio: 'inherit' }
);
process.exit(r.status === null || r.status === undefined ? 1 : r.status);

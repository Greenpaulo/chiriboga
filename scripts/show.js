#!/usr/bin/env node
'use strict';
// Print exactly one card definition or one function, instead of reading broad
// line ranges of the large set and engine files (which fills agent context).
//
//   node scripts/show.js card <id>       the cardSet[<id>] block from sets/*.js
//   node scripts/show.js fn <name>       function <name>(...) or method <name>(...)
//                                        from the root engine/AI files
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const ENGINE_FILES = ['mechanics.js', 'utility.js', 'phase.js', 'checks.js', 'command.js', 'init.js',
  'decks.js', 'config.js', 'runcalculator.js', 'ai_corp.js', 'ai_runner.js', 'sounds.js'];

function blockFrom(lines, start, mode = 'script') {
  let opened = false;
  for (let i = start; i < lines.length; i++) {
    if (lines[i].includes('{')) opened = true;
    if (!opened || !lines[i].includes('}')) continue;
    const candidate = lines.slice(start, i + 1).join('\n');
    const source = mode === 'method' ? `class ShowBlock {\n${candidate}\n}` : candidate;
    try {
      new vm.Script(source);
      return lines.slice(start, i + 1);
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }
  }
  return lines.slice(start);
}

function print(file, lines, start, mode) {
  const block = blockFrom(lines, start, mode);
  console.log('// ' + file + ':' + (start + 1) + '-' + (start + block.length));
  console.log(block.join('\n'));
}

function showCard(id) {
  const pattern = new RegExp('^(?:cardSet|coreSet)\\[' + id + '\\]\\s*=');
  for (const file of fs.readdirSync(path.join(root, 'sets')).filter(f => f.endsWith('.js')).sort()) {
    const lines = fs.readFileSync(path.join(root, 'sets', file), 'utf8').split('\n');
    const start = lines.findIndex(line => pattern.test(line));
    if (start >= 0) {
      let comment = start;
      while (comment > 0 && /^\/\//.test(lines[comment - 1])) comment--;
      if (comment < start) console.log(lines.slice(comment, start).join('\n'));
      return print('sets/' + file, lines, start);
    }
  }
  throw new Error('No cardSet[' + id + '] in sets/*.js');
}

function showFunction(name) {
  const patterns = [
    {pattern: new RegExp('^\\s*(async\\s+)?function\\s+' + name + '\\s*\\('), mode: 'script'},
    {pattern: new RegExp('^\\s+(async\\s+)?' + name + '\\s*\\([^)]*\\)\\s*\\{'), mode: 'method'},
    {pattern: new RegExp('^\\s*(var|let|const)\\s+' + name + '\\s*=\\s*function'), mode: 'script'},
  ];
  const found = [];
  for (const file of ENGINE_FILES.filter(f => fs.existsSync(path.join(root, f)))) {
    const lines = fs.readFileSync(path.join(root, file), 'utf8').split('\n');
    lines.forEach((line, i) => {
      const match = patterns.find(({pattern}) => pattern.test(line));
      if (match) found.push([file, lines, i, match.mode]);
    });
  }
  if (!found.length) throw new Error('No function or method named ' + name + ' in ' + ENGINE_FILES.join(', '));
  found.forEach(([file, lines, i, mode]) => print(file, lines, i, mode));
}

if (require.main === module) {
  const [kind, name] = process.argv.slice(2);
  try {
    if (kind === 'card' && /^\d+$/.test(name || '')) showCard(name);
    else if (kind === 'fn' && /^[\w$]+$/.test(name || '')) showFunction(name);
    else { console.log('usage: node scripts/show.js card <id> | fn <name>'); process.exitCode = 1; }
  } catch (error) {
    console.log(error.message);
    process.exitCode = 1;
  }
}

module.exports = {blockFrom};

// Run with: node tests/corp-ai-hypothetical-mutation.test.js
// Enforces roadmap item F2 (documentation/backlog/corp_ai_finding_10_guarded_hypothetical.md):
// every planning probe that temporarily changes game state does so inside the
// closures passed to CorpAI._withHypothetical() or the shared wrappers in
// ai_runner.js (AIWithHypothetical, AIWithRunContext, AIWithIceEncounter),
// which restore in finally and keep the one hypothetical depth count.
//
// Scanned: ai_corp.js and runcalculator.js in full, and the functions in
// sets/*.js whose name starts with AI or _. A state change outside a guarded
// call is keyed "<file>: <method>" (core files) or "<file>: <title> <function>"
// (sets) and must be listed below:
// - RUNNER_DEBT: Runner-side paired hooks that ai_runner.js calls without
//   finally (Runner principle debt, out of Corp scope);
// - REAL_EFFECTS: helpers that make a real game change, not a probe.
// An unlisted key fails the test. A listed key that no longer occurs is
// reported in the summary line so the entry can be deleted.
// Comments and strings are ignored. Set VERBOSE=1 to list every match.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const verbose = !!process.env.VERBOSE;

const RUNNER_DEBT = [
  ['sets/systemgateway.js: Botulus AIPrepareHypotheticalForRC', 1],
  ['sets/systemgateway.js: Botulus AIRestoreHypotheticalFromRC', 1],
  ['sets/systemgateway.js: Tread Lightly AIRunEventModify', 1],
  ['sets/systemgateway.js: Tread Lightly AIRunEventRestore', 1],
  ['sets/vantagepoint.js: Aircheck AIRunEventModify', 1],
  ['sets/vantagepoint.js: Aircheck AIRunEventRestore', 1],
];
const REAL_EFFECTS = [
  ['sets/elevation.js: Mitra Aman _performSwap', 2], // swaps ICE when its ability resolves
  ['sets/vantagepoint.js: Read-Write Share _hostFromGripResolve', 1], // hosts a card from the grip
  ['sets/vantagepoint.js: ezaM _swapWith', 1], // swaps ICE positions as the ability resolves
];
const ALLOWLIST = RUNNER_DEBT.concat(REAL_EFFECTS);
const listed = ALLOWLIST.map(([key]) => key);
assert.strictEqual(new Set(listed).size, listed.length, 'duplicate allowlist entries');
const expectedAllowlistMatchCounts = new Map(ALLOWLIST);

const MUTATION = new RegExp([
  String.raw`(?:\bcreditPool|\bclickTracker|\.rezzed|\.tags|\.virus|\.notInstalled|\battackedServer|\bapproachIce|\bencountering|\bcurrentPhase\.identifier)\s*(?:[-+*/]?=(?!=)|\+\+|--)`,
  String.raw`\.ice\.(?:push|splice|pop)\(`,
  String.raw`\bremoteServers\.(?:push|splice|pop)\(`,
  String.raw`\bAIIceEncounterModifyState\(`,
].join('|'), 'g');
const HYPOTHETICAL_GUARD = /\b(?:_withHypothetical|AIWithHypothetical)\s*\(/g;

// Blank comments, strings and regular-expression literals (newlines kept), so
// brackets and patterns are matched in code only.
function mask(source) {
  const out = source.split('');
  const blank = (from, to) => { for (let k = from; k < to; k++) if (out[k] !== '\n') out[k] = ' '; };
  let prev = '';
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    const n = source[i + 1];
    if (c === '/' && n === '/') {
      let j = i; while (j < source.length && source[j] !== '\n') j++;
      blank(i, j); i = j - 1; continue;
    }
    if (c === '/' && n === '*') {
      const j = source.indexOf('*/', i + 2) + 2;
      blank(i, j); i = j - 1; continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < source.length && source[j] !== c) j += source[j] === '\\' ? 2 : 1;
      blank(i + 1, j); i = j; prev = c; continue;
    }
    if (c === '/' && (prev === '' || '(,=:[!&|?{};+-*%<>~^'.includes(prev))) {
      let j = i + 1;
      let inClass = false;
      while (j < source.length && source[j] !== '\n' && (inClass || source[j] !== '/')) {
        if (source[j] === '\\') j++;
        else if (source[j] === '[') inClass = true;
        else if (source[j] === ']') inClass = false;
        j++;
      }
      blank(i + 1, j); i = j; prev = '/'; continue;
    }
    if (!/\s/.test(c)) prev = c;
  }
  return out.join('');
}

function argumentRanges(code, open) {
  const ranges = [];
  let start = open + 1;
  let parens = 1;
  let braces = 0;
  let brackets = 0;
  for (let i = start; i < code.length; i++) {
    if (code[i] === '(') parens++;
    else if (code[i] === ')') {
      parens--;
      if (parens === 0) {
        ranges.push([start, i]);
        break;
      }
    } else if (code[i] === '{') braces++;
    else if (code[i] === '}') braces--;
    else if (code[i] === '[') brackets++;
    else if (code[i] === ']') brackets--;
    else if (code[i] === ',' && parens === 1 && braces === 0 && brackets === 0) {
      ranges.push([start, i]);
      start = i + 1;
    }
  }
  return ranges;
}

function matchingDelimiter(code, open, opening, closing) {
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if (code[i] === opening) depth++;
    else if (code[i] === closing && --depth === 0) return i;
  }
  return code.length;
}

function trimRange(code, range) {
  let [start, end] = range;
  while (start < end && /\s/.test(code[start])) start++;
  while (end > start && /\s/.test(code[end - 1])) end--;
  return [start, end];
}

function callbackBodyRange(code, argument) {
  let [start, end] = trimRange(code, argument);
  while (code[start] === '(' && matchingDelimiter(code, start, '(', ')') === end - 1)
    [start, end] = trimRange(code, [start + 1, end - 1]);

  // A parenthesized comma expression evaluates to its final operand. Earlier
  // operands run before the wrapper starts and must remain visible to the scan.
  let parens = 0;
  let braces = 0;
  let brackets = 0;
  for (let i = start; i < end; i++) {
    if (code[i] === '(') parens++;
    else if (code[i] === ')') parens--;
    else if (code[i] === '{') braces++;
    else if (code[i] === '}') braces--;
    else if (code[i] === '[') brackets++;
    else if (code[i] === ']') brackets--;
    else if (code[i] === ',' && parens === 0 && braces === 0 && brackets === 0)
      [start] = trimRange(code, [i + 1, end]);
  }

  const expression = code.slice(start, end);
  if (/^(?:async\s+)?function\b/.test(expression)) {
    let parameterDepth = 0;
    for (let i = start; i < end; i++) {
      if (code[i] === '(') parameterDepth++;
      else if (code[i] === ')') parameterDepth--;
      else if (code[i] === '{' && parameterDepth === 0)
        return [i + 1, matchingDelimiter(code, i, '{', '}')];
    }
    return null;
  }

  parens = 0;
  braces = 0;
  brackets = 0;
  for (let i = start; i < end - 1; i++) {
    if (code[i] === '(') parens++;
    else if (code[i] === ')') parens--;
    else if (code[i] === '{') braces++;
    else if (code[i] === '}') braces--;
    else if (code[i] === '[') brackets++;
    else if (code[i] === ']') brackets--;
    else if (code[i] === '=' && code[i + 1] === '>' &&
      parens === 0 && braces === 0 && brackets === 0) {
      const parameters = code.slice(start, i).trim();
      if (!/^(?:async\s+)?(?:[A-Za-z_$][\w$]*|\([^]*\))$/.test(parameters)) return null;
      const body = trimRange(code, [i + 2, end]);
      if (code[body[0]] === '{')
        return [body[0] + 1, matchingDelimiter(code, body[0], '{', '}')];
      return body;
    }
  }
  return null;
}

function guardedMutationRanges(code) {
  const guarded = [];
  for (const match of code.matchAll(HYPOTHETICAL_GUARD)) {
    const open = match.index + match[0].length - 1;
    const args = argumentRanges(code, open);
    for (const index of [0, 2]) {
      const body = args[index] && callbackBodyRange(code, args[index]);
      if (body) guarded.push(body);
    }
  }
  return guarded;
}

// Every enclosing named function at each line: method shorthand, "name: function",
// "name: (...) =>" and function declarations, closed by brace depth.
function scopes(code) {
  const lines = code.split('\n');
  const result = [];
  const stack = [];
  let depth = 0;
  const NAMED = [
    /^\s*(?:static\s+|get\s+|set\s+|async\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/,
    /^\s*([A-Za-z_$][\w$]*)\s*:\s*(?:async\s+)?function\b/,
    /^\s*([A-Za-z_$][\w$]*)\s*:\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/,
    /^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/,
  ];
  for (const text of lines) {
    for (const re of NAMED) {
      const m = text.match(re);
      if (m && !/^(if|for|while|switch|catch|return|function)$/.test(m[1])) {
        stack.push({depth, name: m[1]});
        break;
      }
    }
    result.push({names: stack.map(s => s.name)});
    for (const c of text) {
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();
      }
    }
  }
  return result;
}

function cardTitles(source, code) {
  // the title of the card object open at each line (sets only)
  const titles = [];
  const lines = code.split('\n');
  const raw = source.split('\n');
  let current = '';
  let depth = 0;
  for (let i = 0; i < lines.length; i++) {
    if (depth === 0 && /^\s*[\w$.]+\[[^\]]*\]\s*=\s*\{/.test(lines[i])) current = '';
    const m = depth === 1 && raw[i].match(/^\s*title:\s*["'](.+?)["']/);
    if (m) current = m[1];
    titles.push(current);
    for (const c of lines[i]) depth += c === '{' ? 1 : c === '}' ? -1 : 0;
  }
  return titles;
}

function scanSource(file, isSet, source) {
  const code = mask(source);
  const guarded = guardedMutationRanges(code);
  const lineStarts = [0];
  for (let i = 0; i < code.length; i++) if (code[i] === '\n') lineStarts.push(i + 1);
  const lineOf = index => {
    let lo = 0, hi = lineStarts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineStarts[mid] <= index) lo = mid; else hi = mid - 1; }
    return lo;
  };
  const scope = scopes(code);
  const titles = isSet ? cardTitles(source, code) : null;
  const found = [];
  for (const m of code.matchAll(MUTATION)) {
    if (guarded.some(([from, to]) => m.index > from && m.index < to)) continue;
    const line = lineOf(m.index);
    const names = scope[line].names;
    let key;
    if (isSet) {
      const hook = names.find(name => /^(AI|_)/.test(name));
      if (!hook) continue;
      key = file + ': ' + (titles[line] ? titles[line] + ' ' : '') + hook;
    } else {
      key = file + ': ' + (names[0] || '(top level)');
    }
    found.push({key, line: line + 1, text: m[0]});
  }
  return found;
}

function scan(file, isSet) {
  const source = fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
  return scanSource(file, isSet, source);
}

const counterexample = scanSource('counterexample.js', false, [
  'function hypotheticalCounterexample() {',
  '  AIWithHypothetical(',
  '    () => { corp.creditPool -= 1; },',
  '    () => { corp.creditPool -= 2; },',
  '    () => { corp.creditPool += 1; },',
  '  );',
  '  AIWithRunContext(server, () => {',
  '    corp.creditPool -= 3;',
  '  });',
  '  AIWithHypothetical((corp.creditPool -= 4, () => {}), () => {}, () => {});',
  '}',
].join('\n'));
assert.deepStrictEqual(counterexample.map(match => match.line), [4, 8, 10],
  'only mutations inside apply and restore callback bodies may be exempted');

function increasedAllowlistMatches(matches, expectedCounts) {
  return [...matches].filter(([key, lines]) =>
    expectedCounts.has(key) && lines.length > expectedCounts.get(key));
}

const extraRealEffect = new Map([[REAL_EFFECTS[0][0], [1, 2, 3]]]);
assert.deepStrictEqual(increasedAllowlistMatches(extraRealEffect, expectedAllowlistMatchCounts)
  .map(([key]) => key), [REAL_EFFECTS[0][0]],
  'an added mutation under an allowlisted function key must fail the ratchet');

const files = [['ai_corp.js', false], ['runcalculator.js', false]].concat(
  fs.readdirSync(path.join(root, 'sets')).filter(f => f.endsWith('.js')).sort().map(f => ['sets/' + f, true]));
const found = new Map();
for (const [file, isSet] of files) {
  for (const match of scan(file, isSet)) {
    if (!found.has(match.key)) found.set(match.key, []);
    found.get(match.key).push(match.line);
    if (verbose) console.log(match.key + ' (' + file + ':' + match.line + ') ' + match.text);
  }
}

const added = [...found.keys()].filter(key => !listed.includes(key));
assert.deepStrictEqual(added, [],
  'Unguarded state changes. Wrap a planning probe in _withHypothetical(), AIWithRunContext() ' +
  'or AIWithIceEncounter() so it is restored in finally and counted as hypothetical:\n  ' +
  added.map(key => key + ' (lines ' + found.get(key).join(',') + ')').join('\n  '));

const increased = increasedAllowlistMatches(found, expectedAllowlistMatchCounts);
assert.deepStrictEqual(increased, [],
  'New mutation matches under allowlisted function keys:\n  ' +
  increased.map(([key, lines]) => key + ' (lines ' + lines.join(',') + ')').join('\n  '));

const gone = listed.filter(key => !found.has(key));
console.log('corp-ai-hypothetical-mutation: ' + found.size + ' listed unguarded mutation sites (' +
  RUNNER_DEBT.length + ' Runner debt, ' + REAL_EFFECTS.length + ' real effects), none new' +
  (gone.length ? '; no longer present, delete: ' + gone.join('; ') : '.'));

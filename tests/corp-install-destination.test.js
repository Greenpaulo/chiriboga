// Run with: node tests/corp-install-destination.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const corp = {
  side: 'corp',
  HQ: {serverName: 'HQ'},
  RnD: {serverName: 'R&D'},
  archives: {serverName: 'Archives'},
  remoteServers: [{serverName: 'Remote 0'}],
};
const runner = {side: 'runner'};
const context = {console: {log() {}, warn() {}, error() {}}, corp, runner};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'utility.js'), 'utf8'), context, {
  filename: 'utility.js',
});
vm.runInContext(fs.readFileSync(path.join(root, 'checks.js'), 'utf8'), context, {
  filename: 'checks.js',
});

context.CheckInstall = () => true;
context.CheckCardType = (card, types) => types.includes(card.cardType);
context.GetTitle = (card) => card.title;

const centralOnly = {
  title: 'Central-only upgrade',
  player: corp,
  cardType: 'upgrade',
  installOnlyIn(server) {
    return server === corp.HQ || server === corp.RnD || server === corp.archives;
  },
};
assert.deepStrictEqual(
  Array.from(context.ChoicesCardInstall(centralOnly), (choice) => choice.server.serverName),
  ['HQ', 'R&D', 'Archives'],
  'central-only Corp cards exclude new and existing remote servers',
);

const unrestricted = {
  title: 'Unrestricted upgrade',
  player: corp,
  cardType: 'upgrade',
};
assert.deepStrictEqual(
  Array.from(context.ChoicesCardInstall(unrestricted), (choice) =>
    choice.server ? choice.server.serverName : 'New remote',
  ),
  ['New remote', 'Remote 0', 'HQ', 'R&D', 'Archives'],
  'ordinary Corp install choices are unchanged',
);

process.stdout.write('Corp install destination regression checks passed.\n');

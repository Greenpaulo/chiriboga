// Run with: node tests/agent-skills.test.js
// Codex loads repo skills from .agents/skills/<name>/SKILL.md and decides when to
// use each one from its frontmatter, so every skill needs a valid name and
// description.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const skillsDir = path.resolve(__dirname, '..', '.agents', 'skills');
const skills = fs.readdirSync(skillsDir, {withFileTypes: true})
  .filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
assert(skills.length > 0, 'No skills found in .agents/skills/');

for (const name of skills) {
  const file = path.join(skillsDir, name, 'SKILL.md');
  assert(fs.existsSync(file), '.agents/skills/' + name + ' has no SKILL.md');
  const frontmatter = fs.readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---\n/);
  assert(frontmatter, name + '/SKILL.md must start with --- frontmatter ---');
  const field = key => (frontmatter[1].match(new RegExp('^' + key + ':\\s*(.+)$', 'm')) || [])[1];
  assert.strictEqual(field('name'), name, name + '/SKILL.md frontmatter name must match its folder');
  assert(field('description'), name + '/SKILL.md needs a description: agents use it to decide when to load the skill');
}

console.log('Agent skills: ' + skills.length + ' skills with valid frontmatter.');

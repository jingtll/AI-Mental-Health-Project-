// Validate DSH skill bundles after import: frontmatter must parse as YAML,
// `name` must be kebab-case, `description` must be a non-empty string.
// Usage: node validate-skills.mjs <skillsRoot>
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire('C:/Users/17818/.dsh/profiles/web/node_modules/');
const yaml = require('js-yaml');

const root = process.argv[2];
if (!root) {
  console.error('usage: node validate-skills.mjs <skillsRoot>');
  process.exit(2);
}

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function frontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  return m ? m[1] : null;
}

const results = [];
for (const entry of readdirSync(root).sort()) {
  const dir = join(root, entry);
  if (!statSync(dir).isDirectory()) continue;
  const file = join(dir, 'SKILL.md');
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    results.push({ dir: entry, ok: false, reason: 'no SKILL.md' });
    continue;
  }
  const fm = frontmatter(text);
  if (fm === null) {
    results.push({ dir: entry, ok: false, reason: 'no frontmatter' });
    continue;
  }
  let data;
  try {
    data = yaml.load(fm);
  } catch (error) {
    results.push({ dir: entry, ok: false, reason: `yaml: ${error.message}` });
    continue;
  }
  if (data === null || typeof data !== 'object') {
    results.push({ dir: entry, ok: false, reason: 'frontmatter is not a mapping' });
    continue;
  }
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const description = typeof data.description === 'string' ? data.description.trim() : '';
  const problems = [];
  if (!name) problems.push('name missing');
  else if (!KEBAB.test(name)) problems.push(`name not kebab-case: ${JSON.stringify(name)}`);
  if (!description) problems.push('description missing or empty');
  // These are author-intended, not defects: DSH keeps such a skill out of the
  // model catalog but still exposes it to the human through a `/name` gesture.
  const hidden = [];
  if (data['disable-model-invocation'] === true) hidden.push('disable-model-invocation (model-hidden, /name only)');
  if (data['user-invocable'] === false) hidden.push('user-invocable: false (model-only)');
  results.push({ dir: entry, name, descLen: description.length, ok: problems.length === 0, reason: problems.join('; ') || undefined, hidden: hidden.join('; ') || undefined });
}

const bad = results.filter((r) => !r.ok);
const hidden = results.filter((r) => r.hidden);
const names = results.map((r) => r.name).filter(Boolean);
const dupes = names.filter((n, i) => names.indexOf(n) !== i);

console.log(`directories scanned : ${results.length}`);
console.log(`valid DSH skills    : ${results.length - bad.length}`);
console.log(`invalid             : ${bad.length}`);
console.log(`duplicate names     : ${dupes.length ? [...new Set(dupes)].join(', ') : 'none'}`);
for (const r of bad) console.log(`  INVALID ${r.dir} -> ${r.reason}`);
console.log(`author-hidden (still usable via /name in a user message): ${hidden.length}`);
for (const r of hidden) console.log(`  ${r.name} -> ${r.hidden}`);
const renamed = results.filter((r) => r.name && r.name !== r.dir);
console.log(`dir != frontmatter name (fine, catalog uses frontmatter): ${renamed.length}`);
for (const r of renamed) console.log(`  ${r.dir} -> ${r.name}`);

// Parse the profile patch layer with js-yaml and assert the 10 MCP rows are
// structurally what dsh-mcp-client expects.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire('C:/Users/17818/.dsh/profiles/web/node_modules/');
const yaml = require('js-yaml');

const file = 'C:/Users/17818/.dsh/profiles/web/cordis.patch.yml';
const doc = yaml.load(readFileSync(file, 'utf8'));
if (!Array.isArray(doc)) throw new Error('top level is not an array of patch entries');

const rows = [];
for (const entry of doc) {
  if (!entry || typeof entry !== 'object' || !Array.isArray(entry.insert)) continue;
  rows.push(...entry.insert);
}

const NAME = '@deepseek-ai/dsh-mcp-client';
const problems = [];
const seen = new Set();
for (const row of rows) {
  if (row.name !== NAME) { problems.push(`${row.id}: unexpected plugin name ${row.name}`); continue; }
  const c = row.config ?? {};
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(c.serverName ?? '')) problems.push(`${row.id}: bad serverName ${JSON.stringify(c.serverName)}`);
  if (seen.has(c.serverName)) problems.push(`${row.id}: duplicate serverName ${c.serverName}`);
  seen.add(c.serverName);
  if (c.transport === 'stdio') {
    if (typeof c.command !== 'string' || !c.command) problems.push(`${row.id}: stdio without command`);
    if (!Array.isArray(c.args)) problems.push(`${row.id}: stdio without args array`);
    for (const [k, v] of Object.entries(c.env ?? {})) {
      if (typeof v !== 'string') problems.push(`${row.id}: env.${k} is ${typeof v}, must be a string`);
    }
  } else if (c.transport !== 'streamable-http') {
    problems.push(`${row.id}: bad transport ${JSON.stringify(c.transport)}`);
  }
}

console.log(`patch entries        : ${doc.length}`);
console.log(`inserted plugin rows : ${rows.length}`);
console.log(`MCP server names     : ${[...seen].join(', ')}`);
console.log(`structural problems  : ${problems.length}`);
for (const p of problems) console.log(`  ${p}`);
process.exit(problems.length === 0 ? 0 : 1);

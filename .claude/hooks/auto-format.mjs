#!/usr/bin/env node
// PostToolUse / Write|Edit|MultiEdit — format the just-written file with its language's formatter if
// installed. Finds project-local formatters (node_modules/.bin) as well as global ones.
// Non-blocking; exit 0 always. Cross-platform (Node; shell:true resolves Windows .cmd shims).
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { delimiter } from 'node:path';

let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch {}
const filePath = input?.tool_input?.file_path ?? '';
if (!filePath || !existsSync(filePath)) process.exit(0);

// Build a PATH that includes every node_modules/.bin from the file's dir up to the root,
// so project-local formatters (the common case) are found — not just global installs.
const fileDir = path.dirname(path.resolve(filePath));
const binDirs = [];
let dir = fileDir;
for (;;) {
  binDirs.push(path.join(dir, 'node_modules', '.bin'));
  const parent = path.dirname(dir);
  if (parent === dir) break;
  dir = parent;
}
const env = { ...process.env, PATH: [...binDirs, process.env.PATH].join(delimiter) };

// [regex on filename, formatter, args-before-file]
const table = [
  [/\.(ts|tsx|js|jsx|json|css|md)$/i, 'prettier', ['--write']],
  [/\.py$/i, 'ruff', ['format']],
  [/\.py$/i, 'black', ['-q']],
  [/\.go$/i, 'gofmt', ['-w']],
  [/\.rs$/i, 'rustfmt', []],
];

for (const [re, cmd, args] of table) {
  if (!re.test(filePath)) continue;
  const r = spawnSync(cmd, [...args, filePath], { stdio: 'ignore', shell: true, env, cwd: fileDir });
  if (r.status === 0) break; // formatted; don't try the fallback formatter
}
process.exit(0);

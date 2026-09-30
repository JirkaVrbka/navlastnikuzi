#!/usr/bin/env node
// PreToolUse / Write|Edit|MultiEdit — block writes to sensitive files or outside the project.
// Cross-platform (Node). Exit 2 = block.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch {}
const filePath = input?.tool_input?.file_path ?? '';
if (!filePath) process.exit(0);

const proj = process.env.CLAUDE_PROJECT_DIR || input?.cwd || process.cwd();

function block(what, instead) {
  process.stderr.write(`BLOCKED: ${what}\nInstead: ${instead}\n`);
  process.exit(2);
}

// Normalize Windows backslashes so basename works regardless of the running OS.
const base = filePath.replace(/\\/g, '/').split('/').pop();
const secret = /^(\.env(\..+)?|.*\.(key|pem|p12|pfx)|secrets\.(json|ya?ml)|credentials\.json)$/i;
if (secret.test(base) && base.toLowerCase() !== '.env.example') {
  block(`writing to a secret file (${base}).`,
    'put real secrets in an untracked .env (git-ignored); commit only .env.example with placeholders.');
}

// Ensure the write stays inside the project (allow the user's ~/.claude config dir).
const abs = path.resolve(proj, filePath);
const claudeDir = path.join(homedir(), '.claude');
const inside = (p, root) => {
  const rel = path.relative(root, p);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
};
if (!inside(abs, path.resolve(proj)) && !inside(abs, claudeDir)) {
  block(`writing outside the project directory (${abs}).`, `keep edits within ${proj}.`);
}
process.exit(0);

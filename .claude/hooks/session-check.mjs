#!/usr/bin/env node
// SessionStart — verify the hook set + CLAUDE.md are present. Non-blocking; warns only.
// Cross-platform (Node). Invoked via `node`, so no executable bit is required.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch {}
const proj = process.env.CLAUDE_PROJECT_DIR || input?.cwd || process.cwd();
const hooksDir = path.join(proj, '.claude', 'hooks');
const missing = [];

if (!existsSync(path.join(proj, 'CLAUDE.md'))) missing.push('CLAUDE.md is missing');
if (!existsSync(hooksDir)) {
  missing.push('.claude/hooks/ directory is missing');
} else {
  const hooks = readdirSync(hooksDir).filter((f) => f.endsWith('.mjs'));
  if (hooks.length === 0) missing.push('no .mjs hooks found in .claude/hooks/');
}

if (missing.length) {
  process.stderr.write('⚠ project-setup guards need attention:\n' + missing.map((m) => `  - ${m}`).join('\n') + '\n');
}

// New contributor with no personal technical level yet → nudge them to pick one.
// (Only relevant when this project uses the technical-level feature, i.e. the command exists.)
const hasFeature = existsSync(path.join(proj, '.claude', 'commands', 'project-architect-tech-level.md'));
const hasLevel = existsSync(path.join(proj, '.claude', 'tech-level.local.md'));
if (hasFeature && !hasLevel) {
  process.stderr.write(
    'ℹ No personal technical level set for this project yet. ' +
    'Run /project-architect-tech-level to pick how technical I should be and when I ask you to decide.\n'
  );
}
process.exit(0);

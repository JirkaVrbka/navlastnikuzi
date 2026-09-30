#!/usr/bin/env node
// PreToolUse / Bash — block dangerous commands. Cross-platform (Node; no jq).
// Exit 2 = block (stderr shown to Claude). Exit 0 = allow.
import { readFileSync } from 'node:fs';

let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch {}
const cmd = input?.tool_input?.command ?? '';
if (!cmd) process.exit(0);

function block(what, instead) {
  process.stderr.write(`BLOCKED: ${what}\nInstead: ${instead}\n`);
  process.exit(2);
}

const rules = [
  [/\brm\s+-[a-z]*r[a-z]*f|\brm\s+-[a-z]*f[a-z]*r/i,
    'recursive force-delete (rm -rf) is not allowed.',
    "preview with 'git clean -n', or remove specific files explicitly."],
  [/git\s+push\s+.*(--force\b|-f\b)(?!-)/i,
    'git force-push can destroy remote history.',
    "use 'git push --force-with-lease', or push a new commit."],
  [/git\s+reset\s+--hard/i,
    'git reset --hard discards uncommitted work irreversibly.',
    "use 'git stash' to save work, or 'git reset --soft' to keep changes staged."],
  [/git\s+clean\s+-[a-z]*f/i,
    'git clean -f permanently deletes untracked files.',
    "preview first with 'git clean -n'."],
  [/\bdel\s+\/[sq]|\bRemove-Item\b.*-Recurse.*-Force|\brmdir\s+\/s/i,
    'recursive force-delete (del /s, rmdir /s, Remove-Item -Recurse -Force) is not allowed.',
    'remove specific files explicitly, or preview what would be deleted first.'],
];

for (const [re, what, instead] of rules) {
  if (re.test(cmd)) block(what, instead);
}
process.exit(0);

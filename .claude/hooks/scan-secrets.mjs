#!/usr/bin/env node
// PostToolUse / Write|Edit|MultiEdit — warn (non-blocking) if the just-written file looks like it
// contains a hardcoded secret. Exit 0 always. Cross-platform (Node).
import { readFileSync, existsSync } from 'node:fs';

let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch {}
const filePath = input?.tool_input?.file_path ?? '';
if (!filePath || !existsSync(filePath)) process.exit(0);
if (/\.(png|jpe?g|gif|pdf|zip|lock)$|-lock\.json$/i.test(filePath)) process.exit(0);

let text = '';
try { text = readFileSync(filePath, 'utf8'); } catch { process.exit(0); }

const checks = [
  [/sk-[A-Za-z0-9]{20,}/, 'possible OpenAI-style key (sk-…)'],
  [/AKIA[0-9A-Z]{16}/, 'possible AWS access key (AKIA…)'],
  [/gh[pousr]_[A-Za-z0-9]{30,}/, 'possible GitHub token (ghp_/gho_…)'],
  [/glpat-[A-Za-z0-9_-]{20,}/, 'possible GitLab token (glpat-…)'],
  [/(API_KEY|SECRET|PASSWORD|PRIVATE_KEY|ACCESS_TOKEN|AUTH_TOKEN)\s*[:=]\s*["'][^"']{8,}/, 'hardcoded credential assignment'],
  [/BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/, 'PEM private key block'],
];

const hits = checks.filter(([re]) => re.test(text)).map(([, m]) => `  - ${m}`);
if (hits.length) {
  process.stderr.write(
    `⚠ scan-secrets: potential secret(s) in ${filePath}:\n${hits.join('\n')}\n` +
    '  Move secrets to an env var / .env (git-ignored) and reference them at runtime.\n'
  );
}
process.exit(0);

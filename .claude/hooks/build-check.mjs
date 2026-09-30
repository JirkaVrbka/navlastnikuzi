#!/usr/bin/env node
// Stack-auto-detecting build+test gate. Call standalone or from a pre-commit step.
// Exit 0 = pass, exit 2 = build/tests failed. Set BUILD_CHECK_TESTS=0 to skip tests.
// Cross-platform (Node; shell:true so Windows resolves .cmd shims).
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch {}
const proj = process.env.CLAUDE_PROJECT_DIR || input?.cwd || process.cwd();
const runTests = process.env.BUILD_CHECK_TESTS !== '0';
const has = (f) => existsSync(path.join(proj, f));

function run(cmd, label) {
  const r = spawnSync(cmd, { cwd: proj, stdio: 'inherit', shell: true });
  if (r.status !== 0) {
    process.stderr.write(`BLOCKED: ${label} failed.\nFix the failure, then retry.\n`);
    process.exit(2);
  }
}

if (has('package.json')) {
  const pkg = JSON.parse(readFileSync(path.join(proj, 'package.json'), 'utf8'));
  if (pkg.scripts?.build) run('npm run build', 'npm build');
  if (runTests && pkg.scripts?.test) run('npm test', 'npm test');
} else if (has('pyproject.toml') || has('setup.cfg')) {
  run('ruff check .', 'ruff lint');
  if (runTests) run('pytest -q', 'pytest');
} else if (has('go.mod')) {
  run('go build ./...', 'go build');
  if (runTests) run('go test ./...', 'go test');
} else if (has('Cargo.toml')) {
  run('cargo build', 'cargo build');
  if (runTests) run('cargo test', 'cargo test');
}
process.exit(0);

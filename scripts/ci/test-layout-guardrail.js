import { readFileSync } from 'node:fs';

const TOP_LEVEL_PR_TEST = /^test\/pr\d+_.*\.test\.ts$/;

function normalizePath(path) {
  return path.replaceAll('\\', '/');
}

const input = readFileSync(0, 'utf8').trim();
if (!input) {
  process.stdout.write('test layout guardrail: no changed files\n');
  process.exit(0);
}

const violations = [];
for (const rawLine of input.split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line) continue;
  const parts = line.split(/\t+/);
  const status = parts[0] ?? '';
  const kind = status[0];
  let path;
  if (kind === 'A') {
    path = parts[1];
  } else if (kind === 'R' || kind === 'C') {
    path = parts[2];
  } else {
    continue;
  }
  if (!path) continue;
  const normalized = normalizePath(path);
  if (TOP_LEVEL_PR_TEST.test(normalized)) violations.push(normalized);
}

if (violations.length === 0) {
  process.stdout.write('test layout guardrail: no new top-level PR tests\n');
  process.exit(0);
}

for (const file of violations) {
  process.stderr.write(`New top-level PR test file added: ${file}\n`);
}
process.stderr.write(
  `test layout guardrail: ${violations.length} new top-level PR test file(s) added\n`,
);
process.exit(1);

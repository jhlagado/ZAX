#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(__filename), '..', '..');
const defaultSource = '/Users/johnhardy/Documents/projects/MON3/src/mon3.z80';
const defaultReference = '/Users/johnhardy/Documents/projects/MON3/MON3-1G_BC25-16.bin';

function usage() {
  return [
    'Usage: node scripts/dev/compare-mon3-binary.mjs [source.z80] [reference.bin]',
    '',
    `Default source: ${defaultSource}`,
    `Default reference: ${defaultReference}`,
  ].join('\n');
}

function byteHex(value) {
  return value === undefined ? 'EOF' : `0x${value.toString(16).padStart(2, '0')}`;
}

function offsetHex(offset) {
  return `0x${offset.toString(16).padStart(4, '0')}`;
}

function diagnosticLocation(diagnostic) {
  if (diagnostic.line === undefined || diagnostic.column === undefined) return diagnostic.file;
  return `${diagnostic.file}:${diagnostic.line}:${diagnostic.column}`;
}

function summarizeDiagnostics(diagnostics, limit = 10) {
  const preview = diagnostics.slice(0, limit).map(
    (diagnostic) =>
      `${diagnosticLocation(diagnostic)}: ${diagnostic.severity} [${diagnostic.id}] ${diagnostic.message}`,
  );
  return [`Diagnostics preview (showing ${preview.length} of ${diagnostics.length}):`, ...preview].join(
    '\n',
  );
}

function findFirstMismatch(actual, reference) {
  const maxLength = Math.max(actual.length, reference.length);
  for (let i = 0; i < maxLength; i++) {
    if (actual[i] !== reference[i]) return i;
  }
  return -1;
}

function summarizeBinaryMismatch(actual, reference) {
  const firstMismatch = findFirstMismatch(actual, reference);
  const lines = [`Binary length: actual=${actual.length} reference=${reference.length}`];
  if (firstMismatch >= 0) {
    lines.push(
      `First mismatch @${offsetHex(firstMismatch)}: actual=${byteHex(
        actual[firstMismatch],
      )} reference=${byteHex(reference[firstMismatch])}`,
    );
  } else {
    lines.push('First mismatch: none');
  }
  return lines.join('\n');
}

async function loadCompiler() {
  const compilePath = resolve(repoRoot, 'dist', 'src', 'compile.js');
  const formatsPath = resolve(repoRoot, 'dist', 'src', 'formats', 'index.js');
  if (!existsSync(compilePath) || !existsSync(formatsPath)) {
    throw new Error('Built compiler not found. Run `npm run build` before this script.');
  }

  const [{ compile }, { defaultFormatWriters }] = await Promise.all([
    import(pathToFileURL(compilePath).href),
    import(pathToFileURL(formatsPath).href),
  ]);
  return { compile, defaultFormatWriters };
}

async function main(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(usage());
    return 0;
  }
  if (argv.length > 2) {
    console.error(usage());
    return 2;
  }

  const source = argv[0] ?? defaultSource;
  const referencePath = argv[1] ?? defaultReference;
  if (!existsSync(source)) throw new Error(`MON3 source not found: ${source}`);
  if (!existsSync(referencePath)) throw new Error(`Reference binary not found: ${referencePath}`);

  const { compile, defaultFormatWriters } = await loadCompiler();
  const res = await compile(
    source,
    { emitBin: true, emitHex: false, emitD8m: false, emitListing: false },
    { formats: defaultFormatWriters },
  );

  if (res.diagnostics.length > 0) {
    console.error(summarizeDiagnostics(res.diagnostics));
  }

  const errors = res.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  if (errors.length > 0) return 1;

  const bin = res.artifacts.find((artifact) => artifact.kind === 'bin');
  if (!bin) throw new Error('Compiler did not emit a bin artifact.');

  const actual = Buffer.from(bin.bytes);
  const reference = readFileSync(referencePath);
  console.log(summarizeBinaryMismatch(actual, reference));
  return actual.length === reference.length && findFirstMismatch(actual, reference) === -1 ? 0 : 1;
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  });

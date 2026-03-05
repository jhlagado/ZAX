import { readFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

async function currentLineCount(file: string): Promise<number> {
  const text = await readFile(file, 'utf8');
  if (text.length === 0) return 0;
  const normalized = text.endsWith('\n') ? text.slice(0, -1) : text;
  if (normalized.length === 0) return 0;
  return normalized.split('\n').length;
}

function normalizeGuardOutput(text: string): string {
  return text.replaceAll('\\', '/');
}

async function collectTsFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await collectTsFiles(full)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

describe('PR472: source file size guard', () => {
  it('reports current oversized files deterministically in warn-only mode', async () => {
    const { stdout } = await execFileAsync('node', ['scripts/check-source-file-sizes.mjs'], {
      cwd: process.cwd(),
    });
    const emitLines = await currentLineCount('src/lowering/emit.ts');
    const parserLines = await currentLineCount('src/frontend/parser.ts');
    const encodeLines = await currentLineCount('src/z80/encode.ts');
    const normalizedStdout = normalizeGuardOutput(stdout);

    expect(normalizedStdout).toContain('source-file-size-guard: soft>750, hard>1000');
    expect(normalizedStdout).toContain(`src/lowering/emit.ts: ${emitLines}`);
    if (parserLines > 750) {
      expect(normalizedStdout).toContain(`src/frontend/parser.ts: ${parserLines}`);
    } else {
      expect(normalizedStdout).not.toContain(`src/frontend/parser.ts: ${parserLines}`);
    }
    if (encodeLines > 750) {
      expect(normalizedStdout).toContain(`src/z80/encode.ts: ${encodeLines}`);
    } else {
      expect(normalizedStdout).not.toContain(`src/z80/encode.ts: ${encodeLines}`);
    }
  });

  it('enforce mode only fails when a hard-cap breach remains', async () => {
    const sourceFiles = await collectTsFiles('src');
    const hasHardCapBreach = (
      await Promise.all(sourceFiles.map((file) => currentLineCount(file)))
    ).some((count) => count > 1000);

    const run = execFileAsync('node', ['scripts/check-source-file-sizes.mjs', '--enforce-hard-cap'], {
      cwd: process.cwd(),
    });

    if (hasHardCapBreach) {
      await expect(run).rejects.toMatchObject({ code: 1 });
    } else {
      await expect(run).resolves.toMatchObject({ stderr: '' });
    }
  });
});

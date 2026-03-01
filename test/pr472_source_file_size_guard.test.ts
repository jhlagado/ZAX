import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

async function currentLineCount(file: string): Promise<number> {
  const text = await readFile(file, 'utf8');
  if (text.length === 0) return 0;
  const normalized = text.endsWith('\n') ? text.slice(0, -1) : text;
  if (normalized.length === 0) return 0;
  return normalized.split('\n').length;
}

describe('PR472: source file size guard', () => {
  it('reports current oversized files deterministically in warn-only mode', async () => {
    const { stdout } = await execFileAsync('node', ['scripts/check-source-file-sizes.mjs'], {
      cwd: process.cwd(),
    });
    const emitLines = await currentLineCount('src/lowering/emit.ts');
    const parserLines = await currentLineCount('src/frontend/parser.ts');
    const encodeLines = await currentLineCount('src/z80/encode.ts');

    expect(stdout).toContain('source-file-size-guard: soft>750, hard>1000');
    expect(stdout).toContain(`- src/lowering/emit.ts: ${emitLines}`);
    expect(stdout).toContain(`- src/frontend/parser.ts: ${parserLines}`);
    expect(stdout).toContain(`- src/z80/encode.ts: ${encodeLines}`);
  });

  it('fails in enforce mode while current hard-cap breaches remain', async () => {
    await expect(
      execFileAsync('node', ['scripts/check-source-file-sizes.mjs', '--enforce-hard-cap'], {
        cwd: process.cwd(),
      }),
    ).rejects.toMatchObject({ code: 1 });
  });
});

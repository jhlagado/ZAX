import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { compile } from '../../src/compile.js';
import { defaultFormatWriters } from '../../src/formats/index.js';
import type { BinArtifact } from '../../src/formats/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..');
const classicParserPath = join(repoRoot, 'src', 'frontend', 'asm80', 'parseClassicModule.ts');
const classicAsm80Available = existsSync(classicParserPath);
const classicModuleLoweringAvailable = true;
const manifest = {
  source: '/Users/johnhardy/Documents/projects/MON3/src/mon3.z80',
  referenceBin: '/Users/johnhardy/Documents/projects/MON3/MON3-1G_BC25-16.bin',
};
const mon3FilesAvailable = existsSync(manifest.source) && existsSync(manifest.referenceBin);
const runMon3Acceptance = process.env.ZAX_RUN_MON3_ACCEPTANCE === '1';
const describeMon3 =
  classicAsm80Available && classicModuleLoweringAvailable && mon3FilesAvailable && runMon3Acceptance
    ? describe
    : describe.skip;

describeMon3('ASM80 MON3 acceptance', () => {
  it('compiles MON3 and matches the reference binary bytes', async () => {
    const res = await compile(
      manifest.source,
      { emitBin: true, emitHex: false, emitD8m: false, emitListing: false },
      { formats: defaultFormatWriters },
    );
    expect(res.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    const bin = res.artifacts.find((a): a is BinArtifact => a.kind === 'bin');
    expect(bin).toBeDefined();
    if (!bin) throw new Error('missing bin artifact');

    expect(Buffer.from(bin.bytes)).toEqual(readFileSync(manifest.referenceBin));
  });
});

if (!classicAsm80Available || !classicModuleLoweringAvailable) {
  describe('ASM80 MON3 acceptance', () => {
    it.todo('BLOCKED: enable when classic ASM80 module parsing/lowering is wired into compile()');
  });
} else if (!mon3FilesAvailable) {
  describe('ASM80 MON3 acceptance', () => {
    it.todo('skipped: local MON3 source/reference binary is unavailable');
  });
} else if (!runMon3Acceptance) {
  describe('ASM80 MON3 acceptance', () => {
    it.todo('set ZAX_RUN_MON3_ACCEPTANCE=1 to run the local MON3 byte-for-byte acceptance check');
  });
}

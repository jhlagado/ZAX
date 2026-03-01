import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact, BinArtifact } from '../src/formats/types.js';

type IndexedFamily = {
  prefix: number;
  lanes: readonly ['IXH', 'IXL'] | readonly ['IYH', 'IYL'];
  regs: readonly string[];
};

const indexedFamilies: readonly IndexedFamily[] = [
  { prefix: 0xdd, lanes: ['IXH', 'IXL'], regs: ['A', 'B', 'C', 'D', 'E', 'IXH', 'IXL'] },
  { prefix: 0xfd, lanes: ['IYH', 'IYL'], regs: ['A', 'B', 'C', 'D', 'E', 'IYH', 'IYL'] },
];

const regCode = new Map<string, number>([
  ['B', 0],
  ['C', 1],
  ['D', 2],
  ['E', 3],
  ['H', 4],
  ['L', 5],
  ['A', 7],
  ['IXH', 4],
  ['IXL', 5],
  ['IYH', 4],
  ['IYL', 5],
]);

async function compileSource(source: string) {
  const dir = await mkdtemp(join(tmpdir(), 'zax-pr447-'));
  const entry = join(dir, 'main.zax');
  await writeFile(entry, source, 'utf8');
  return compile(
    entry,
    { emitAsm: true, emitBin: true, emitHex: false, emitListing: false, emitD8m: false },
    { formats: defaultFormatWriters },
  );
}

function buildProgram(lines: readonly string[]): string {
  return `export func main(): AF, BC, DE, HL\n${lines.map((line) => `  ${line}`).join('\n')}\nend\n`;
}

describe('PR447: direct IXH/IXL/IYH/IYL forms', () => {
  it('accepts the full directly encodable load matrix for the supported families', async () => {
    const lines: string[] = [];
    const expected: number[] = [];

    for (const family of indexedFamilies) {
      for (const dst of family.regs) {
        for (const src of family.regs) {
          const touchesLane =
            family.lanes.includes(dst as 'IXH' | 'IXL' | 'IYH' | 'IYL') ||
            family.lanes.includes(src as 'IXH' | 'IXL' | 'IYH' | 'IYL');
          if (!touchesLane) continue;

          lines.push(`ld ${dst.toLowerCase()}, ${src.toLowerCase()}`);
          expected.push(
            family.prefix,
            0x40 + ((regCode.get(dst)! & 0x07) << 3) + (regCode.get(src)! & 0x07),
          );
        }
      }
    }
    expected.push(0xc9);

    const res = await compileSource(buildProgram(lines));
    expect(res.diagnostics).toEqual([]);

    const asm = res.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
    const bin = res.artifacts.find((a): a is BinArtifact => a.kind === 'bin');
    expect(asm).toBeDefined();
    expect(bin).toBeDefined();

    expect(Array.from(bin!.bytes)).toEqual(expected);

    const text = asm!.text.toUpperCase();
    expect(text).not.toContain('PUSH ');
    expect(text).not.toContain('POP ');
    expect(text).not.toContain('EX DE, HL');
  });

  it('rejects the explicit unsupported edge of the first slice', async () => {
    const lines = [
      'ld h, ixh',
      'ld l, ixl',
      'ld ixh, h',
      'ld ixl, l',
      'ld h, iyh',
      'ld l, iyl',
      'ld iyh, h',
      'ld iyl, l',
      'ld ixh, iyh',
      'ld ixl, iyl',
      'ld iyh, ixh',
      'ld iyl, ixl',
    ];

    const res = await compileSource(buildProgram(lines));
    const messages = res.diagnostics.map((d) => d.message);

    expect(messages).toContain('ld with IX*/IY* does not support legacy H/L counterpart operands');
    expect(messages).toContain('ld between IX* and IY* byte registers is not supported');
    expect(messages).toHaveLength(lines.length);
  });
});

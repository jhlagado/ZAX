import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';
import { compilePlacedProgram, flattenLoweredItems } from './helpers/lowered_program.js';

const fixture = join(__dirname, 'fixtures', 'pr320_extern_and_internal_calls.zax');

describe('PR320 extern typed-call preservation', () => {
  it('does not push preserves for extern typed calls but does for internal typed calls', async () => {
    const { program, diagnostics } = await compilePlacedProgram(fixture);
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);

    // callee_internal prologue preserves AF/BC/DE (return in HL, volatile) per table
    const items = flattenLoweredItems(program);
    const labelIdx = items.findIndex((item) => item.kind === 'label' && item.name === 'callee_internal');
    expect(labelIdx).toBeGreaterThanOrEqual(0);
    const prologueItems = items.slice(labelIdx + 1, labelIdx + 12).filter((item) => item.kind === 'instr');
    const hasProloguePush = (reg: string) =>
      prologueItems.some(
        (item) =>
          item.head.toUpperCase() === 'PUSH' &&
          item.operands[0]?.kind === 'reg' &&
          item.operands[0].name.toUpperCase() === reg,
      );
    expect(hasProloguePush('AF')).toBe(true);
    expect(hasProloguePush('BC')).toBe(true);
    expect(hasProloguePush('DE')).toBe(true);

    // extern call site should not push preserves around callee_extern (trace-only check)
    const asmRes = await compile(
      fixture,
      { emitAsm: true, emitAsm80: false, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
      { formats: defaultFormatWriters },
    );
    expect(asmRes.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const asm = asmRes.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
    expect(asm).toBeDefined();
    const lines = asm!.text.split('\n');
    const callIdx = lines.findIndex((l) => /call callee_extern/i.test(l));
    expect(callIdx).toBeGreaterThanOrEqual(0);
    const window = lines.slice(Math.max(0, callIdx - 3), callIdx + 1).join('\n');
    expect(window).not.toMatch(/push AF/i);
    expect(window).not.toMatch(/push BC/i);
    expect(window).not.toMatch(/push DE/i);
  });
});

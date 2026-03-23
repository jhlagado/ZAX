import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  compilePlacedProgram,
  flattenLoweredInstructions,
  formatLoweredInstruction,
} from './helpers/lowered_program.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR452: conditional jump trace placeholders', () => {
  it('emits concrete condition names in structured-control traces', async () => {
    const entries = [
      join(__dirname, '..', 'test', 'codegen-corpus', 'basic_control_flow.zax'),
      join(__dirname, '..', 'test', 'codegen-corpus', 'pr222_locals_retcc_and_ret.zax'),
      join(__dirname, '..', 'test', 'codegen-corpus', 'pr258_op_cc_matcher.zax'),
    ];

    const formatted: string[] = [];
    for (const entry of entries) {
      const res = await compilePlacedProgram(entry);
      expect(res.diagnostics).toEqual([]);
      const instrs = flattenLoweredInstructions(res.program);
      formatted.push(...instrs.map((ins) => formatLoweredInstruction(ins).toUpperCase()));
    }

    const jpLines = formatted.filter((line) => line.startsWith('JP '));
    expect(jpLines).not.toContain('JP CC');
    expect(jpLines).not.toContain('JP CC,');
  });

  it('removes jp cc placeholders from the touched checked-in traces', async () => {
    const traces = [
      join(__dirname, '..', 'test', 'codegen-corpus', 'basic_control_flow.asm'),
      join(__dirname, '..', 'test', 'codegen-corpus', 'pr222_locals_retcc_and_ret.asm'),
      join(__dirname, '..', 'test', 'codegen-corpus', 'pr258_op_cc_matcher.asm'),
      join(__dirname, '..', 'test', 'fixtures', 'corpus', 'golden', 'basic_control_flow.asm'),
    ];

    for (const trace of traces) {
      const text = (await readFile(trace, 'utf8')).toUpperCase();
      expect(text).not.toContain('JP CC,');
    }
  });
});

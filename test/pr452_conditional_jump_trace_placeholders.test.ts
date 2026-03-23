import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  compilePlacedProgram,
  flattenLoweredInstructions,
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

    const instrsAll = [];
    for (const entry of entries) {
      const res = await compilePlacedProgram(entry);
      expect(res.diagnostics).toEqual([]);
      const instrs = flattenLoweredInstructions(res.program);
      instrsAll.push(...instrs);
    }

    const hasPlaceholderHead = instrsAll.some((ins) => {
      const head = ins.head.toUpperCase();
      return head.startsWith('JP CC') || head.startsWith('JR CC');
    });
    const hasPlaceholderOperand = instrsAll.some((ins) => {
      const head = ins.head.toUpperCase();
      if (head !== 'JP' && head !== 'JR') return false;
      const first = ins.operands[0];
      return first?.kind === 'reg' && first.name.toUpperCase() === 'CC';
    });

    const seenConds = new Set<string>();
    const condSet = new Set(['Z', 'NZ', 'NC', 'C', 'PO', 'PE', 'P', 'M']);
    for (const ins of instrsAll) {
      const head = ins.head.toUpperCase();
      if (!head.startsWith('JP') && !head.startsWith('JR')) continue;
      const headParts = head.split(/\s+/);
      if (headParts.length > 1 && condSet.has(headParts[1])) {
        seenConds.add(headParts[1]);
        continue;
      }
      const first = ins.operands[0];
      if (first?.kind === 'reg') {
        const name = first.name.toUpperCase();
        if (condSet.has(name)) seenConds.add(name);
      }
    }

    expect(hasPlaceholderHead).toBe(false);
    expect(hasPlaceholderOperand).toBe(false);
    expect(seenConds.size).toBeGreaterThan(0);
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
      expect(text).toMatch(/JP (?:NZ|Z|NC|C|PO|PE|P|M),/);
    }
  });
});

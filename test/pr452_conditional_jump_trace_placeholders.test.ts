import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { AsmArtifact } from '../src/formats/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR452: conditional jump trace placeholders', () => {
  it('emits concrete condition names in structured-control traces', async () => {
    const entries = [
      join(__dirname, '..', 'examples', 'codegen-corpus', 'basic_control_flow.zax'),
      join(__dirname, '..', 'examples', 'codegen-corpus', 'pr222_locals_retcc_and_ret.zax'),
      join(__dirname, '..', 'examples', 'codegen-corpus', 'pr258_op_cc_matcher.zax'),
    ];

    const asmTexts: string[] = [];
    for (const entry of entries) {
      const res = await compile(
        entry,
        { emitAsm: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
        { formats: defaultFormatWriters },
      );

      expect(res.diagnostics).toEqual([]);
      const asm = res.artifacts.find((a): a is AsmArtifact => a.kind === 'asm');
      expect(asm).toBeDefined();
      asmTexts.push(asm!.text.toUpperCase());
    }

    const combined = asmTexts.join('\n');
    expect(combined).not.toContain('JP CC,');
    expect(combined).toContain('JP Z,');
    expect(combined).toContain('JP NZ,');
    expect(combined).toContain('JP NC,');
  });

  it('removes jp cc placeholders from the touched checked-in traces', async () => {
    const traces = [
      join(__dirname, '..', 'examples', 'codegen-corpus', 'basic_control_flow.asm'),
      join(__dirname, '..', 'examples', 'codegen-corpus', 'pr222_locals_retcc_and_ret.asm'),
      join(__dirname, '..', 'examples', 'codegen-corpus', 'pr258_op_cc_matcher.asm'),
      join(__dirname, '..', 'test', 'fixtures', 'corpus', 'golden', 'basic_control_flow.asm'),
    ];

    for (const trace of traces) {
      const text = (await readFile(trace, 'utf8')).toUpperCase();
      expect(text).not.toContain('JP CC,');
    }
  });
});

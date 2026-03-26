import { describe, expect, it } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from '../src/compile.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import type { D8mArtifact, HexArtifact } from '../src/formats/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function parseIntelHex(text: string): Map<number, number> {
  const bytes = new Map<number, number>();
  let base = 0;

  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith(':')) continue;
    const len = Number.parseInt(line.slice(1, 3), 16);
    const addr = Number.parseInt(line.slice(3, 7), 16);
    const type = Number.parseInt(line.slice(7, 9), 16);
    const data = line.slice(9, 9 + len * 2);

    if (type === 0x00) {
      for (let index = 0; index < len; index++) {
        bytes.set(base + addr + index, Number.parseInt(data.slice(index * 2, index * 2 + 2), 16));
      }
    } else if (type === 0x04) {
      base = Number.parseInt(data, 16) << 16;
    } else if (type === 0x01) {
      break;
    }
  }

  return bytes;
}

describe('PR1049 record data lowering', () => {
  it('lowers named and positional record initializers into the expected bytes', async () => {
    const entry = join(__dirname, 'fixtures', 'pr286_record_named_init_positive.zax');
    const result = await compile(
      entry,
      { emitHex: true, emitBin: false, emitD8m: true, emitListing: false },
      { formats: defaultFormatWriters },
    );

    expect(result.diagnostics).toEqual([]);

    const hex = result.artifacts.find((artifact): artifact is HexArtifact => artifact.kind === 'hex');
    const d8m = result.artifacts.find((artifact): artifact is D8mArtifact => artifact.kind === 'd8m');
    expect(hex).toBeDefined();
    expect(d8m).toBeDefined();

    const bytes = parseIntelHex(hex!.text);
    expect(bytes.get(0x1000)).toBe(0x34);
    expect(bytes.get(0x1001)).toBe(0x12);
    expect(bytes.get(0x1002)).toBe(0x56);
    expect(bytes.get(0x1003)).toBe(0x78);

    const symbols = d8m!.json.symbols as Array<{ name: string; address?: number }>;
    expect(symbols.find((symbol) => symbol.name === 'named')?.address).toBe(0x1000);
    expect(symbols.find((symbol) => symbol.name === 'positional')?.address).toBe(0x1002);
  });

  it('diagnoses invalid record initializer shapes and duplicate taken symbols', async () => {
    const entry = join(__dirname, 'fixtures', 'pr286_record_named_init_negative.zax');
    const result = await compile(entry, {}, { formats: defaultFormatWriters });
    const messages = result.diagnostics.map((diagnostic) => diagnostic.message);

    expect(messages).toContain('Unknown record field "xx" in initializer for "bad_unknown".');
    expect(messages).toContain('Duplicate record field "lo" in initializer for "bad_duplicate".');
    expect(messages).toContain('Missing record field "hi" in initializer for "bad_missing".');
    expect(messages).toContain(
      'Named-field aggregate initializer requires a record type for "bad_shape".',
    );
    expect(messages).toContain('Record initializer field count mismatch for "bad_positional".');
    expect(messages).toContain('Record initializer for "bad_record_string" must use aggregate form.');
    expect(messages).toContain(
      'Unsupported record field type "pair" in initializer for "bad_nested" (expected byte/word/addr/ptr).',
    );
    expect(messages).toContain('Duplicate symbol name "dup".');
  });

  it('rejects mixed positional and named aggregate entries before lowering', async () => {
    const entry = join(__dirname, 'fixtures', 'pr286_record_named_init_mixed_negative.zax');
    const result = await compile(entry, {}, { formats: defaultFormatWriters });

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toContain(
      'Mixed positional and named aggregate initializer entries are not allowed for "bad_mixed".',
    );
  });
});
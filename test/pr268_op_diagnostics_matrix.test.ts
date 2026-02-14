import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { DiagnosticIds } from '../src/diagnostics/types.js';
import { defaultFormatWriters } from '../src/formats/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR268: op diagnostics matrix', () => {
  it('reports no-match diagnostics with operand summary and overload list', async () => {
    const entry = join(__dirname, 'fixtures', 'pr268_op_no_match_diagnostics.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    const ids = res.diagnostics.map((d) => d.id);
    const messages = res.diagnostics.map((d) => d.message);

    expect(ids).toContain(DiagnosticIds.OpNoMatchingOverload);
    expect(messages.some((m) => m.includes('No matching op overload for "add16"'))).toBe(true);
    expect(messages.some((m) => m.includes('call-site operands: (IX, DE)'))).toBe(true);
    expect(messages.some((m) => m.includes('available overloads:'))).toBe(true);
    expect(messages.some((m) => m.includes('dst: expects HL, got IX'))).toBe(true);
  });

  it('reports arity mismatch diagnostics with available signatures', async () => {
    const entry = join(__dirname, 'fixtures', 'pr268_op_arity_mismatch_diagnostics.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    const ids = res.diagnostics.map((d) => d.id);
    const messages = res.diagnostics.map((d) => d.message);

    expect(ids).toContain(DiagnosticIds.OpArityMismatch);
    expect(
      messages.some((m) => m.includes('No op overload of "add16" accepts 3 operand(s).')),
    ).toBe(true);
    expect(messages.some((m) => m.includes('available overloads:'))).toBe(true);
  });

  it('reports ambiguous candidate signatures for incomparable matches', async () => {
    const entry = join(__dirname, 'fixtures', 'pr267_op_ambiguous_incomparable.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    const ids = res.diagnostics.map((d) => d.id);
    const messages = res.diagnostics.map((d) => d.message);

    expect(ids).toContain(DiagnosticIds.OpAmbiguousOverload);
    expect(messages.some((m) => m.includes('Ambiguous op overload for "choose"'))).toBe(true);
    expect(messages.some((m) => m.includes('equally specific candidates:'))).toBe(true);
  });

  it('reports cyclic op expansion chain context', async () => {
    const entry = join(__dirname, 'fixtures', 'pr16_op_cycle.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    const ids = res.diagnostics.map((d) => d.id);
    const messages = res.diagnostics.map((d) => d.message);

    expect(ids).toContain(DiagnosticIds.OpExpansionCycle);
    expect(messages.some((m) => m.includes('Cyclic op expansion detected for "first".'))).toBe(
      true,
    );
    expect(messages.some((m) => m.includes('expansion chain: first'))).toBe(true);
    expect(messages.some((m) => m.includes('-> second'))).toBe(true);
  });

  it('reports invalid op expansion diagnostics with expanded instruction context', async () => {
    const entry = join(__dirname, 'fixtures', 'pr270_op_invalid_expansion_diagnostics.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    const ids = res.diagnostics.map((d) => d.id);
    const messages = res.diagnostics.map((d) => d.message);

    expect(ids).toContain(DiagnosticIds.OpInvalidExpansion);
    expect(messages.some((m) => m.includes('Invalid op expansion in "clobber_a_with"'))).toBe(true);
    expect(messages.some((m) => m.includes('expanded instruction: ld A, SP'))).toBe(true);
    expect(messages.some((m) => m.includes('op definition:'))).toBe(true);
    expect(messages.some((m) => m.includes('expansion chain: clobber_a_with'))).toBe(true);
  });

  it('reports nested invalid expansion diagnostics with full expansion chain', async () => {
    const entry = join(__dirname, 'fixtures', 'pr270_op_invalid_expansion_nested_chain.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    const ids = res.diagnostics.map((d) => d.id);
    const messages = res.diagnostics.map((d) => d.message);

    expect(ids).toContain(DiagnosticIds.OpInvalidExpansion);
    expect(messages.some((m) => m.includes('Invalid op expansion in "bad_inner"'))).toBe(true);
    expect(messages.some((m) => m.includes('expansion chain: mid'))).toBe(true);
    expect(messages.some((m) => m.includes('-> bad_inner'))).toBe(true);
  });

  it('reports one invalid-expansion diagnostic per failing expanded instruction', async () => {
    const entry = join(__dirname, 'fixtures', 'pr270_op_invalid_expansion_multi_failure.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    const invalids = res.diagnostics.filter((d) => d.id === DiagnosticIds.OpInvalidExpansion);
    const messages = invalids.map((d) => d.message);

    expect(invalids).toHaveLength(2);
    expect(messages.some((m) => m.includes('expanded instruction: ld A, SP'))).toBe(true);
    expect(messages.some((m) => m.includes('expanded instruction: ld C, SP'))).toBe(true);
  });

  it('does not emit invalid-expansion diagnostics for non-op instruction failures', async () => {
    const entry = join(__dirname, 'fixtures', 'pr270_nonop_invalid_instruction_baseline.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    const ids = res.diagnostics.map((d) => d.id);

    expect(ids).not.toContain(DiagnosticIds.OpInvalidExpansion);
    expect(ids).toContain(DiagnosticIds.EncodeError);
  });
});

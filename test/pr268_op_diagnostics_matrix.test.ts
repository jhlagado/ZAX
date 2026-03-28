import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { DiagnosticIds } from '../src/diagnosticTypes.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import { expectDiagnostic, expectNoDiagnostic } from './helpers/diagnostics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PR268: op diagnostics matrix', () => {
  it('reports no-match diagnostics with operand summary and overload list', async () => {
    const entry = join(__dirname, 'fixtures', 'pr268_op_no_match_diagnostics.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expectDiagnostic(res.diagnostics, {
      id: DiagnosticIds.OpNoMatchingOverload,
      messageIncludes: 'No matching op overload for "add16"',
    });
    expectDiagnostic(res.diagnostics, {
      id: DiagnosticIds.OpNoMatchingOverload,
      messageIncludes: 'call-site operands: (IX, DE)',
    });
    expectDiagnostic(res.diagnostics, {
      id: DiagnosticIds.OpNoMatchingOverload,
      messageIncludes: 'available overloads:',
    });
    expectDiagnostic(res.diagnostics, {
      id: DiagnosticIds.OpNoMatchingOverload,
      messageIncludes: 'dst: expects HL, got IX',
    });
  });

  it('reports arity mismatch diagnostics with available signatures', async () => {
    const entry = join(__dirname, 'fixtures', 'pr268_op_arity_mismatch_diagnostics.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expectDiagnostic(res.diagnostics, {
      id: DiagnosticIds.OpArityMismatch,
      messageIncludes: 'No op overload of "add16" accepts 3 operand(s).',
    });
    expectDiagnostic(res.diagnostics, {
      id: DiagnosticIds.OpArityMismatch,
      messageIncludes: 'available overloads:',
    });
  });

  it('reports ambiguous candidate signatures for incomparable matches', async () => {
    const entry = join(__dirname, 'fixtures', 'pr267_op_ambiguous_incomparable.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expectDiagnostic(res.diagnostics, {
      id: DiagnosticIds.OpAmbiguousOverload,
      messageIncludes: 'Ambiguous op overload for "choose"',
    });
    expectDiagnostic(res.diagnostics, {
      id: DiagnosticIds.OpAmbiguousOverload,
      messageIncludes: 'equally specific candidates:',
    });
  });

  it('reports cyclic op expansion chain context', async () => {
    const entry = join(__dirname, 'fixtures', 'pr16_op_cycle.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expectDiagnostic(res.diagnostics, {
      id: DiagnosticIds.OpExpansionCycle,
      messageIncludes: 'Cyclic op expansion detected for "first".',
    });
    expectDiagnostic(res.diagnostics, {
      id: DiagnosticIds.OpExpansionCycle,
      messageIncludes: 'expansion chain: first',
    });
    expectDiagnostic(res.diagnostics, {
      id: DiagnosticIds.OpExpansionCycle,
      messageIncludes: '-> second',
    });
  });

  it('reports invalid op expansion diagnostics with expanded instruction context', async () => {
    const entry = join(__dirname, 'fixtures', 'pr270_op_invalid_expansion_diagnostics.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expectDiagnostic(res.diagnostics, {
      id: DiagnosticIds.OpInvalidExpansion,
      messageIncludes: 'Invalid op expansion in "clobber_a_with"',
    });
    expectDiagnostic(res.diagnostics, {
      id: DiagnosticIds.OpInvalidExpansion,
      messageIncludes: 'expanded instruction: ld A, SP',
    });
    expectDiagnostic(res.diagnostics, {
      id: DiagnosticIds.OpInvalidExpansion,
      messageIncludes: 'op definition:',
    });
    expectDiagnostic(res.diagnostics, {
      id: DiagnosticIds.OpInvalidExpansion,
      messageIncludes: 'expansion chain: clobber_a_with',
    });
  });

  it('reports nested invalid expansion diagnostics with full expansion chain', async () => {
    const entry = join(__dirname, 'fixtures', 'pr270_op_invalid_expansion_nested_chain.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expectDiagnostic(res.diagnostics, {
      id: DiagnosticIds.OpInvalidExpansion,
      messageIncludes: 'Invalid op expansion in "bad_inner"',
    });
    expectDiagnostic(res.diagnostics, {
      id: DiagnosticIds.OpInvalidExpansion,
      messageIncludes: 'expansion chain: mid',
    });
    expectDiagnostic(res.diagnostics, {
      id: DiagnosticIds.OpInvalidExpansion,
      messageIncludes: '-> bad_inner',
    });
  });

  it('reports one invalid-expansion diagnostic per failing expanded instruction', async () => {
    const entry = join(__dirname, 'fixtures', 'pr270_op_invalid_expansion_multi_failure.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    const invalids = res.diagnostics.filter((d) => d.id === DiagnosticIds.OpInvalidExpansion);

    expect(invalids).toHaveLength(2);
    expectDiagnostic(invalids, {
      messageIncludes: 'expanded instruction: ld A, SP',
    });
    expectDiagnostic(invalids, {
      messageIncludes: 'expanded instruction: ld C, SP',
    });
  });

  it('does not emit invalid-expansion diagnostics for non-op instruction failures', async () => {
    const entry = join(__dirname, 'fixtures', 'pr270_nonop_invalid_instruction_baseline.zax');
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expectNoDiagnostic(res.diagnostics, { id: DiagnosticIds.OpInvalidExpansion });
    expectDiagnostic(res.diagnostics, { id: DiagnosticIds.EncodeError });
  });
});

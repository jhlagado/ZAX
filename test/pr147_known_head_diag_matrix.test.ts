import { describe, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile } from '../src/compile.js';
import { DiagnosticIds } from '../src/diagnosticTypes.js';
import { defaultFormatWriters } from '../src/formats/index.js';
import { expectDiagnostic, expectNoDiagnostic } from './helpers/diagnostics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PR147_KNOWN_HEAD_MATRIX_FIXTURE = join(__dirname, 'fixtures', 'pr147_known_head_diag_matrix_invalid.zax');

type KnownHeadMatrixRow = {
  label: string;
  fixture: string;
  id: (typeof DiagnosticIds)[keyof typeof DiagnosticIds];
  message: string;
};

describe('PR147: broad known-head diagnostic matrix', () => {
  // IDs from `compile(PR147_KNOWN_HEAD_MATRIX_FIXTURE)` (EncodeError = encoder; EmitError = lowering diagAt).
  it.each([
    {
      label: 'add arity',
      fixture: 'pr147_known_head_diag_matrix_invalid.zax',
      id: DiagnosticIds.EncodeError,
      message: 'add expects two operands',
    },
    {
      label: 'ld arity',
      fixture: 'pr147_known_head_diag_matrix_invalid.zax',
      id: DiagnosticIds.EncodeError,
      message: 'ld expects two operands',
    },
    {
      label: 'inc arity',
      fixture: 'pr147_known_head_diag_matrix_invalid.zax',
      id: DiagnosticIds.EncodeError,
      message: 'inc expects one operand',
    },
    {
      label: 'dec arity',
      fixture: 'pr147_known_head_diag_matrix_invalid.zax',
      id: DiagnosticIds.EncodeError,
      message: 'dec expects one operand',
    },
    {
      label: 'push reg set',
      fixture: 'pr147_known_head_diag_matrix_invalid.zax',
      id: DiagnosticIds.EncodeError,
      message: 'push supports BC/DE/HL/AF/IX/IY only',
    },
    {
      label: 'pop reg set',
      fixture: 'pr147_known_head_diag_matrix_invalid.zax',
      id: DiagnosticIds.EncodeError,
      message: 'pop supports BC/DE/HL/AF/IX/IY only',
    },
    {
      label: 'ex arity',
      fixture: 'pr147_known_head_diag_matrix_invalid.zax',
      id: DiagnosticIds.EncodeError,
      message: 'ex expects two operands',
    },
    {
      label: 'call register target',
      fixture: 'pr147_known_head_diag_matrix_invalid.zax',
      id: DiagnosticIds.EncodeError,
      message: 'call does not support register targets; use imm16',
    },
    {
      label: 'call cc nn arity',
      fixture: 'pr147_known_head_diag_matrix_invalid.zax',
      id: DiagnosticIds.EmitError,
      message: 'call cc, nn expects two operands (cc, nn)',
    },
    {
      label: 'call cc nn imm16',
      fixture: 'pr147_known_head_diag_matrix_invalid.zax',
      id: DiagnosticIds.EncodeError,
      message: 'call cc, nn expects imm16',
    },
    {
      label: 'jp cc nn arity',
      fixture: 'pr147_known_head_diag_matrix_invalid.zax',
      id: DiagnosticIds.EmitError,
      message: 'jp cc, nn expects two operands (cc, nn)',
    },
    {
      label: 'jp indirect form',
      fixture: 'pr147_known_head_diag_matrix_invalid.zax',
      id: DiagnosticIds.EncodeError,
      message: 'jp indirect form supports (hl), (ix), or (iy) only',
    },
    {
      label: 'jr cc disp arity',
      fixture: 'pr147_known_head_diag_matrix_invalid.zax',
      id: DiagnosticIds.EmitError,
      message: 'jr cc, disp expects two operands (cc, disp8)',
    },
    {
      label: 'jr cc validation',
      fixture: 'pr147_known_head_diag_matrix_invalid.zax',
      id: DiagnosticIds.EmitError,
      message: 'jr cc expects valid condition code NZ/Z/NC/C',
    },
    {
      label: 'djnz register target',
      fixture: 'pr147_known_head_diag_matrix_invalid.zax',
      id: DiagnosticIds.EmitError,
      message: 'djnz does not support register targets; expects disp8',
    },
    {
      label: 'rst imm8',
      fixture: 'pr147_known_head_diag_matrix_invalid.zax',
      id: DiagnosticIds.EncodeError,
      message: 'rst expects an imm8 multiple of 8 (0..56)',
    },
    {
      label: 'im mode',
      fixture: 'pr147_known_head_diag_matrix_invalid.zax',
      id: DiagnosticIds.EncodeError,
      message: 'im expects 0, 1, or 2',
    },
    {
      label: 'in a imm8 port',
      fixture: 'pr147_known_head_diag_matrix_invalid.zax',
      id: DiagnosticIds.EncodeError,
      message: 'in a,(n) expects an imm8 port number',
    },
    {
      label: 'out n a source',
      fixture: 'pr147_known_head_diag_matrix_invalid.zax',
      id: DiagnosticIds.EncodeError,
      message: 'out (n),a immediate port form requires source A',
    },
  ] satisfies KnownHeadMatrixRow[])('$label — specific diagnostics for malformed known instruction heads', async (row) => {
    const entry = join(__dirname, 'fixtures', row.fixture);
    const res = await compile(entry, {}, { formats: defaultFormatWriters });
    expectDiagnostic(res.diagnostics, {
      id: row.id,
      severity: 'error',
      message: row.message,
    });
  });

  it('does not fall back to unsupported-instruction diagnostics', async () => {
    const res = await compile(PR147_KNOWN_HEAD_MATRIX_FIXTURE, {}, { formats: defaultFormatWriters });
    expectNoDiagnostic(res.diagnostics, { messageIncludes: 'Unsupported instruction:' });
  });
});

import { describe, expect, it } from 'vitest';

import type { Diagnostic } from '../src/diagnostics/types.js';
import type { ProgramNode } from '../src/frontend/ast.js';
import { parseModuleFile } from '../src/frontend/parser.js';
import { validateSuccPredAcceptance } from '../src/semantics/succPredAcceptance.js';
import { buildEnv } from '../src/semantics/env.js';

function parseProgram(modulePath: string, source: string): { program: ProgramNode; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  const moduleFile = parseModuleFile(modulePath, source, diagnostics);
  const program: ProgramNode = {
    kind: 'Program',
    span: moduleFile.span,
    entryFile: modulePath,
    files: [moduleFile],
  };
  return { program, diagnostics };
}

describe('PR899 succ/pred acceptance', () => {
  it('accepts scalar byte and word path operands', () => {
    const { program, diagnostics } = parseProgram(
      'pr899_succ_pred_positive.zax',
      `
type Rec
  field: byte
end

section data globals at $8000
  count: byte
  used_slots: word
  arr: byte[4]
  rec: Rec
end

section code text at $0000
func main()
  succ count
  pred used_slots
  succ arr[1]
  pred rec.field
  ret
end
end
      `,
    );

    const env = buildEnv(program, diagnostics);
    validateSuccPredAcceptance(program, env, diagnostics);

    expect(diagnostics).toEqual([]);
  });

  it('rejects composite and address-typed operands', () => {
    const { program, diagnostics } = parseProgram(
      'pr899_succ_pred_negative.zax',
      `
type Rec
  field: byte
end

section data globals at $8000
  rec: Rec
  ptr: ptr
  raw_buf:
    db 1, 2, 3
end

section code text at $0000
func main()
  succ rec
  pred ptr
  succ raw_buf
  ret
end
end
      `,
    );

    const env = buildEnv(program, diagnostics);
    validateSuccPredAcceptance(program, env, diagnostics);

    const messages = diagnostics.map((d) => d.message);
    expect(messages).toContain('"succ" requires scalar storage; got Rec.');
    expect(messages).toContain('"pred" only supports byte and word scalar paths in this slice.');
    expect(messages).toContain('"succ" requires scalar storage; got unknown.');
  });

  it('rejects typed-path forms inside ops in this slice', () => {
    const { program, diagnostics } = parseProgram(
      'pr899_succ_pred_op_negative.zax',
      `
op bump(slot: ea)
  succ slot
end

op drop(slot: ea)
  pred slot
end
      `,
    );

    const env = buildEnv(program, diagnostics);
    validateSuccPredAcceptance(program, env, diagnostics);

    const messages = diagnostics.map((d) => d.message);
    expect(messages).toContain('"succ" typed-path forms are not supported inside ops in this slice.');
    expect(messages).toContain('"pred" typed-path forms are not supported inside ops in this slice.');
  });
});

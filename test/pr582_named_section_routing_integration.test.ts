import { describe, expect, it } from 'vitest';

import type { Diagnostic } from '../src/diagnostics/types.js';
import { parseProgram } from '../src/frontend/parser.js';
import { emitProgram } from '../src/lowering/emit.js';
import { collectNonBankedSectionKeys } from '../src/sectionKeys.js';
import { buildEnv } from '../src/semantics/env.js';

describe('PR582 named section routing integration', () => {
  it('lowers named section functions through contribution sinks instead of the legacy code stream', () => {
    const diagnostics: Diagnostic[] = [];
    const program = parseProgram(
      'pr582_named_section_routing.zax',
      [
        'section code boot at $1000',
        '  func helper(): AF, BC, DE, HL',
        '    nonsense',
        '  end',
        'end',
      ].join('\n'),
      diagnostics,
    );

    expect(diagnostics).toEqual([]);
    const sectionKeys = collectNonBankedSectionKeys(program, diagnostics);
    expect(diagnostics).toEqual([]);

    const env = buildEnv(program, diagnostics, { typePaddingWarnings: false });
    expect(diagnostics).toEqual([]);

    const { map } = emitProgram(program, env, diagnostics, { namedSectionKeys: sectionKeys });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.message).toBe('Unsupported instruction: nonsense');
    expect(map.bytes.size).toBe(0);
  });
});

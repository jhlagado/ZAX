import { describe, expect, it } from 'vitest';

import type { Diagnostic } from '../src/diagnostics/types.js';
import { DiagnosticIds } from '../src/diagnostics/types.js';
import { parseModuleFile } from '../src/frontend/parser.js';

describe('PR578 legacy syntax warnings', () => {
  it('warns for legacy globals/data blocks and active-counter section directives', () => {
    const file = 'legacy.zax';
    const source = [
      'section code at $1000',
      'globals',
      '  count: byte',
      'end',
      'data',
      '  msg: byte[2] = "hi"',
      'end',
      '',
    ].join('\n');

    const diagnostics: Diagnostic[] = [];
    parseModuleFile(file, source, diagnostics, { emitLegacyWarnings: true });

    const warnings = diagnostics.filter((d) => d.id === DiagnosticIds.LegacySyntaxWarning);
    expect(warnings).toHaveLength(3);
    expect(warnings.map((d) => d.line)).toEqual([1, 2, 5]);
    expect(warnings.every((d) => d.severity === 'warning')).toBe(true);
  });
});

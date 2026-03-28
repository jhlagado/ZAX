import { expect } from 'vitest';

import type { DiagnosticExpectation } from './diagnostics/index.js';
import { makeDiagnosticMatcher } from './diagnostics/index.js';

expect.extend({
  toHaveDiagnostic(received: unknown, expected: DiagnosticExpectation) {
    const diagnostics = Array.isArray(received) ? received : [];
    const matcher = makeDiagnosticMatcher(expected);
    const pass = diagnostics.some((diag) => matcher.asymmetricMatch(diag));
    return {
      pass,
      message: () =>
        pass
          ? 'Expected diagnostics not to contain a matching diagnostic.'
          : 'Expected diagnostics to contain a matching diagnostic.',
    };
  },
});

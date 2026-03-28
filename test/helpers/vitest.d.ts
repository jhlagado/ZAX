import type { DiagnosticExpectation } from './diagnostics/index.js';

declare module 'vitest' {
  interface Assertion<T = unknown> {
    toHaveDiagnostic(expected: DiagnosticExpectation): T;
  }
  interface AsymmetricMatchersContaining {
    toHaveDiagnostic(expected: DiagnosticExpectation): unknown;
  }
}

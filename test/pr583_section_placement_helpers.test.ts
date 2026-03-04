import { describe, expect, it } from 'vitest';

import type { Diagnostic } from '../src/diagnostics/types.js';
import type { NamedSectionNode } from '../src/frontend/ast.js';
import { placeNonBankedSectionContributions } from '../src/lowering/sectionPlacement.js';
import type { NamedSectionContributionSink } from '../src/lowering/sectionContributions.js';

function makeSink(
  section: 'code' | 'data',
  name: string,
  at: number,
  offset: number,
): NamedSectionContributionSink {
  const span = {
    file: `${name}.zax`,
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 1, column: 1, offset: 0 },
  };
  const node = ({
    kind: 'NamedSection',
    section,
    name,
    anchor: {
      kind: 'SectionAnchor',
      span,
      at: {
        kind: 'ImmLiteral',
        value: at,
        span,
      },
    },
    items: [],
    span,
  } as unknown) as NamedSectionNode;

  return {
    contribution: {
      key: { section, name },
      keyId: `${section}\u0000${name.toLowerCase()}`,
      moduleIndex: 0,
      itemIndex: 0,
      order: 0,
      node,
    },
    anchor: {
      key: { section, name },
      keyId: `${section}\u0000${name.toLowerCase()}`,
      moduleIndex: 0,
      itemIndex: 0,
      order: 0,
      node,
    },
    bytes: new Map(),
    offset,
    pendingSymbols: [],
    fixups: [],
    rel8Fixups: [],
    sourceSegments: [],
    asmTrace: [],
      currentSourceTag: undefined,
    };
}

describe('PR583 section placement helpers', () => {
  it('places contributions sequentially by key anchor', () => {
    const diagnostics: Diagnostic[] = [];
    const sinks = [makeSink('code', 'boot', 0x1000, 3), makeSink('code', 'boot', 0x1000, 5)];

    const { placedContributions, placedRegions } = placeNonBankedSectionContributions(sinks, {
      diagnostics,
      env: {} as never,
      evalImmExpr: (expr) => (expr.kind === 'ImmLiteral' ? expr.value : undefined),
    });

    expect(diagnostics).toEqual([]);
    expect(placedContributions.map((p) => p.baseAddress)).toEqual([0x1000, 0x1003]);
    expect(placedRegions).toEqual([
      expect.objectContaining({
        baseAddress: 0x1000,
        totalSize: 8,
        endAddress: 0x1007,
      }),
    ]);
  });
});

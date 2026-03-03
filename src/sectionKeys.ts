import type { Diagnostic } from './diagnostics/types.js';
import { DiagnosticIds } from './diagnostics/types.js';
import type { NamedSectionNode, ProgramNode } from './frontend/ast.js';

export type NonBankedSectionKey = {
  section: 'code' | 'data';
  name: string;
};

export type SectionContributionRecord = {
  key: NonBankedSectionKey;
  keyId: string;
  moduleIndex: number;
  itemIndex: number;
  order: number;
  node: NamedSectionNode;
};

export type SectionAnchorRecord = {
  key: NonBankedSectionKey;
  keyId: string;
  moduleIndex: number;
  itemIndex: number;
  order: number;
  node: NamedSectionNode;
};

export type NonBankedSectionKeyCollection = {
  orderedContributions: SectionContributionRecord[];
  orderedAnchors: SectionAnchorRecord[];
  contributionsByKey: Map<string, SectionContributionRecord[]>;
  anchorsByKey: Map<string, SectionAnchorRecord>;
};

function diag(
  diagnostics: Diagnostic[],
  id: (typeof DiagnosticIds)[keyof typeof DiagnosticIds],
  severity: 'error' | 'warning',
  file: string,
  message: string,
  where?: { line: number; column: number },
): void {
  diagnostics.push({
    id,
    severity,
    message,
    file,
    ...(where ? { line: where.line, column: where.column } : {}),
  });
}

function keyFor(section: 'code' | 'data', name: string): string {
  return `${section}\u0000${name.toLowerCase()}`;
}

function formatKey(key: NonBankedSectionKey): string {
  return `${key.section} ${key.name}`;
}

function startOf(node: NamedSectionNode): { file: string; line: number; column: number } {
  return {
    file: node.span.file,
    line: node.span.start.line,
    column: node.span.start.column,
  };
}

export function collectNonBankedSectionKeys(
  program: ProgramNode,
  diagnostics: Diagnostic[],
  moduleTraversal?: readonly string[],
): NonBankedSectionKeyCollection {
  const orderedContributions: SectionContributionRecord[] = [];
  const orderedAnchors: SectionAnchorRecord[] = [];
  const contributionsByKey = new Map<string, SectionContributionRecord[]>();
  const anchorsByKey = new Map<string, SectionAnchorRecord>();

  const traversalIndexByFile = new Map<string, number>();
  if (moduleTraversal) {
    for (const [index, file] of moduleTraversal.entries()) {
      traversalIndexByFile.set(file, index);
    }
  }

  const orderedModules = [...program.files]
    .map((moduleFile, moduleIndex) => ({
      moduleFile,
      moduleIndex,
      traversalIndex: traversalIndexByFile.get(moduleFile.span.file) ?? Number.MAX_SAFE_INTEGER,
    }))
    .sort((a, b) => {
      if (a.traversalIndex !== b.traversalIndex) return a.traversalIndex - b.traversalIndex;
      return a.moduleIndex - b.moduleIndex;
    });

  for (const { moduleFile, moduleIndex } of orderedModules) {
    for (const [itemIndex, item] of moduleFile.items.entries()) {
      if (item.kind !== 'NamedSection') continue;
      const node = item;
      const key: NonBankedSectionKey = { section: node.section, name: node.name };
      const keyId = keyFor(node.section, node.name);

      if (node.items.length > 0) {
        const contribution: SectionContributionRecord = {
          key,
          keyId,
          moduleIndex,
          itemIndex,
          order: orderedContributions.length,
          node,
        };
        orderedContributions.push(contribution);
        const existing = contributionsByKey.get(keyId);
        if (existing) existing.push(contribution);
        else contributionsByKey.set(keyId, [contribution]);
      }

      if (!node.anchor) continue;

      const existingAnchor = anchorsByKey.get(keyId);
      if (existingAnchor) {
        const at = startOf(node);
        diag(
          diagnostics,
          DiagnosticIds.EmitError,
          'error',
          at.file,
          `Duplicate anchor for section "${formatKey(key)}".`,
          { line: at.line, column: at.column },
        );
        continue;
      }

      const anchor: SectionAnchorRecord = {
        key,
        keyId,
        moduleIndex,
        itemIndex,
        order: orderedAnchors.length,
        node,
      };
      orderedAnchors.push(anchor);
      anchorsByKey.set(keyId, anchor);
    }
  }

  const reportedMissingAnchorKeys = new Set<string>();
  for (const contribution of orderedContributions) {
    if (anchorsByKey.has(contribution.keyId) || reportedMissingAnchorKeys.has(contribution.keyId)) continue;
    const at = startOf(contribution.node);
    diag(
      diagnostics,
      DiagnosticIds.EmitError,
      'error',
      at.file,
      `Missing anchor for section "${formatKey(contribution.key)}".`,
      { line: at.line, column: at.column },
    );
    reportedMissingAnchorKeys.add(contribution.keyId);
  }

  for (const anchor of orderedAnchors) {
    const contributions = contributionsByKey.get(anchor.keyId);
    if (contributions && contributions.length > 0) continue;
    const at = startOf(anchor.node);
    diag(
      diagnostics,
      DiagnosticIds.EmitWarning,
      'warning',
      at.file,
      `Anchor for section "${formatKey(anchor.key)}" has no contributions.`,
      { line: at.line, column: at.column },
    );
  }

  return {
    orderedContributions,
    orderedAnchors,
    contributionsByKey,
    anchorsByKey,
  };
}

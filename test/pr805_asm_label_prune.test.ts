import { describe, expect, it } from 'vitest';

import type { Diagnostic } from '../src/diagnostics/types.js';
import { parseModuleFile } from '../src/frontend/parser.js';
import type { FuncDeclNode, OpDeclNode } from '../src/frontend/ast.js';

function parse(source: string): { diagnostics: Diagnostic[]; module: ReturnType<typeof parseModuleFile> } {
  const diagnostics: Diagnostic[] = [];
  const module = parseModuleFile('pr805_asm_label_prune.zax', source, diagnostics);
  return { diagnostics, module };
}

function findFunc(module: ReturnType<typeof parseModuleFile>, name: string): FuncDeclNode {
  const item = module.items.find((node) => node.kind === 'FuncDecl' && node.name === name);
  if (!item || item.kind !== 'FuncDecl') throw new Error('FuncDecl not found');
  return item;
}

function findOp(module: ReturnType<typeof parseModuleFile>, name: string): OpDeclNode {
  const item = module.items.find((node) => node.kind === 'OpDecl' && node.name === name);
  if (!item || item.kind !== 'OpDecl') throw new Error('OpDecl not found');
  return item;
}

describe('PR805 asm label pruning', () => {
  it('accepts dot labels inside function bodies', () => {
    const { diagnostics, module } = parse(
      [
        'func main()',
        '  .loop:',
        '  ld a, b',
        'end',
      ].join('\n'),
    );

    const errors = diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toEqual([]);

    const func = findFunc(module, 'main');
    const label = func.asm.items.find((item) => item.kind === 'AsmLabel');
    expect(label).toMatchObject({ kind: 'AsmLabel', name: 'loop' });
  });

  it('rejects bare labels inside function bodies', () => {
    const { diagnostics } = parse(
      [
        'func main()',
        '  loop:',
        '  ld a, b',
        'end',
      ].join('\n'),
    );

    const messages = diagnostics.map((d) => d.message);
    expect(messages).toContain('Bare asm labels are not supported; use ".label:"');
  });

  it('rejects bare labels inside op bodies', () => {
    const { diagnostics } = parse(
      [
        'op demo()',
        '  loop:',
        '  ld a, b',
        'end',
      ].join('\n'),
    );

    const messages = diagnostics.map((d) => d.message);
    expect(messages).toContain('Bare asm labels are not supported; use ".label:"');

    const module = parseModuleFile('pr805_asm_label_prune.zax', ['op demo()', '  .ok:', 'end'].join('\n'), []);
    const op = findOp(module, 'demo');
    const label = op.body.items.find((item) => item.kind === 'AsmLabel');
    expect(label).toMatchObject({ kind: 'AsmLabel', name: 'ok' });
  });
});

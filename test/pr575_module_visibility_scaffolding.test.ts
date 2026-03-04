import { describe, expect, it } from 'vitest';

import type { ProgramNode } from '../src/frontend/ast.js';
import { parseModuleFile } from '../src/frontend/parser.js';
import { buildEnv } from '../src/semantics/env.js';

describe('PR575 module visibility scaffolding', () => {
  it('parses exported sectionless declarations and dotted type names', () => {
    const diagnostics: any[] = [];
    const moduleFile = parseModuleFile(
      'root.zax',
      [
        'export type Alias dep.Word',
        'export union Pair',
        '  lo: byte',
        '  hi: byte',
        'end',
        'export enum Mode Off, On',
      ].join('\n'),
      diagnostics,
    );

    expect(diagnostics).toEqual([]);
    expect(moduleFile.moduleId).toBe('root');
    expect(moduleFile.items[0]).toMatchObject({ kind: 'TypeDecl', exported: true, typeExpr: { kind: 'TypeName', name: 'dep.Word' } });
    expect(moduleFile.items[1]).toMatchObject({ kind: 'UnionDecl', exported: true });
    expect(moduleFile.items[2]).toMatchObject({ kind: 'EnumDecl', exported: true });
  });

  it('builds qualified visibility maps for exported sectionless symbols', () => {
    const diagnostics: any[] = [];
    const dep = parseModuleFile(
      'dep.zax',
      [
        'export const FOO = 7',
        'export type Word word',
        'export enum Mode Off, On',
      ].join('\n'),
      diagnostics,
    );
    const root = parseModuleFile(
      'root.zax',
      [
        'import "dep.zax"',
        'const LOCAL = dep.FOO',
        'type Alias dep.Word',
      ].join('\n'),
      diagnostics,
    );

    expect(diagnostics).toEqual([]);
    const program = {
      kind: 'Program',
      span: root.span,
      entryFile: root.path,
      files: [dep, root],
    } as ProgramNode;

    const env = buildEnv(program, diagnostics, { typePaddingWarnings: false });

    expect(diagnostics).toEqual([]);
    expect(env.importedModuleIds!.get(root.path)).toEqual(new Set(['dep']));
    expect(env.visibleConsts!.get('dep.FOO')).toBe(7);
    expect(env.consts.get('dep.FOO')).toBe(7);
    expect(env.visibleTypes!.get('dep.Word')).toBeDefined();
    expect(env.types.get('dep.Word')).toBeDefined();
    expect(env.visibleEnums!.get('dep.Mode.Off')).toBe(0);
    expect(env.visibleEnums!.get('dep.Mode.On')).toBe(1);
    expect(env.enums.has('dep.Mode.On')).toBe(false);
    expect(env.consts.get('LOCAL')).toBe(7);
  });
});

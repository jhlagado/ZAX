
function reportImmArithmeticError(
  diagnostics: Diagnostic[] | undefined,
  expr: { span: { file: string; start: { line: number; column: number } } },
  id: DiagnosticIds,
  message: string,
): void {
  diagnostics?.push({
    id,
    severity: 'error',
    message,
    file: expr.span.file,
    line: expr.span.start.line,
    column: expr.span.start.column,
  });
}
import type { Diagnostic } from '../diagnostics/types.js';
import { DiagnosticIds } from '../diagnostics/types.js';
import { dirname, resolve } from 'node:path';
import type {
  EnumDeclNode,
  ConstDeclNode,
  ExternDeclNode,
  FuncDeclNode,
  ImportNode,
  ImmExprNode,
  ProgramNode,
  TypeDeclNode,
  UnionDeclNode,
} from '../frontend/ast.js';
import { canonicalModuleId } from '../moduleIdentity.js';
import { resolveVisibleConst, resolveVisibleEnum } from '../moduleVisibility.js';
import { offsetOfPathInTypeExpr, sizeOfTypeExpr } from './layout.js';
import { visitDeclTree } from './declVisitor.js';

/**
 * Immutable compilation environment for PR2: resolved constant and enum member values.
 */
export interface CompileEnv {
  /**
   * Map of constant name -> evaluated numeric value.
   *
   * Values are plain JavaScript numbers; interpretation (imm8/imm16 wrapping, etc.) happens at use sites.
   */
  consts: Map<string, number>;

  /**
   * Map of enum member name -> evaluated numeric value.
   *
   * PR2 supports only implicit 0..N-1 member values.
   */
  enums: Map<string, number>;

  /**
   * Map of type name -> type declaration.
   *
   * PR3 uses this for layout calculation for module-scope `var` declarations.
   */
  types: Map<string, TypeDeclNode | UnionDeclNode>;

  moduleIds?: Map<string, string>;
  importedModuleIds?: Map<string, Set<string>>;
  visibleConsts?: Map<string, number>;
  visibleEnums?: Map<string, number>;
  visibleTypes?: Map<string, TypeDeclNode | UnionDeclNode>;
}

function diag(diagnostics: Diagnostic[], file: string, message: string): void {
  diagnostics.push({ id: DiagnosticIds.SemanticsError, severity: 'error', message, file });
}

/**
 * Evaluate an `imm` expression using values from the provided environment.
 *
 * PR2 implementation note:
 * - Supports literals, names, unary `+ - ~`, and binary `* / % + - & ^ | << >>`.
 * - Division/modulo use JavaScript semantics and truncate toward zero.
 */
export function evalImmExpr(
  expr: ImmExprNode,
  env: CompileEnv,
  diagnostics?: Diagnostic[],
): number | undefined {
  const unqualifiedEnumCandidates = (name: string): string[] => {
    if (name.includes('.')) return [];
    const suffix = `.${name}`;
    const matches: string[] = [];
    for (const key of env.enums.keys()) {
      if (key.endsWith(suffix)) matches.push(key);
    }
    return matches;
  };

  switch (expr.kind) {
    case 'ImmLiteral':
      return expr.value;
    case 'ImmName': {
      const fromConst = resolveVisibleConst(expr.name, expr.span.file, env);
      if (fromConst !== undefined) return fromConst;
      const fromEnum = resolveVisibleEnum(expr.name, expr.span.file, env);
      if (fromEnum !== undefined) return fromEnum;
      const enumMatches = unqualifiedEnumCandidates(expr.name);
      if (enumMatches.length > 0 && diagnostics) {
        const message =
          enumMatches.length === 1
            ? `Unqualified enum member "${expr.name}" is not allowed; use "${enumMatches[0]}".`
            : `Unqualified enum member "${expr.name}" is ambiguous; use one of: ${enumMatches.join(', ')}.`;
        diagnostics.push({
          id: DiagnosticIds.SemanticsError,
          severity: 'error',
          message,
          file: expr.span.file,
          line: expr.span.start.line,
          column: expr.span.start.column,
        });
      }
      return undefined;
    }
    case 'ImmSizeof': {
      return sizeOfTypeExpr(expr.typeExpr, env, diagnostics);
    }
    case 'ImmOffsetof': {
      return offsetOfPathInTypeExpr(
        expr.typeExpr,
        expr.path,
        env,
        (inner) => evalImmExpr(inner, env, diagnostics),
        diagnostics,
      );
    }
    case 'ImmUnary': {
      const v = evalImmExpr(expr.expr, env, diagnostics);
      if (v === undefined) return undefined;
      switch (expr.op) {
        case '+':
          return +v;
        case '-':
          return -v;
        case '~':
          return ~v;
      }
      // Exhaustive (future-proof)
      return undefined;
    }
    case 'ImmBinary': {
      const l = evalImmExpr(expr.left, env, diagnostics);
      const r = evalImmExpr(expr.right, env, diagnostics);
      if (l === undefined || r === undefined) return undefined;
      switch (expr.op) {
        case '*':
          return l * r;
        case '/':
          if (r === 0) {
            reportImmArithmeticError(
              diagnostics,
              expr,
              DiagnosticIds.ImmDivideByZero,
              'Divide by zero in imm expression.',
            );
            return undefined;
          }
          return (l / r) | 0;
        case '%':
          if (r === 0) {
            reportImmArithmeticError(
              diagnostics,
              expr,
              DiagnosticIds.ImmModuloByZero,
              'Modulo by zero in imm expression.',
            );
            return undefined;
          }
          return l % r;
        case '+':
          return l + r;
        case '-':
          return l - r;
        case '&':
          return l & r;
        case '^':
          return l ^ r;
        case '|':
          return l | r;
        case '<<':
          return l << r;
        case '>>':
          return l >> r;
      }
      return undefined;
    }
  }
}

type BuildEnvOptions = {
  moduleIdRootDir?: string;
  resolvedImportGraph?: ReadonlyMap<string, ReadonlyArray<string>>;
};

type CollectedDecls = {
  imports: ImportNode[];
  types: Array<TypeDeclNode | UnionDeclNode>;
  callables: Array<FuncDeclNode | ExternDeclNode>;
  enums: EnumDeclNode[];
  consts: ConstDeclNode[];
};

function importedModuleIdsForFile(
  moduleFile: ProgramNode['files'][number],
  imports: ImportNode[],
  moduleIdRootDir: string,
  options?: BuildEnvOptions,
): Set<string> {
  const graph = options?.resolvedImportGraph;
  if (graph) {
    const resolvedTargets = graph.get(moduleFile.path);
    if (!resolvedTargets) return new Set();
    return new Set(resolvedTargets.map((targetPath) => canonicalModuleId(targetPath, moduleIdRootDir)));
  }
  return new Set(
    imports.map((importNode) => {
      const target =
        importNode.form === 'path'
          ? resolve(dirname(moduleFile.path), importNode.specifier)
          : importNode.specifier;
      return canonicalModuleId(target, moduleIdRootDir);
    }),
  );
}

/**
 * Build the PR2 compile environment by resolving module-scope `enum` and `const` declarations.
 *
 * Implementation note:
 * - Resolves names across all parsed module files (entry + imports) in program order.
 * - Constants may reference previously defined constants and enum members (forward refs not yet supported).
 */
export function buildEnv(
  program: ProgramNode,
  diagnostics: Diagnostic[],
  options?: BuildEnvOptions,
): CompileEnv {
  const consts = new Map<string, number>();
  const enums = new Map<string, number>();
  const types = new Map<string, TypeDeclNode | UnionDeclNode>();
  const moduleIds = new Map<string, string>();
  const importedModuleIds = new Map<string, Set<string>>();
  const visibleConsts = new Map<string, number>();
  const visibleEnums = new Map<string, number>();
  const visibleTypes = new Map<string, TypeDeclNode | UnionDeclNode>();

  if (program.files.length === 0) {
    diag(diagnostics, program.entryFile, 'No module files to compile.');
    return { consts, enums, types, moduleIds, importedModuleIds, visibleConsts, visibleEnums, visibleTypes };
  }

  const moduleIdRootDir = options?.moduleIdRootDir ?? dirname(program.entryFile);
  const collectedByFile = new Map<string, CollectedDecls>();
  for (const mf of program.files) {
    moduleIds.set(mf.path, canonicalModuleId(mf.path, moduleIdRootDir));
    const collected: CollectedDecls = {
      imports: [],
      types: [],
      callables: [],
      enums: [],
      consts: [],
    };
    visitDeclTree(mf.items, (item, ctx) => {
      if (!ctx.inNamedSection && item.kind === 'Import') {
        collected.imports.push(item);
        return;
      }
      if (item.kind === 'TypeDecl' || item.kind === 'UnionDecl') {
        collected.types.push(item);
        return;
      }
      if (item.kind === 'FuncDecl' || item.kind === 'ExternDecl') {
        collected.callables.push(item);
        return;
      }
      if (item.kind === 'EnumDecl') {
        collected.enums.push(item);
        return;
      }
      if (item.kind === 'ConstDecl') {
        collected.consts.push(item);
      }
    });
    collectedByFile.set(mf.path, collected);
    importedModuleIds.set(
      mf.path,
      importedModuleIdsForFile(mf, collected.imports, moduleIdRootDir, options),
    );
  }

  const globalLower = new Map<string, { kind: string; name: string; file: string }>();
  const claim = (kind: string, name: string, file: string): boolean => {
    const k = name.toLowerCase();
    const prev = globalLower.get(k);
    if (prev) {
      diag(diagnostics, file, `Name "${name}" collides with ${prev.kind} "${prev.name}".`);
      return false;
    }
    globalLower.set(k, { kind, name, file });
    return true;
  };

  for (const mf of program.files) {
    const collected = collectedByFile.get(mf.path);
    if (!collected) continue;
    for (const item of collected.types) {
      const kind = item.kind === 'TypeDecl' ? 'type' : 'union';
      const name = item.name;
      if (!claim(kind, name, item.span.file)) continue;
      types.set(name, item);
      if (item.exported) {
        const moduleId =
          moduleIds.get(item.span.file) ?? canonicalModuleId(item.span.file, moduleIdRootDir);
        const qualifiedName = `${moduleId}.${name}`;
        visibleTypes.set(qualifiedName, item);
      }
    }
  }

  for (const mf of program.files) {
    const collected = collectedByFile.get(mf.path);
    if (!collected) continue;
    for (const item of collected.callables) {
      if (item.kind === 'FuncDecl') {
        const f = item as FuncDeclNode;
        claim('func', f.name, f.span.file);
      } else if (item.kind === 'ExternDecl') {
        const ex = item as ExternDeclNode;
        for (const fn of ex.funcs) {
          claim('extern func', fn.name, fn.span.file);
        }
      }
    }
  }

  for (const mf of program.files) {
    const collected = collectedByFile.get(mf.path);
    if (!collected) continue;
    for (const e of collected.enums) {
      // Note: enum names are tracked for collision purposes even though PR4 does not use them.
      claim('enum', e.name, e.span.file);

      for (let idx = 0; idx < e.members.length; idx++) {
        const name = e.members[idx]!;
        const qualifiedName = `${e.name}.${name}`;
        if (!claim('enum member', qualifiedName, e.span.file)) continue;
        enums.set(qualifiedName, idx);
        if (e.exported) {
          const moduleId = moduleIds.get(e.span.file) ?? canonicalModuleId(e.span.file, moduleIdRootDir);
          const exportedName = `${moduleId}.${qualifiedName}`;
          visibleEnums.set(exportedName, idx);
        }
      }
    }
  }

  const env: CompileEnv = {
    consts,
    enums,
    types,
    moduleIds,
    importedModuleIds,
    visibleConsts,
    visibleEnums,
    visibleTypes,
  };

  for (const mf of program.files) {
    const collected = collectedByFile.get(mf.path);
    if (!collected) continue;
    for (const item of collected.consts) {
      if (types.has(item.name)) {
        diag(diagnostics, item.span.file, `Const name "${item.name}" collides with a type name.`);
        continue;
      }
      if (!claim('const', item.name, item.span.file)) continue;

      const v = evalImmExpr(item.value, env, diagnostics);
      if (v === undefined) {
        diag(diagnostics, item.span.file, `Failed to evaluate const "${item.name}".`);
        continue;
      }
      consts.set(item.name, v);
      if (item.exported) {
        const moduleId =
          moduleIds.get(item.span.file) ?? canonicalModuleId(item.span.file, moduleIdRootDir);
        const qualifiedName = `${moduleId}.${item.name}`;
        visibleConsts.set(qualifiedName, v);
      }
    }
  }

  return env;
}

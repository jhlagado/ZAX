import type { Diagnostic } from '../diagnostics/types.js';
import { DiagnosticIds } from '../diagnostics/types.js';
import type {
  EnumDeclNode,
  ConstDeclNode,
  ExternDeclNode,
  FuncDeclNode,
  ImportNode,
  ImmExprNode,
  ModuleItemNode,
  ProgramNode,
  SectionItemNode,
  TypeDeclNode,
  UnionDeclNode,
} from '../frontend/ast.js';
import { canonicalModuleId } from '../moduleIdentity.js';
import { resolveVisibleConst, resolveVisibleEnum } from '../moduleVisibility.js';
import { offsetOfPathInTypeExpr, sizeOfTypeExpr, storageInfoForTypeDecl } from './layout.js';

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
            diagnostics?.push({
              id: DiagnosticIds.ImmDivideByZero,
              severity: 'error',
              message: 'Divide by zero in imm expression.',
              file: expr.span.file,
              line: expr.span.start.line,
              column: expr.span.start.column,
            });
            return undefined;
          }
          return (l / r) | 0;
        case '%':
          if (r === 0) {
            diagnostics?.push({
              id: DiagnosticIds.ImmModuloByZero,
              severity: 'error',
              message: 'Modulo by zero in imm expression.',
              file: expr.span.file,
              line: expr.span.start.line,
              column: expr.span.start.column,
            });
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

function collectEnumMembers(items: ModuleItemNode[]): EnumDeclNode[] {
  const enums: EnumDeclNode[] = [];
  const visit = (entry: ModuleItemNode | SectionItemNode): void => {
    if (entry.kind === 'NamedSection') {
      for (const item of entry.items) visit(item);
      return;
    }
    if (entry.kind === 'EnumDecl') enums.push(entry);
  };
  for (const item of items) visit(item);
  return enums;
}

function forEachDeclItem(
  items: ModuleItemNode[],
  visit: (item: ModuleItemNode | SectionItemNode) => void,
): void {
  const walk = (entry: ModuleItemNode | SectionItemNode): void => {
    if (entry.kind === 'NamedSection') {
      for (const item of entry.items) walk(item);
      return;
    }
    visit(entry);
  };
  for (const item of items) walk(item);
}

function directImports(items: ModuleItemNode[]): ImportNode[] {
  return items.filter((item): item is ImportNode => item.kind === 'Import');
}

type BuildEnvOptions = {
  typePaddingWarnings?: boolean;
  resolvedImportGraph?: ReadonlyMap<string, ReadonlyArray<string>>;
};

function importedModuleIdsForFile(moduleFile: ProgramNode['files'][number], options?: BuildEnvOptions): Set<string> {
  const graph = options?.resolvedImportGraph;
  if (!graph) {
    return new Set(directImports(moduleFile.items).map((item) => canonicalModuleId(item.specifier)));
  }
  const resolvedTargets = graph.get(moduleFile.path);
  if (!resolvedTargets) return new Set();
  return new Set(resolvedTargets.map((targetPath) => canonicalModuleId(targetPath)));
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

  for (const mf of program.files) {
    moduleIds.set(mf.path, mf.moduleId || canonicalModuleId(mf.path));
    importedModuleIds.set(mf.path, importedModuleIdsForFile(mf, options));
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
    forEachDeclItem(mf.items, (item) => {
      if (item.kind !== 'TypeDecl' && item.kind !== 'UnionDecl') return;
      const kind = item.kind === 'TypeDecl' ? 'type' : 'union';
      const name = item.name;
      if (!claim(kind, name, item.span.file)) return;
      types.set(name, item);
      if (item.exported) {
        const moduleId = moduleIds.get(item.span.file) ?? canonicalModuleId(item.span.file);
        const qualifiedName = `${moduleId}.${name}`;
        visibleTypes.set(qualifiedName, item);
      }
    });
  }

  for (const mf of program.files) {
    forEachDeclItem(mf.items, (item) => {
      if (item.kind === 'FuncDecl') {
        const f = item as FuncDeclNode;
        claim('func', f.name, f.span.file);
      } else if (item.kind === 'ExternDecl') {
        const ex = item as ExternDeclNode;
        for (const fn of ex.funcs) {
          claim('extern func', fn.name, fn.span.file);
        }
      }
    });
  }

  for (const mf of program.files) {
    for (const e of collectEnumMembers(mf.items)) {
      // Note: enum names are tracked for collision purposes even though PR4 does not use them.
      claim('enum', e.name, e.span.file);

      for (let idx = 0; idx < e.members.length; idx++) {
        const name = e.members[idx]!;
        const qualifiedName = `${e.name}.${name}`;
        if (!claim('enum member', qualifiedName, e.span.file)) continue;
        enums.set(qualifiedName, idx);
        if (e.exported) {
          const moduleId = moduleIds.get(e.span.file) ?? canonicalModuleId(e.span.file);
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

  if (options?.typePaddingWarnings === true) {
    for (const mf of program.files) {
      forEachDeclItem(mf.items, (item) => {
        if (item.kind !== 'TypeDecl' && item.kind !== 'UnionDecl') return;
        const info = storageInfoForTypeDecl(item, env, diagnostics);
        if (!info) return;
        if (info.storageSize <= info.preRoundSize) return;
        const padding = info.storageSize - info.preRoundSize;
        diagnostics.push({
          id: DiagnosticIds.TypePaddingWarning,
          severity: 'warning',
          message:
            `Type "${item.name}" size ${info.preRoundSize} padded to ${info.storageSize} ` +
            `(${padding} byte${padding === 1 ? '' : 's'} padding). ` +
            `Storage-visible size is used for layout, indexing, and sizeof.`,
          file: item.span.file,
          line: item.span.start.line,
          column: item.span.start.column,
        });
      });
    }
  }

  for (const mf of program.files) {
    forEachDeclItem(mf.items, (item) => {
      if (item.kind !== 'ConstDecl') return;
      if (types.has(item.name)) {
        diag(diagnostics, item.span.file, `Const name "${item.name}" collides with a type name.`);
        return;
      }
      if (!claim('const', item.name, item.span.file)) return;

      const v = evalImmExpr(item.value, env, diagnostics);
      if (v === undefined) {
        diag(diagnostics, item.span.file, `Failed to evaluate const "${item.name}".`);
        return;
      }
      consts.set(item.name, v);
      if (item.exported) {
        const moduleId = moduleIds.get(item.span.file) ?? canonicalModuleId(item.span.file);
        const qualifiedName = `${moduleId}.${item.name}`;
        visibleConsts.set(qualifiedName, v);
      }
    });
  }

  return env;
}

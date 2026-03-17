import { DiagnosticIds } from '../diagnostics/types.js';
import type { Diagnostic } from '../diagnostics/types.js';
import type {
  AsmInstructionNode,
  EaExprNode,
  FuncDeclNode,
  OpDeclNode,
  ProgramNode,
  SourceSpan,
  TypeExprNode,
  VarDeclNode,
} from '../frontend/ast.js';
import { visitDeclTree } from './declVisitor.js';
import type { CompileEnv } from './env.js';
import { createTypeResolutionHelpers } from '../lowering/typeResolution.js';
import { resolveVisibleType } from '../moduleVisibility.js';

function diagAt(diagnostics: Diagnostic[], span: SourceSpan, message: string): void {
  diagnostics.push({
    id: DiagnosticIds.SemanticsError,
    severity: 'error',
    message,
    file: span.file,
    line: span.start.line,
    column: span.start.column,
  });
}

function collectModuleStorage(program: ProgramNode, env: CompileEnv) {
  const storageTypes = new Map<string, TypeExprNode>();
  const rawAddressSymbols = new Set<string>();
  const moduleAliasTargets = new Map<string, EaExprNode>();

  const resolveScalarKind = (typeExpr: TypeExprNode, seen: Set<string> = new Set()) => {
    if (typeExpr.kind !== 'TypeName') return undefined;
    const lower = typeExpr.name.toLowerCase();
    if (lower === 'byte' || lower === 'word' || lower === 'addr') return lower;
    if (lower === 'ptr') return 'addr';
    if (seen.has(lower)) return undefined;
    seen.add(lower);
    const decl = resolveVisibleType(typeExpr.name, typeExpr.span.file, env);
    if (!decl || decl.kind !== 'TypeDecl') return undefined;
    return resolveScalarKind(decl.typeExpr, seen);
  };

  visitDeclTree(program.files.flatMap((file) => file.items), (item, ctx) => {
    const namedSection = ctx.section;
    switch (item.kind) {
      case 'VarBlock':
        if (item.scope !== 'module' || namedSection) return;
        for (const decl of item.decls) {
          const lower = decl.name.toLowerCase();
          if (decl.form === 'typed') storageTypes.set(lower, decl.typeExpr);
          else moduleAliasTargets.set(lower, decl.initializer.expr);
        }
        return;
      case 'DataBlock':
        for (const decl of item.decls) {
          const lower = decl.name.toLowerCase();
          storageTypes.set(lower, decl.typeExpr);
          if (!resolveScalarKind(decl.typeExpr)) rawAddressSymbols.add(lower);
        }
        return;
      case 'DataDecl': {
        if (namedSection && namedSection.section !== 'data') return;
        const lower = item.name.toLowerCase();
        storageTypes.set(lower, item.typeExpr);
        if (!resolveScalarKind(item.typeExpr)) rawAddressSymbols.add(lower);
        return;
      }
      case 'BinDecl':
      case 'HexDecl':
      case 'RawDataDecl':
        rawAddressSymbols.add(item.name.toLowerCase());
        return;
      default:
        return;
    }
  });

  return { storageTypes, rawAddressSymbols, moduleAliasTargets };
}

function collectFunctionLocals(decls: VarDeclNode[]) {
  const stackSlotTypes = new Map<string, TypeExprNode>();
  const localAliasTargets = new Map<string, EaExprNode>();
  for (const decl of decls) {
    const lower = decl.name.toLowerCase();
    if (decl.form === 'typed') stackSlotTypes.set(lower, decl.typeExpr);
    else localAliasTargets.set(lower, decl.initializer.expr);
  }
  return { stackSlotTypes, localAliasTargets };
}

function validateSuccPredInstruction(
  item: AsmInstructionNode,
  env: CompileEnv,
  storageTypes: Map<string, TypeExprNode>,
  rawAddressSymbols: Set<string>,
  moduleAliasTargets: Map<string, EaExprNode>,
  stackSlotTypes: Map<string, TypeExprNode>,
  localAliasTargets: Map<string, EaExprNode>,
  diagnostics: Diagnostic[],
): void {
  if ((item.head !== 'succ' && item.head !== 'pred') || item.operands.length !== 1) return;
  const operand = item.operands[0];
  if (operand?.kind !== 'Ea' || operand.explicitAddressOf) return;

  const helpers = createTypeResolutionHelpers({
    env,
    storageTypes,
    stackSlotTypes,
    rawAddressSymbols,
    moduleAliasTargets,
    getLocalAliasTargets: () => localAliasTargets,
  });

  const typeExpr = helpers.resolveEaTypeExpr(operand.expr);
  const scalar = helpers.resolveScalarTypeForLd(operand.expr);
  if (!scalar) {
    const detail = typeExpr ? helpers.typeDisplay(typeExpr) : 'unknown';
    diagAt(diagnostics, item.span, `"${item.head}" requires scalar storage; got ${detail}.`);
    return;
  }
  if (scalar !== 'byte' && scalar !== 'word') {
    diagAt(diagnostics, item.span, `"${item.head}" only supports byte and word scalar paths in this slice.`);
  }
}

function validateFunctionSuccPred(
  item: FuncDeclNode,
  env: CompileEnv,
  storageTypes: Map<string, TypeExprNode>,
  rawAddressSymbols: Set<string>,
  moduleAliasTargets: Map<string, EaExprNode>,
  diagnostics: Diagnostic[],
): void {
  const { stackSlotTypes, localAliasTargets } = collectFunctionLocals(item.locals.decls);
  for (const param of item.params) {
    stackSlotTypes.set(param.name.toLowerCase(), param.typeExpr);
  }
  for (const asmItem of item.asm.items) {
    if (asmItem.kind !== 'AsmInstruction') continue;
    validateSuccPredInstruction(
      asmItem,
      env,
      storageTypes,
      rawAddressSymbols,
      moduleAliasTargets,
      stackSlotTypes,
      localAliasTargets,
      diagnostics,
    );
  }
}

function validateOpSuccPred(item: OpDeclNode, diagnostics: Diagnostic[]): void {
  for (const asmItem of item.body.items) {
    if (
      asmItem.kind === 'AsmInstruction' &&
      (asmItem.head === 'succ' || asmItem.head === 'pred') &&
      asmItem.operands.length === 1 &&
      asmItem.operands[0]?.kind === 'Ea'
    ) {
      diagAt(
        diagnostics,
        asmItem.span,
        `"${asmItem.head}" typed-path forms are not supported inside ops in this slice.`,
      );
    }
  }
}

export function validateSuccPredAcceptance(
  program: ProgramNode,
  env: CompileEnv,
  diagnostics: Diagnostic[],
): void {
  const { storageTypes, rawAddressSymbols, moduleAliasTargets } = collectModuleStorage(program, env);

  for (const file of program.files) {
    visitDeclTree(file.items, (item) => {
      if (item.kind === 'FuncDecl') {
        validateFunctionSuccPred(
          item,
          env,
          storageTypes,
          rawAddressSymbols,
          moduleAliasTargets,
          diagnostics,
        );
        return;
      }
      if (item.kind === 'OpDecl') {
        validateOpSuccPred(item, diagnostics);
      }
    });
  }
}

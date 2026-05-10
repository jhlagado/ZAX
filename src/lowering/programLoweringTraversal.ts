import type {
  AlignDirectiveNode,
  BinDeclNode,
  ConstDeclNode,
  DataBlockNode,
  DataDeclNode,
  EnumDeclNode,
  ExternDeclNode,
  HexDeclNode,
  NamedSectionNode,
  RawDataDeclNode,
  SourceSpan,
  VarBlockNode,
} from '../frontend/ast.js';
import type { NamedSectionContributionSink } from './sectionContributions.js';
import type { LoweringContext, LoweringResult } from './programLowering.js';
import { sizeOfTypeExpr } from '../semantics/layout.js';
import { lowerDataBlock } from './programLoweringData.js';
import { createProgramLoweringDeclarationHelpers } from './programLoweringDeclarations.js';

const BINFROM_SYMBOL_NAME = '__zax_binfrom';

type ClassicNode = {
  kind: string;
  span: SourceSpan;
  name?: string;
  value?: import('../frontend/ast.js').ImmExprNode;
  expr?: import('../frontend/ast.js').ImmExprNode;
  directive?: 'db' | 'dw' | 'ds' | 'cstr' | 'pstr' | 'istr';
  values?: unknown[];
  size?: import('../frontend/ast.js').ImmExprNode;
  head?: string;
  operands?: import('../frontend/ast.js').AsmOperandNode[];
};

function isKind(item: { kind: string }, ...kinds: string[]): boolean {
  return kinds.includes(item.kind);
}

function isClassicEqu(item: { kind: string }): boolean {
  return isKind(item, 'ClassicEqu', 'ClassicEquDecl', 'EquDecl');
}

function isClassicOrg(item: { kind: string }): boolean {
  return isKind(item, 'ClassicOrg', 'ClassicOrgDirective', 'OrgDirective');
}

function isClassicAlign(item: { kind: string }): boolean {
  return isKind(item, 'ClassicAlign', 'ClassicAlignDirective');
}

function isClassicRawData(item: { kind: string }): boolean {
  return isKind(item, 'ClassicRawData', 'ClassicRawDataDecl') || 'valuesText' in item;
}

function isClassicBinFrom(item: { kind: string }): boolean {
  return isKind(item, 'ClassicBinFrom', 'ClassicBinFromDirective', 'BinFromDirective');
}

function isClassicEnd(item: { kind: string }): boolean {
  return isKind(item, 'ClassicEnd', 'ClassicEndDirective');
}

function classicExpr(item: ClassicNode): import('../frontend/ast.js').ImmExprNode | undefined {
  return item.value ?? item.expr;
}

function sinkOffsetRef(sink: NamedSectionContributionSink) {
  return {
    get current() {
      return sink.offset;
    },
    set current(value: number) {
      sink.offset = value;
    },
  };
}

function alignNamedSection(
  ctx: LoweringContext,
  sink: NamedSectionContributionSink,
  value: number,
): void {
  sink.offset = ctx.alignTo(sink.offset, value);
}

function lowerVarBlock(ctx: LoweringContext, varBlock: VarBlockNode): void {
  for (const decl of varBlock.decls) {
    if (decl.form !== 'typed') continue;
    const size = sizeOfTypeExpr(decl.typeExpr, ctx.env, ctx.diagnostics);
    if (size === undefined) continue;
    if (ctx.env.consts.has(decl.name)) {
      ctx.diag(ctx.diagnostics, decl.span.file, `Var name "${decl.name}" collides with a const.`);
      ctx.varOffsetRef.current += size;
      continue;
    }
    if (ctx.env.enums.has(decl.name)) {
      ctx.diag(
        ctx.diagnostics,
        decl.span.file,
        `Var name "${decl.name}" collides with an enum member.`,
      );
      ctx.varOffsetRef.current += size;
      continue;
    }
    if (ctx.env.types.has(decl.name)) {
      ctx.diag(
        ctx.diagnostics,
        decl.span.file,
        `Var name "${decl.name}" collides with a type name.`,
      );
      ctx.varOffsetRef.current += size;
      continue;
    }
    if (ctx.taken.has(decl.name)) {
      ctx.diag(
        ctx.diagnostics,
        decl.span.file,
        `Duplicate symbol name "${decl.name}" for var declaration.`,
      );
      ctx.varOffsetRef.current += size;
      continue;
    }
    ctx.taken.add(decl.name);
    ctx.pending.push({
      kind: 'var',
      name: decl.name,
      section: 'var',
      offset: ctx.varOffsetRef.current,
      file: decl.span.file,
      line: decl.span.start.line,
      scope: 'global',
      size,
    });
    ctx.varOffsetRef.current += size;
  }
}

function lowerExternDecl(ctx: LoweringContext, externDecl: ExternDeclNode): void {
  const baseLower = externDecl.base?.toLowerCase();
  if (baseLower !== undefined && !ctx.declaredBinNames.has(baseLower)) {
    ctx.diag(
      ctx.diagnostics,
      externDecl.span.file,
      `extern base "${externDecl.base}" does not reference a declared bin symbol.`,
    );
    return;
  }
  for (const fn of externDecl.funcs) {
    if (ctx.taken.has(fn.name)) {
      ctx.diag(ctx.diagnostics, fn.span.file, `Duplicate symbol name "${fn.name}".`);
      continue;
    }
    ctx.taken.add(fn.name);
    if (baseLower !== undefined) {
      const offset = ctx.evalImmExpr(fn.at, ctx.env, ctx.diagnostics);
      if (offset === undefined) {
        ctx.diag(
          ctx.diagnostics,
          fn.span.file,
          `Failed to evaluate extern func offset for "${fn.name}".`,
        );
        continue;
      }
      if (offset < 0 || offset > 0xffff) {
        ctx.diag(
          ctx.diagnostics,
          fn.span.file,
          `extern func "${fn.name}" offset out of range (0..65535).`,
        );
        continue;
      }
      ctx.deferredExterns.push({
        name: fn.name,
        baseLower,
        addend: offset,
        file: fn.span.file,
        line: fn.span.start.line,
      });
      continue;
    }
    const addr = ctx.evalImmExpr(fn.at, ctx.env, ctx.diagnostics);
    if (addr === undefined) {
      ctx.diag(
        ctx.diagnostics,
        fn.span.file,
        `Failed to evaluate extern func address for "${fn.name}".`,
      );
      continue;
    }
    if (addr < 0 || addr > 0xffff) {
      ctx.diag(
        ctx.diagnostics,
        fn.span.file,
        `extern func "${fn.name}" address out of range (0..65535).`,
      );
      continue;
    }
    ctx.symbols.push({
      kind: 'label',
      name: fn.name,
      address: addr,
      file: fn.span.file,
      line: fn.span.start.line,
      scope: 'global',
    });
  }
}

function lowerClassicEqu(ctx: LoweringContext, item: ClassicNode): void {
  if (!item.name) return;
  const value = ctx.env.consts.get(item.name) ?? ctx.env.consts.get(item.name.toLowerCase());
  if (value === undefined) return;
  const lower = item.name.toLowerCase();
  if (ctx.taken.has(lower)) {
    ctx.diag(ctx.diagnostics, item.span.file, `Duplicate symbol name "${item.name}".`);
    return;
  }
  ctx.taken.add(lower);
  ctx.symbols.push({
    kind: 'constant',
    name: item.name,
    value,
    address: value & 0xffff,
    file: item.span.file,
    line: item.span.start.line,
    scope: 'global',
  });
  ctx.recordLoweredAsmItem(
    { kind: 'const', name: item.name, value: { kind: 'literal', value } },
    item.span,
  );
}

function lowerClassicOrg(ctx: LoweringContext, item: ClassicNode): void {
  const expr = classicExpr(item);
  if (!expr) {
    ctx.diag(ctx.diagnostics, item.span.file, `Missing org address.`);
    return;
  }
  const target = ctx.evalImmExpr(expr, ctx.env, ctx.diagnostics);
  if (target === undefined) {
    ctx.diag(ctx.diagnostics, item.span.file, `Failed to evaluate org address.`);
    return;
  }
  if (target < 0 || target > 0xffff) {
    ctx.diag(ctx.diagnostics, item.span.file, `org address out of range (0..65535).`);
    return;
  }
  ctx.activeSectionRef.current = 'code';
  if (ctx.codeOffsetRef.current === 0 && ctx.baseExprs.code === undefined) {
    ctx.baseExprs.code = expr;
    return;
  }
  const base = ctx.baseExprs.code
    ? ctx.evalImmExpr(ctx.baseExprs.code, ctx.env, ctx.diagnostics)
    : 0;
  if (base === undefined) {
    ctx.diag(ctx.diagnostics, item.span.file, `Failed to evaluate current code base address.`);
    return;
  }
  const offset = target - base;
  if (offset < 0 || offset > 0xffff) {
    ctx.diag(
      ctx.diagnostics,
      item.span.file,
      `org address is outside the current code placement range.`,
    );
    return;
  }
  if (offset < ctx.codeOffsetRef.current) {
    ctx.diag(ctx.diagnostics, item.span.file, `org address overlaps earlier emitted code.`);
    return;
  }
  const gap = offset - ctx.codeOffsetRef.current;
  if (gap > 0) {
    ctx.recordLoweredAsmItem({ kind: 'ds', size: { kind: 'literal', value: gap } }, item.span);
    ctx.codeOffsetRef.current = offset;
  }
}

function lowerClassicAlign(ctx: LoweringContext, item: ClassicNode): void {
  const expr = classicExpr(item);
  if (!expr) {
    ctx.diag(ctx.diagnostics, item.span.file, `Missing align value.`);
    return;
  }
  const value = ctx.evalImmExpr(expr, ctx.env, ctx.diagnostics);
  if (value === undefined) {
    ctx.diag(ctx.diagnostics, item.span.file, `Failed to evaluate align value.`);
    return;
  }
  if (value <= 0) {
    ctx.diag(ctx.diagnostics, item.span.file, `align value must be > 0.`);
    return;
  }
  if (ctx.activeSectionRef.current === 'data') {
    ctx.dataOffsetRef.current = ctx.alignTo(ctx.dataOffsetRef.current, value);
    return;
  }
  const base = ctx.baseExprs.code
    ? ctx.evalImmExpr(ctx.baseExprs.code, ctx.env, ctx.diagnostics)
    : 0;
  if (base === undefined) {
    ctx.diag(ctx.diagnostics, item.span.file, `Failed to evaluate current code base address.`);
    return;
  }
  const currentAddress = base + ctx.codeOffsetRef.current;
  const alignedAddress = ctx.alignTo(currentAddress, value);
  const alignedOffset = alignedAddress - base;
  const gap = alignedOffset - ctx.codeOffsetRef.current;
  if (gap > 0) {
    ctx.recordLoweredAsmItem(
      {
        kind: 'ds',
        size: { kind: 'literal', value: gap },
        fill: { kind: 'literal', value: 0 },
      },
      item.span,
    );
  }
  while (ctx.codeOffsetRef.current < alignedOffset) {
    const offset = ctx.codeOffsetRef.current;
    ctx.codeBytes.set(offset, 0);
    ctx.codeOffsetRef.current = offset + 1;
  }
}

function lowerClassicLabel(ctx: LoweringContext, item: ClassicNode): void {
  if (!item.name) return;
  const lower = item.name.toLowerCase();
  if (ctx.taken.has(lower)) {
    ctx.diag(ctx.diagnostics, item.span.file, `Duplicate symbol name "${item.name}".`);
    return;
  }
  ctx.taken.add(lower);
  ctx.pending.push({
    kind: 'label',
    name: item.name,
    section: ctx.activeSectionRef.current,
    offset:
      ctx.activeSectionRef.current === 'data'
        ? ctx.dataOffsetRef.current
        : ctx.codeOffsetRef.current,
    file: item.span.file,
    line: item.span.start.line,
    scope: 'global',
  });
  ctx.recordLoweredAsmItem({ kind: 'label', name: item.name }, item.span);
}

function lowerClassicInstruction(ctx: LoweringContext, item: ClassicNode): void {
  if (!item.head || !item.operands) return;
  const head = item.head.toLowerCase();
  const first = item.operands[0];
  if (head === 'jp' && item.operands.length === 1 && first?.kind === 'Imm') {
    const symbolic = ctx.symbolicTargetFromExpr(first.expr);
    if (symbolic) {
      ctx.emitAbs16Fixup(0xc3, symbolic.baseLower, symbolic.addend, item.span);
      return;
    }
  }
  ctx.emitInstr(item.head, item.operands, item.span);
}

function lowerClassicBinFrom(ctx: LoweringContext, item: ClassicNode): void {
  const expr = classicExpr(item);
  if (!expr) {
    ctx.diag(ctx.diagnostics, item.span.file, `Missing binfrom address.`);
    return;
  }
  const value = ctx.evalImmExpr(expr, ctx.env, ctx.diagnostics);
  if (value === undefined) {
    ctx.diag(ctx.diagnostics, item.span.file, `Failed to evaluate binfrom address.`);
    return;
  }
  if (value < 0 || value > 0xffff) {
    ctx.diag(ctx.diagnostics, item.span.file, `binfrom address out of range (0..65535).`);
    return;
  }
  const existing = ctx.symbols.find(
    (symbol) => symbol.kind === 'constant' && symbol.name === BINFROM_SYMBOL_NAME,
  );
  if (existing?.kind === 'constant') {
    existing.value = value;
    existing.address = value;
    return;
  }
  ctx.symbols.push({
    kind: 'constant',
    name: BINFROM_SYMBOL_NAME,
    value,
    address: value,
    file: item.span.file,
    line: item.span.start.line,
    scope: 'global',
  });
}

function lowerItem(
  ctx: LoweringContext,
  lowerBinDecl: ReturnType<typeof createProgramLoweringDeclarationHelpers>['lowerBinDecl'],
  lowerRawDataDecl: ReturnType<typeof createProgramLoweringDeclarationHelpers>['lowerRawDataDecl'],
  lowerClassicRawDataDecl: ReturnType<
    typeof createProgramLoweringDeclarationHelpers
  >['lowerClassicRawDataDecl'],
  item: any,
  namedSection?: { node: NamedSectionNode; sink: NamedSectionContributionSink },
): void {
  if (isClassicEqu(item)) {
    lowerClassicEqu(ctx, item as ClassicNode);
    return;
  }
  if (isClassicOrg(item)) {
    lowerClassicOrg(ctx, item as ClassicNode);
    return;
  }
  if (isClassicAlign(item)) {
    lowerClassicAlign(ctx, item as ClassicNode);
    return;
  }
  if (isClassicBinFrom(item)) {
    lowerClassicBinFrom(ctx, item as ClassicNode);
    return;
  }
  if (item.kind === 'AsmLabel') {
    lowerClassicLabel(ctx, item as unknown as ClassicNode);
    return;
  }
  if (item.kind === 'AsmInstruction') {
    lowerClassicInstruction(ctx, item as unknown as ClassicNode);
    return;
  }
  if (isClassicRawData(item)) {
    lowerClassicRawDataDecl(item as Parameters<typeof lowerClassicRawDataDecl>[0], namedSection);
    return;
  }

  if (item.kind === 'NamedSection') {
    const sectionNode = item as NamedSectionNode;
    const sink = ctx.namedSectionSinksByNode.get(sectionNode);
    if (!sink) return;
    const prevSection = ctx.activeSectionRef.current;
    ctx.activeSectionRef.current = sectionNode.section;
    ctx.withNamedSectionSink(sink, () => {
      for (const sectionItem of sectionNode.items) {
        lowerItem(ctx, lowerBinDecl, lowerRawDataDecl, lowerClassicRawDataDecl, sectionItem, {
          node: sectionNode,
          sink,
        });
      }
    });
    ctx.activeSectionRef.current = prevSection;
    return;
  }

  if (item.kind === 'ConstDecl') {
    const constItem = item as ConstDeclNode;
    const value = ctx.env.consts.get(constItem.name);
    if (value !== undefined) {
      if (ctx.taken.has(constItem.name)) {
        ctx.diag(
          ctx.diagnostics,
          constItem.span.file,
          `Duplicate symbol name "${constItem.name}".`,
        );
        return;
      }
      ctx.taken.add(constItem.name);
      ctx.symbols.push({
        kind: 'constant',
        name: constItem.name,
        value,
        address: value & 0xffff,
        file: constItem.span.file,
        line: constItem.span.start.line,
        scope: 'global',
      });
      ctx.recordLoweredAsmItem(
        {
          kind: 'const',
          name: constItem.name,
          value: { kind: 'literal', value },
        },
        constItem.span,
      );
    }
    return;
  }

  if (item.kind === 'EnumDecl') {
    const enumDecl = item as EnumDeclNode;
    for (let idx = 0; idx < enumDecl.members.length; idx++) {
      const member = enumDecl.members[idx]!;
      const name = `${enumDecl.name}.${member}`;
      if (ctx.env.enums.get(name) !== idx) continue;
      if (ctx.taken.has(name)) {
        ctx.diag(ctx.diagnostics, enumDecl.span.file, `Duplicate symbol name "${name}".`);
        continue;
      }
      ctx.taken.add(name);
      ctx.symbols.push({
        kind: 'constant',
        name,
        value: idx,
        address: idx & 0xffff,
        file: enumDecl.span.file,
        line: enumDecl.span.start.line,
        scope: 'global',
      });
    }
    return;
  }

  if (item.kind === 'Align') {
    const align = item as AlignDirectiveNode;
    const value = ctx.evalImmExpr(align.value, ctx.env, ctx.diagnostics);
    if (value === undefined) {
      ctx.diag(ctx.diagnostics, align.span.file, `Failed to evaluate align value.`);
      return;
    }
    if (value <= 0) {
      ctx.diag(ctx.diagnostics, align.span.file, `align value must be > 0.`);
      return;
    }
    const current = namedSection
      ? namedSection.sink.offset
      : ctx.activeSectionRef.current === 'code'
        ? ctx.codeOffsetRef.current
        : ctx.activeSectionRef.current === 'data'
          ? ctx.dataOffsetRef.current
          : ctx.varOffsetRef.current;
    const aligned = ctx.alignTo(current, value);
    const pad = aligned - current;
    if (pad > 0) {
      ctx.recordLoweredAsmItem({ kind: 'ds', size: { kind: 'literal', value: pad } }, align.span);
    }
    if (namedSection) alignNamedSection(ctx, namedSection.sink, value);
    else ctx.advanceAlign(value);
    return;
  }

  if (item.kind === 'ExternDecl') {
    lowerExternDecl(ctx, item as ExternDeclNode);
    return;
  }

  if (item.kind === 'BinDecl') {
    lowerBinDecl(item as BinDeclNode, namedSection);
    return;
  }

  if (item.kind === 'HexDecl') {
    const hexDecl = item as HexDeclNode;
    if (ctx.taken.has(hexDecl.name)) {
      ctx.diag(ctx.diagnostics, hexDecl.span.file, `Duplicate symbol name "${hexDecl.name}".`);
      return;
    }
    ctx.taken.add(hexDecl.name);
    const parsed = ctx.loadHexInput(
      hexDecl.span.file,
      hexDecl.fromPath,
      ctx.includeDirs,
      (file, message) => ctx.diag(ctx.diagnostics, file, message),
    );
    if (!parsed) return;
    for (const [addr, byte] of parsed.bytes) {
      if (ctx.hexBytes.has(addr)) {
        ctx.diag(ctx.diagnostics, hexDecl.span.file, `HEX overlap at address ${addr}.`);
        continue;
      }
      ctx.hexBytes.set(addr, byte);
    }
    ctx.absoluteSymbols.push({
      kind: 'data',
      name: hexDecl.name,
      address: parsed.minAddress,
      file: hexDecl.span.file,
      line: hexDecl.span.start.line,
      scope: 'global',
    });
    return;
  }

  if (item.kind === 'OpDecl') {
    const op = item as import('../frontend/ast.js').OpDeclNode;
    const key = op.name.toLowerCase();
    if (ctx.taken.has(op.name) && !ctx.declaredOpNames.has(key)) {
      ctx.diag(ctx.diagnostics, op.span.file, `Duplicate symbol name "${op.name}".`);
    } else {
      ctx.taken.add(op.name);
      ctx.declaredOpNames.add(key);
    }
    return;
  }

  if (item.kind === 'FuncDecl') {
    if (namedSection && namedSection.node.section !== 'code') {
      ctx.diag(
        ctx.diagnostics,
        item.span.file,
        `Function "${item.name}" is not allowed inside data section "${namedSection.node.name}".`,
      );
      return;
    }
    ctx.lowerFunctionDecl({
      ...ctx,
      item,
      ...(namedSection ? { pending: namedSection.sink.pendingSymbols } : {}),
    });
    return;
  }

  if (item.kind === 'DataBlock') {
    if (namedSection && namedSection.node.section !== 'data') {
      ctx.diag(
        ctx.diagnostics,
        item.span.file,
        `Data declarations are not allowed inside code section "${namedSection.node.name}".`,
      );
      return;
    }
    if (namedSection) {
      lowerDataBlock(ctx, item as DataBlockNode, {
        section: namedSection.node.section,
        bytes: namedSection.sink.bytes,
        offsetRef: sinkOffsetRef(namedSection.sink),
        pending: namedSection.sink.pendingSymbols,
        startupInitActions: namedSection.sink.startupInitActions,
      });
    } else {
      lowerDataBlock(ctx, item as DataBlockNode);
    }
    return;
  }

  if (item.kind === 'DataDecl') {
    if (!namedSection || namedSection.node.section !== 'data') {
      const sectionName = namedSection?.node.name ?? 'module scope';
      ctx.diag(
        ctx.diagnostics,
        item.span.file,
        `Data declarations are only allowed inside data sections${namedSection ? ` like "${sectionName}"` : ''}.`,
      );
      return;
    }
    lowerDataBlock(
      ctx,
      {
        kind: 'DataBlock',
        span: item.span,
        decls: [item as DataDeclNode],
      },
      {
        section: namedSection.node.section,
        bytes: namedSection.sink.bytes,
        offsetRef: sinkOffsetRef(namedSection.sink),
        pending: namedSection.sink.pendingSymbols,
        startupInitActions: namedSection.sink.startupInitActions,
      },
    );
    return;
  }

  if (item.kind === 'RawDataDecl') {
    lowerRawDataDecl(item as RawDataDeclNode, namedSection);
    return;
  }

  if (item.kind === 'VarBlock' && item.scope === 'module') {
    if (namedSection) {
      ctx.diag(
        ctx.diagnostics,
        item.span.file,
        `Module-scope var blocks are not allowed inside named section "${namedSection.node.name}".`,
      );
      return;
    }
    lowerVarBlock(ctx, item as VarBlockNode);
  }
}

export function lowerProgramDeclarations(ctx: LoweringContext): LoweringResult {
  const { lowerBinDecl, lowerRawDataDecl, lowerClassicRawDataDecl } =
    createProgramLoweringDeclarationHelpers(ctx);

  for (const module of ctx.program.files) {
    ctx.activeSectionRef.current = 'code';
    let classicEnded = false;
    for (const item of module.items) {
      if (isClassicEnd(item)) {
        classicEnded = true;
        continue;
      }
      if (classicEnded && !isClassicBinFrom(item)) continue;
      lowerItem(ctx, lowerBinDecl, lowerRawDataDecl, lowerClassicRawDataDecl, item);
    }
  }

  return {
    codeOffset: ctx.codeOffsetRef.current,
    dataOffset: ctx.dataOffsetRef.current,
    varOffset: ctx.varOffsetRef.current,
    pending: ctx.pending,
    symbols: ctx.symbols,
    absoluteSymbols: ctx.absoluteSymbols,
    deferredExterns: ctx.deferredExterns,
    codeBytes: ctx.codeBytes,
    dataBytes: ctx.dataBytes,
    hexBytes: ctx.hexBytes,
  };
}

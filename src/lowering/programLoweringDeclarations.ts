import type {
  BinDeclNode,
  ImmExprNode,
  NamedSectionNode,
  RawDataDeclNode,
  SourceSpan,
} from '../frontend/ast.js';
import type { NamedSectionContributionSink } from './sectionContributions.js';

import type { Context } from './programLowering.js';
import type { SectionKind } from './loweringTypes.js';

type NamedSectionTarget = { node: NamedSectionNode; sink: NamedSectionContributionSink };
type RawValueLike =
  | ImmExprNode
  | string
  | {
      kind: string;
      value?: unknown;
      text?: unknown;
    };

type RawDataLike = {
  span: SourceSpan;
  name?: string;
  directive: 'db' | 'dw' | 'ds' | 'cstr' | 'pstr' | 'istr';
  values?: RawValueLike[];
  size?: ImmExprNode;
};

function rawStringValue(value: RawValueLike): string | undefined {
  if (typeof value === 'string') return value;
  if (!('kind' in value)) return undefined;
  if (
    value.kind === 'ClassicString' ||
    value.kind === 'StringLiteral' ||
    value.kind === 'RawString'
  ) {
    return typeof value.value === 'string'
      ? value.value
      : typeof value.text === 'string'
        ? value.text
        : undefined;
  }
  return undefined;
}

function rawImmValue(value: RawValueLike): ImmExprNode | undefined {
  if (typeof value === 'string') return undefined;
  if (!('kind' in value)) return undefined;
  return value.kind.startsWith('Imm') ? (value as ImmExprNode) : undefined;
}

export function createProgramLoweringDeclarationHelpers(ctx: Context): {
  lowerBinDecl: (binDecl: BinDeclNode, namedSection?: NamedSectionTarget) => void;
  lowerRawDataDecl: (decl: RawDataDeclNode, namedSection?: NamedSectionTarget) => void;
  lowerClassicRawDataDecl: (decl: RawDataLike, namedSection?: NamedSectionTarget) => void;
} {
  const symbolicTargetFromExpr = (
    expr: ImmExprNode,
  ): { baseLower: string; addend: number } | undefined => {
    if (expr.kind === 'ImmName') return { baseLower: expr.name.toLowerCase(), addend: 0 };
    if (expr.kind !== 'ImmBinary') return undefined;
    if (expr.op !== '+' && expr.op !== '-') return undefined;

    const leftName = expr.left.kind === 'ImmName' ? expr.left.name.toLowerCase() : undefined;
    const rightName = expr.right.kind === 'ImmName' ? expr.right.name.toLowerCase() : undefined;

    if (leftName) {
      const right = ctx.evalImmExpr(expr.right, ctx.env, ctx.diagnostics);
      if (right === undefined) return undefined;
      return { baseLower: leftName, addend: expr.op === '+' ? right : -right };
    }

    if (expr.op === '+' && rightName) {
      const left = ctx.evalImmExpr(expr.left, ctx.env, ctx.diagnostics);
      if (left === undefined) return undefined;
      return { baseLower: rightName, addend: left };
    }

    return undefined;
  };

  const lowerBinDecl = (binDecl: BinDeclNode, namedSection?: NamedSectionTarget): void => {
    const withTempSection = (section: SectionKind, fn: () => void): void => {
      const prev = ctx.activeSectionRef.current;
      ctx.activeSectionRef.current = section;
      try {
        fn();
      } finally {
        ctx.activeSectionRef.current = prev;
      }
    };

    if (ctx.taken.has(binDecl.name)) {
      ctx.diag(ctx.diagnostics, binDecl.span.file, `Duplicate symbol name "${binDecl.name}".`);
      return;
    }
    ctx.taken.add(binDecl.name);
    const blob = ctx.loadBinInput(
      binDecl.span.file,
      binDecl.fromPath,
      ctx.includeDirs,
      (file, message) => ctx.diag(ctx.diagnostics, file, message),
    );
    if (!blob) return;
    if (binDecl.section === 'var') {
      ctx.diag(
        ctx.diagnostics,
        binDecl.span.file,
        `bin declarations cannot target section "var" in v0.2.`,
      );
      return;
    }
    if (namedSection) {
      const targetSection = namedSection.node.section;
      if (binDecl.section !== targetSection) {
        ctx.diag(
          ctx.diagnostics,
          binDecl.span.file,
          `bin declaration "${binDecl.name}" section "${binDecl.section}" does not match enclosing named section "${targetSection} ${namedSection.node.name}".`,
        );
        return;
      }
      namedSection.sink.pendingSymbols.push({
        kind: 'data',
        name: binDecl.name,
        section: targetSection,
        offset: namedSection.sink.offset,
        file: binDecl.span.file,
        line: binDecl.span.start.line,
        scope: 'global',
      });
      ctx.recordLoweredAsmItem({ kind: 'label', name: binDecl.name }, binDecl.span);
      for (const b of blob) {
        namedSection.sink.bytes.set(namedSection.sink.offset++, b & 0xff);
        ctx.recordLoweredAsmItem(
          { kind: 'db', values: [{ kind: 'literal', value: b & 0xff }] },
          binDecl.span,
        );
      }
      return;
    }
    if (binDecl.section === 'code') {
      ctx.pending.push({
        kind: 'data',
        name: binDecl.name,
        section: 'code',
        offset: ctx.codeOffsetRef.current,
        file: binDecl.span.file,
        line: binDecl.span.start.line,
        scope: 'global',
      });
      withTempSection('code', () => {
        ctx.recordLoweredAsmItem({ kind: 'label', name: binDecl.name }, binDecl.span);
        for (const b of blob) {
          ctx.codeBytes.set(ctx.codeOffsetRef.current++, b & 0xff);
          ctx.recordLoweredAsmItem(
            { kind: 'db', values: [{ kind: 'literal', value: b & 0xff }] },
            binDecl.span,
          );
        }
      });
      return;
    }
    ctx.pending.push({
      kind: 'data',
      name: binDecl.name,
      section: 'data',
      offset: ctx.dataOffsetRef.current,
      file: binDecl.span.file,
      line: binDecl.span.start.line,
      scope: 'global',
    });
    withTempSection('data', () => {
      ctx.recordLoweredAsmItem({ kind: 'label', name: binDecl.name }, binDecl.span);
      for (const b of blob) {
        ctx.dataBytes.set(ctx.dataOffsetRef.current++, b & 0xff);
        ctx.recordLoweredAsmItem(
          { kind: 'db', values: [{ kind: 'literal', value: b & 0xff }] },
          binDecl.span,
        );
      }
    });
  };

  const lowerRawDataDecl = (decl: RawDataDeclNode, namedSection?: NamedSectionTarget): void => {
    if (!namedSection || namedSection.node.section !== 'data') {
      const sectionName = namedSection?.node.name ?? 'module scope';
      ctx.diag(
        ctx.diagnostics,
        decl.span.file,
        `Raw data declarations are only allowed inside data sections${namedSection ? ` like "${sectionName}"` : ''}.`,
      );
      return;
    }

    if (decl.name.length > 0) {
      const okToDeclareSymbol = !ctx.taken.has(decl.name);
      if (!okToDeclareSymbol) {
        ctx.diag(ctx.diagnostics, decl.span.file, `Duplicate symbol name "${decl.name}".`);
      } else {
        ctx.taken.add(decl.name);
        namedSection.sink.pendingSymbols.push({
          kind: 'data',
          name: decl.name,
          section: namedSection.node.section,
          offset: namedSection.sink.offset,
          file: decl.span.file,
          line: decl.span.start.line,
          scope: 'global',
        });
        ctx.recordLoweredAsmItem({ kind: 'label', name: decl.name }, decl.span);
      }
    }

    const emitByte = (b: number): void => {
      namedSection.sink.bytes.set(namedSection.sink.offset, b & 0xff);
      namedSection.sink.offset++;
      ctx.recordLoweredAsmItem(
        { kind: 'db', values: [{ kind: 'literal', value: b & 0xff }] },
        decl.span,
      );
    };
    const emitByteNoRecord = (b: number): void => {
      namedSection.sink.bytes.set(namedSection.sink.offset, b & 0xff);
      namedSection.sink.offset++;
    };
    const emitWord = (w: number): void => {
      namedSection.sink.bytes.set(namedSection.sink.offset, w & 0xff);
      namedSection.sink.offset++;
      namedSection.sink.bytes.set(namedSection.sink.offset, (w >> 8) & 0xff);
      namedSection.sink.offset++;
      ctx.recordLoweredAsmItem(
        { kind: 'dw', values: [{ kind: 'literal', value: w & 0xffff }] },
        decl.span,
      );
    };

    if (decl.directive === 'ds') {
      const size = ctx.evalImmExpr(decl.size, ctx.env, ctx.diagnostics);
      if (size === undefined) {
        ctx.diag(
          ctx.diagnostics,
          decl.span.file,
          `Failed to evaluate raw data size for "${decl.name}".`,
        );
        return;
      }
      if (size < 0) {
        ctx.diag(
          ctx.diagnostics,
          decl.span.file,
          `Raw data size for "${decl.name}" must be non-negative.`,
        );
        return;
      }
      ctx.recordLoweredAsmItem(
        {
          kind: 'ds',
          size: ctx.lowerImmExprForLoweredAsm(decl.size),
          fill: { kind: 'literal', value: 0 },
        },
        decl.span,
      );
      for (let i = 0; i < size; i++) emitByteNoRecord(0);
      return;
    }

    for (const value of decl.values) {
      const v = ctx.evalImmExpr(value, ctx.env, ctx.diagnostics);
      if (v !== undefined) {
        if (decl.directive === 'db') emitByte(v);
        else emitWord(v);
        continue;
      }
      if (decl.directive === 'dw') {
        const symbolic = symbolicTargetFromExpr(value);
        if (symbolic) {
          namedSection.sink.fixups.push({
            offset: namedSection.sink.offset,
            baseLower: symbolic.baseLower,
            addend: symbolic.addend,
            file: decl.span.file,
          });
          emitWord(0);
          continue;
        }
      }
      ctx.diag(
        ctx.diagnostics,
        decl.span.file,
        `Failed to evaluate raw data value for "${decl.name}".`,
      );
      if (decl.directive === 'db') emitByte(0);
      else emitWord(0);
    }
  };

  const lowerClassicRawDataDecl = (decl: RawDataLike, namedSection?: NamedSectionTarget): void => {
    const activeSection = namedSection?.node.section ?? ctx.activeSectionRef.current;
    if (activeSection === 'var') {
      ctx.diag(
        ctx.diagnostics,
        decl.span.file,
        `Raw data declarations cannot target section "var".`,
      );
      return;
    }

    const name = decl.name ?? '';
    if (name.length > 0) {
      const lower = name.toLowerCase();
      if (ctx.taken.has(lower)) {
        const alreadyPending = ctx.pending.some((symbol) => symbol.name.toLowerCase() === lower);
        if (!alreadyPending) ctx.diag(ctx.diagnostics, decl.span.file, `Duplicate symbol name "${name}".`);
      } else {
        ctx.taken.add(lower);
        const offset =
          namedSection?.sink.offset ??
          (activeSection === 'code' ? ctx.codeOffsetRef.current : ctx.dataOffsetRef.current);
        const pending = {
          kind: 'label' as const,
          name,
          section: activeSection,
          offset,
          file: decl.span.file,
          line: decl.span.start.line,
          scope: 'global' as const,
        };
        if (namedSection) namedSection.sink.pendingSymbols.push(pending);
        else ctx.pending.push(pending);
        ctx.recordLoweredAsmItem({ kind: 'label', name }, decl.span);
      }
    }

    const writeByte = (value: number): void => {
      if (namedSection) {
        namedSection.sink.bytes.set(namedSection.sink.offset++, value & 0xff);
        return;
      }
      if (activeSection === 'code') {
        const offset = ctx.codeOffsetRef.current;
        ctx.codeBytes.set(offset, value & 0xff);
        ctx.codeOffsetRef.current = offset + 1;
      } else {
        const offset = ctx.dataOffsetRef.current;
        ctx.dataBytes.set(offset, value & 0xff);
        ctx.dataOffsetRef.current = offset + 1;
      }
    };

    const writeWord = (value: number): void => {
      writeByte(value & 0xff);
      writeByte((value >> 8) & 0xff);
    };

    if (decl.directive === 'ds') {
      if (!decl.size) {
        ctx.diag(ctx.diagnostics, decl.span.file, `Raw data size is missing for "${name}".`);
        return;
      }
      const size = ctx.evalImmExpr(decl.size, ctx.env, ctx.diagnostics);
      if (size === undefined || size < 0) {
        ctx.diag(
          ctx.diagnostics,
          decl.span.file,
          `Failed to evaluate raw data size for "${name}".`,
        );
        return;
      }
      ctx.recordLoweredAsmItem(
        {
          kind: 'ds',
          size: ctx.lowerImmExprForLoweredAsm(decl.size),
          fill: { kind: 'literal', value: 0 },
        },
        decl.span,
      );
      for (let i = 0; i < size; i++) writeByte(0);
      return;
    }

    if (decl.directive === 'cstr' || decl.directive === 'pstr' || decl.directive === 'istr') {
      const stringValue = rawStringValue((decl.values ?? [])[0] ?? '');
      if (stringValue === undefined) {
        ctx.diag(ctx.diagnostics, decl.span.file, `"${decl.directive}" expects a string value.`);
        return;
      }
      const bytes = [...stringValue].map((char) => char.codePointAt(0) ?? 0);
      const emittedBytes: number[] = [];
      const writeStringByte = (value: number): void => {
        const byte = value & 0xff;
        writeByte(byte);
        emittedBytes.push(byte);
      };
      if (decl.directive === 'cstr') {
        for (const byte of bytes) writeStringByte(byte);
        writeStringByte(0);
      } else if (decl.directive === 'pstr') {
        writeStringByte(bytes.length);
        for (const byte of bytes) writeStringByte(byte);
      } else if (bytes.length > 0) {
        for (let i = 0; i < bytes.length; i++) {
          const isLast = i === bytes.length - 1;
          writeStringByte(bytes[i]! | (isLast ? 0x80 : 0));
        }
      }
      if (emittedBytes.length > 0) {
        ctx.recordLoweredAsmItem(
          {
            kind: 'db',
            values: emittedBytes.map((value) => ({ kind: 'literal', value })),
          },
          decl.span,
        );
      }
      return;
    }

    const loweredValues: ReturnType<Context['lowerImmExprForLoweredAsm']>[] = [];
    for (const value of decl.values ?? []) {
      const stringValue = rawStringValue(value);
      if (stringValue !== undefined) {
        if (decl.directive !== 'db') {
          ctx.diag(
            ctx.diagnostics,
            decl.span.file,
            `String raw data values are only valid for "db".`,
          );
          continue;
        }
        for (const char of stringValue) {
          const byte = char.codePointAt(0) ?? 0;
          writeByte(byte);
          loweredValues.push({ kind: 'literal', value: byte & 0xff });
        }
        continue;
      }

      const imm = rawImmValue(value);
      if (!imm) {
        ctx.diag(
          ctx.diagnostics,
          decl.span.file,
          `Failed to evaluate raw data value for "${name}".`,
        );
        if (decl.directive === 'db') writeByte(0);
        else writeWord(0);
        continue;
      }

      loweredValues.push(ctx.lowerImmExprForLoweredAsm(imm));
      const evaluated = ctx.evalImmExpr(imm, ctx.env, ctx.diagnostics);
      if (evaluated !== undefined) {
        if (decl.directive === 'db') writeByte(evaluated);
        else writeWord(evaluated);
        continue;
      }

      const symbolic = symbolicTargetFromExpr(imm);
      if (decl.directive === 'dw' && symbolic && namedSection) {
        namedSection.sink.fixups.push({
          offset: namedSection.sink.offset,
          baseLower: symbolic.baseLower,
          addend: symbolic.addend,
          file: decl.span.file,
        });
      }
      if (decl.directive === 'db') writeByte(0);
      else writeWord(0);
    }

    ctx.recordLoweredAsmItem(
      decl.directive === 'db'
        ? { kind: 'db', values: loweredValues }
        : { kind: 'dw', values: loweredValues },
      decl.span,
    );
  };

  return { lowerBinDecl, lowerRawDataDecl, lowerClassicRawDataDecl };
}

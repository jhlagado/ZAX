import type { Diagnostic } from '../diagnosticTypes.js';
import type { ImmExprNode } from '../frontend/ast.js';
import { evalImmExpr as evalImmExprWithEnv, type CompileEnv } from '../semantics/env.js';
import type { LoweredAsmBlock, LoweredAsmProgram, LoweredAsmItem, LoweredImmExpr } from './loweredAsmTypes.js';
import type { SectionKind } from './loweringTypes.js';

export type LoweredAsmByteEmissionContext = {
  diagnostics: Diagnostic[];
  diag: (diagnostics: Diagnostic[], file: string, message: string) => void;
  primaryFile: string;
  env: CompileEnv;
};

export type LoweredAsmByteEmissionResult = {
  codeBytes: Map<number, number>;
  dataBytes: Map<number, number>;
  namedBytesByKey: Map<string, Map<number, number>>;
  blockSizesByKey: Map<string, number>;
  maxAddress: number;
};

const toByte = (value: number): number => value & 0xff;
const toWord = (value: number): number => value & 0xffff;

function evalLoweredImmExpr(expr: LoweredImmExpr, env: CompileEnv): number | undefined {
  const evalClassicAliasExpr = (
    classicExpr: ImmExprNode,
    visiting: Set<string>,
    currentLocation?: number,
  ): number | undefined => {
    const value =
      currentLocation === undefined
        ? evalImmExprWithEnv(classicExpr, env)
        : evalImmExprWithEnv(classicExpr, env, undefined, { currentLocation });
    if (value !== undefined) return value;

    switch (classicExpr.kind) {
      case 'ImmCurrentLocation':
        return currentLocation;
      case 'ImmName':
        return evalClassicAliasSymbol(classicExpr.name, visiting);
      case 'ImmUnary': {
        const v = evalClassicAliasExpr(classicExpr.expr, visiting, currentLocation);
        if (v === undefined) return undefined;
        switch (classicExpr.op) {
          case '+':
            return +v;
          case '-':
            return -v;
          case '~':
            return ~v;
        }
        return undefined;
      }
      case 'ImmBinary': {
        const left = evalClassicAliasExpr(classicExpr.left, visiting, currentLocation);
        const right = evalClassicAliasExpr(classicExpr.right, visiting, currentLocation);
        if (left === undefined || right === undefined) return undefined;
        switch (classicExpr.op) {
          case '*':
            return left * right;
          case '/':
            return right === 0 ? undefined : Math.trunc(left / right);
          case '%':
            return right === 0 ? undefined : left % right;
          case '+':
            return left + right;
          case '-':
            return left - right;
          case '&':
            return left & right;
          case '^':
            return left ^ right;
          case '|':
            return left | right;
          case '<<':
            return left << right;
          case '>>':
            return left >> right;
        }
        return undefined;
      }
      default:
        return undefined;
    }
  };

  const evalClassicAliasSymbol = (name: string, visiting = new Set<string>()): number | undefined => {
    const direct = env.consts.get(name) ?? env.enums.get(name);
    if (direct !== undefined) return direct;
    const lower = name.toLowerCase();
    const alt = env.consts.get(lower) ?? env.enums.get(lower);
    if (alt !== undefined) return alt;
    const equ = env.classicEquExprs?.get(name) ?? env.classicEquExprs?.get(lower);
    if (!equ || visiting.has(lower)) return undefined;
    visiting.add(lower);
    const value = evalClassicAliasExpr(equ.expr, visiting, equ.currentLocation);
    if (value !== undefined) env.consts.set(lower, value);
    return value;
  };

  switch (expr.kind) {
    case 'literal':
      return expr.value;
    case 'symbol': {
      const direct = env.consts.get(expr.name) ?? env.enums.get(expr.name);
      if (direct !== undefined) return direct + expr.addend;
      const lower = expr.name.toLowerCase();
      const alt = env.consts.get(lower) ?? env.enums.get(lower);
      if (alt !== undefined) return alt + expr.addend;
      const classicAlias = evalClassicAliasSymbol(expr.name);
      if (classicAlias !== undefined) return classicAlias + expr.addend;
      return undefined;
    }
    case 'unary': {
      const value = evalLoweredImmExpr(expr.expr, env);
      if (value === undefined) return undefined;
      switch (expr.op) {
        case '+':
          return +value;
        case '-':
          return -value;
        case '~':
          return ~value;
      }
      return undefined;
    }
    case 'binary': {
      const left = evalLoweredImmExpr(expr.left, env);
      const right = evalLoweredImmExpr(expr.right, env);
      if (left === undefined || right === undefined) return undefined;
      switch (expr.op) {
        case '*':
          return left * right;
        case '/':
          return right === 0 ? undefined : Math.trunc(left / right);
        case '%':
          return right === 0 ? undefined : left % right;
        case '+':
          return left + right;
        case '-':
          return left - right;
        case '&':
          return left & right;
        case '^':
          return left ^ right;
        case '|':
          return left | right;
        case '<<':
          return left << right;
        case '>>':
          return left >> right;
      }
      return undefined;
    }
    case 'opaque':
      return undefined;
  }
}

function blockSectionKey(section: SectionKind, name?: string): string {
  return name ? `${section}:${name}` : `base:${section}`;
}

function namedContributionKey(contributionOrder?: number): string {
  return `contrib:${contributionOrder ?? 'unknown'}`;
}

/** Byte length of a lowered item as emitted into a section (matches {@link emitLoweredAsmItemBytes}). */
export function loweredAsmItemEmittedSize(item: LoweredAsmItem, env: CompileEnv): number {
  switch (item.kind) {
    case 'label':
    case 'const':
    case 'comment':
      return 0;
    case 'db':
      return item.values.length;
    case 'dw':
      return item.values.length * 2;
    case 'ds': {
      const size = evalLoweredImmExpr(item.size, env);
      if (size === undefined || size < 0) return 0;
      return size;
    }
    case 'instr':
      return item.bytes?.length ?? 0;
  }
}

/**
 * After link-time fixups are applied to `finalBytes`, patch lowered `instr` byte arrays
 * (including `@raw` placeholders from abs16/rel8 fixups) so ASM80 listings match the
 * merged image.
 */
export function syncLoweredAsmInstructionBytesFromFinalBytes(
  program: LoweredAsmProgram,
  finalBytes: Map<number, number>,
  env: CompileEnv,
): void {
  for (const block of program.blocks) {
    if (block.kind !== 'section') continue;
    let offset = 0;
    const origin = block.origin;
    for (const item of block.items) {
      if (item.kind === 'instr' && item.bytes && item.bytes.length > 0) {
        const base = origin + offset;
        for (let i = 0; i < item.bytes.length; i++) {
          const b = finalBytes.get(base + i);
          if (b !== undefined) item.bytes[i] = b;
        }
      }
      offset += loweredAsmItemEmittedSize(item, env);
    }
  }
}

function emitLoweredAsmItemBytes(
  item: LoweredAsmItem,
  ctx: LoweredAsmByteEmissionContext,
  bytes: Map<number, number>,
  origin: number,
  offsetRef: { current: number },
  maxAddressRef: { current: number },
): void {
  const updateMax = (addr: number): void => {
    if (addr > maxAddressRef.current) maxAddressRef.current = addr;
  };

  const emitByte = (value: number): void => {
    const offset = offsetRef.current;
    bytes.set(offset, toByte(value));
    updateMax(origin + offset);
    offsetRef.current++;
  };
  const emitWord = (value: number): void => {
    const v = toWord(value);
    emitByte(v & 0xff);
    emitByte((v >> 8) & 0xff);
  };

  switch (item.kind) {
    case 'label':
    case 'const':
    case 'comment':
      return;
    case 'db':
      for (const value of item.values) {
        const v = evalLoweredImmExpr(value, ctx.env);
        if (v === undefined) {
          ctx.diag(ctx.diagnostics, ctx.primaryFile, 'Failed to evaluate lowered byte value.');
          emitByte(0);
        } else {
          emitByte(v);
        }
      }
      return;
    case 'dw':
      for (const value of item.values) {
        const v = evalLoweredImmExpr(value, ctx.env);
        if (v === undefined) {
          ctx.diag(ctx.diagnostics, ctx.primaryFile, 'Failed to evaluate lowered word value.');
          emitWord(0);
        } else {
          emitWord(v);
        }
      }
      return;
    case 'ds': {
      const size = evalLoweredImmExpr(item.size, ctx.env);
      if (size === undefined || size < 0) {
        ctx.diag(ctx.diagnostics, ctx.primaryFile, 'Failed to evaluate lowered reserve size.');
        return;
      }
      if (item.fill === undefined) {
        offsetRef.current += size;
        return;
      }
      const fillValue = evalLoweredImmExpr(item.fill, ctx.env) ?? 0;
      for (let i = 0; i < size; i++) emitByte(fillValue);
      return;
    }
    case 'instr': {
      if (!item.bytes) {
        ctx.diag(ctx.diagnostics, ctx.primaryFile, `Lowered instruction missing encoded bytes.`);
        return;
      }
      for (const b of item.bytes) emitByte(b);
      return;
    }
  }
}

export function emitLoweredAsmProgramBytes(
  program: LoweredAsmProgram,
  ctx: LoweredAsmByteEmissionContext,
): LoweredAsmByteEmissionResult {
  const codeBytes = new Map<number, number>();
  const dataBytes = new Map<number, number>();
  const namedBytesByKey = new Map<string, Map<number, number>>();
  const blockSizesByKey = new Map<string, number>();
  const maxAddressRef = { current: -1 };

  for (const block of program.blocks) {
    if (block.kind !== 'section') continue;
    const section = block.section ?? 'code';
    const key = block.name ? namedContributionKey(block.contributionOrder) : blockSectionKey(section);
    let target: Map<number, number>;
    if (block.name) {
      target = namedBytesByKey.get(key) ?? new Map<number, number>();
      namedBytesByKey.set(key, target);
    } else {
      target = section === 'code' ? codeBytes : section === 'data' ? dataBytes : new Map<number, number>();
    }

    const offsetRef = { current: 0 };
    for (const item of block.items) {
      emitLoweredAsmItemBytes(item, ctx, target, block.origin, offsetRef, maxAddressRef);
    }
    blockSizesByKey.set(key, offsetRef.current);
  }

  return {
    codeBytes,
    dataBytes,
    namedBytesByKey,
    blockSizesByKey,
    maxAddress: maxAddressRef.current,
  };
}

export function emitLoweredAsmBlockBytes(
  block: LoweredAsmBlock,
  ctx: LoweredAsmByteEmissionContext,
): { bytes: Map<number, number>; maxAddress: number; size: number } {
  const bytes = new Map<number, number>();
  const offsetRef = { current: 0 };
  const maxAddressRef = { current: -1 };
  for (const item of block.items) {
    emitLoweredAsmItemBytes(item, ctx, bytes, block.origin, offsetRef, maxAddressRef);
  }
  return { bytes, maxAddress: maxAddressRef.current, size: offsetRef.current };
}

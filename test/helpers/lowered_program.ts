import type { Diagnostic } from '../../src/diagnostics/types.js';
import { compile } from '../../src/compile.js';
import { defaultFormatWriters } from '../../src/formats/index.js';
import type { Asm80Artifact } from '../../src/formats/types.js';
import type {
  LoweredAsmProgram,
  LoweredAsmBlock,
  LoweredAsmItem,
  LoweredOperand,
  LoweredImmExpr,
  LoweredEaExpr,
} from '../../src/lowering/loweredAsmTypes.js';

export type LoweredInstrView = {
  head: string;
  operands: LoweredOperand[];
  bytes?: number[];
  block: LoweredAsmBlock;
};

export async function compilePlacedProgram(entry: string): Promise<{
  program: LoweredAsmProgram;
  diagnostics: Diagnostic[];
}> {
  let captured: LoweredAsmProgram | undefined;
  const formats = {
    ...defaultFormatWriters,
    writeAsm80: (program: LoweredAsmProgram): Asm80Artifact => {
      captured = program;
      return { kind: 'asm80', text: '' };
    },
  };
  const res = await compile(
    entry,
    { emitAsm80: true, emitBin: false, emitHex: false, emitListing: false, emitD8m: false },
    { formats },
  );
  if (!captured) {
    throw new Error('Placed lowered program was not captured from ASM80 emission.');
  }
  return { program: captured, diagnostics: res.diagnostics };
}

export function flattenLoweredInstructions(program: LoweredAsmProgram): LoweredInstrView[] {
  const out: LoweredInstrView[] = [];
  for (const block of program.blocks) {
    for (const item of block.items) {
      if (item.kind === 'instr') {
        out.push({
          head: item.head,
          operands: item.operands,
          ...(item.bytes ? { bytes: item.bytes } : {}),
          block,
        });
      }
    }
  }
  return out;
}

export function hasRawOpcode(
  instrs: LoweredInstrView[],
  opcode: number,
  opcode2?: number,
): boolean {
  return instrs.some((ins) => {
    if (ins.head !== '@raw' || !ins.bytes) return false;
    if (ins.bytes[0] !== opcode) return false;
    if (opcode2 === undefined) return true;
    return ins.bytes[1] === opcode2;
  });
}

export function findInstructions(program: LoweredAsmProgram, head: string): LoweredInstrView[] {
  const want = head.toUpperCase();
  return flattenLoweredInstructions(program).filter((ins) => ins.head.toUpperCase() === want);
}

export function flattenLoweredItems(program: LoweredAsmProgram): LoweredAsmItem[] {
  const out: LoweredAsmItem[] = [];
  for (const block of program.blocks) {
    out.push(...block.items);
  }
  return out;
}

const toHex = (value: number, width: number): string =>
  value.toString(16).toUpperCase().padStart(width, '0');

const formatNumber = (value: number): string => {
  if (value < 0) {
    const abs = Math.abs(value);
    return `-$${toHex(abs, abs > 0xff ? 4 : 2)}`;
  }
  return `$${toHex(value, value > 0xff ? 4 : 2)}`;
};

export function formatLoweredImmExpr(expr: LoweredImmExpr): string {
  switch (expr.kind) {
    case 'literal':
      return formatNumber(expr.value);
    case 'symbol': {
      if (expr.addend === 0) return expr.name;
      const addend = formatNumber(Math.abs(expr.addend));
      return expr.addend > 0 ? `${expr.name}+${addend}` : `${expr.name}-${addend}`;
    }
    case 'unary':
      return `${expr.op}${formatLoweredImmExpr(expr.expr)}`;
    case 'binary':
      return `(${formatLoweredImmExpr(expr.left)} ${expr.op} ${formatLoweredImmExpr(expr.right)})`;
    case 'opaque':
      return expr.text;
  }
}

export function formatLoweredEaExpr(expr: LoweredEaExpr): string {
  switch (expr.kind) {
    case 'name':
      return expr.name;
    case 'imm':
      return formatLoweredImmExpr(expr.expr);
    case 'add':
      return `${formatLoweredEaExpr(expr.base)}+${formatLoweredImmExpr(expr.offset)}`;
    case 'sub':
      return `${formatLoweredEaExpr(expr.base)}-${formatLoweredImmExpr(expr.offset)}`;
    case 'field':
    case 'index':
    case 'reinterpret':
      return `<${expr.kind}>`;
  }
}

export function formatLoweredOperand(op: LoweredOperand): string {
  switch (op.kind) {
    case 'reg':
      return op.name.toUpperCase();
    case 'imm':
      return formatLoweredImmExpr(op.expr);
    case 'ea':
      return formatLoweredEaExpr(op.expr);
    case 'mem':
      return `(${formatLoweredEaExpr(op.expr)})`;
    case 'portImm8':
      return `(${formatLoweredImmExpr(op.expr)})`;
    case 'portC':
      return '(C)';
  }
}

export function formatLoweredInstruction(view: LoweredInstrView): string {
  const head = view.head.toUpperCase();
  const ops = view.operands.map(formatLoweredOperand);
  return ops.length ? `${head} ${ops.join(', ')}` : head;
}

export function formatLoweredInstructions(program: LoweredAsmProgram): string[] {
  return flattenLoweredInstructions(program).map(formatLoweredInstruction);
}

export function operandUsesIx(op: LoweredOperand): boolean {
  if (op.kind !== 'mem' && op.kind !== 'ea') return false;
  const usesIx = (expr: LoweredEaExpr): boolean => {
    switch (expr.kind) {
      case 'name':
        return expr.name.toUpperCase() === 'IX';
      case 'add':
      case 'sub':
        return usesIx(expr.base);
      case 'imm':
      case 'field':
      case 'index':
      case 'reinterpret':
        return false;
    }
  };
  return usesIx(op.expr);
}

export function isReg(op: LoweredOperand | undefined, name: string): boolean {
  return !!op && op.kind === 'reg' && op.name.toUpperCase() === name.toUpperCase();
}

export function isImmSymbol(op: LoweredOperand | undefined, name: string, addend = 0): boolean {
  return (
    !!op &&
    op.kind === 'imm' &&
    op.expr.kind === 'symbol' &&
    op.expr.name.toUpperCase() === name.toUpperCase() &&
    op.expr.addend === addend
  );
}

export function isMemSymbol(op: LoweredOperand | undefined, name: string, addend = 0): boolean {
  return (
    !!op &&
    op.kind === 'mem' &&
    op.expr.kind === 'add' &&
    op.expr.base.kind === 'name' &&
    op.expr.base.name.toUpperCase() === name.toUpperCase() &&
    op.expr.offset.kind === 'literal' &&
    op.expr.offset.value === addend
  );
}

export function isMemName(op: LoweredOperand | undefined, name: string): boolean {
  return !!op && op.kind === 'mem' && op.expr.kind === 'name' && op.expr.name.toUpperCase() === name.toUpperCase();
}

export function isMemIxDisp(op: LoweredOperand | undefined, disp: number): boolean {
  if (!op || op.kind !== 'mem') return false;
  const expr = op.expr;
  if (expr.kind === 'add' || expr.kind === 'sub') {
    if (expr.base.kind !== 'name' || expr.base.name.toUpperCase() !== 'IX') return false;
    if (expr.offset.kind !== 'literal') return false;
    const sign = expr.kind === 'add' ? 1 : -1;
    return sign * expr.offset.value === disp;
  }
  return false;
}

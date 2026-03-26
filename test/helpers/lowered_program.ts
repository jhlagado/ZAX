import type { Diagnostic } from '../../src/diagnosticTypes.js';
import { compile } from '../../src/compile.js';
import { defaultFormatWriters } from '../../src/formats/index.js';
import type { Asm80Artifact, BinArtifact, EmittedByteMap, SymbolEntry } from '../../src/formats/types.js';
import type {
  LoweredAsmProgram,
  LoweredAsmBlock,
  LoweredAsmItem,
  LoweredOperand,
  LoweredImmExpr,
  LoweredEaExpr,
} from '../../src/lowering/loweredAsmTypes.js';

export type CompiledLoweredProgram = {
  program: LoweredAsmProgram;
  diagnostics: Diagnostic[];
  map: EmittedByteMap;
  symbols: SymbolEntry[];
};

export type LoweredInstrView = {
  head: string;
  operands: LoweredOperand[];
  bytes?: number[];
  resolvedBytes?: number[];
  block: LoweredAsmBlock;
  address: number;
  size: number;
  itemIndex: number;
};

export type LoweredLabelView = {
  name: string;
  address: number;
  block: LoweredAsmBlock;
  itemIndex: number;
};

export type LoweredBlockMatcher = Partial<
  Pick<LoweredAsmBlock, 'kind' | 'origin' | 'section' | 'name' | 'contributionOrder'>
>;

export type OperandPredicate = (op: LoweredOperand | undefined) => boolean;

export type LoweredLabelRange = {
  startLabel: string;
  endLabel?: string;
};

export type RawAbs16TargetSpec = {
  opcode: number;
  opcode2?: number;
  target: string;
  addend?: number;
  range?: LoweredLabelRange;
};

export type ResolvedRawAbs16TargetView = LoweredInstrView & {
  resolvedTargetAddress: number;
  resolvedTargetSymbol?: SymbolEntry;
};

function isCompiledLoweredProgram(value: LoweredAsmProgram | CompiledLoweredProgram): value is CompiledLoweredProgram {
  return 'program' in value;
}

function getProgram(value: LoweredAsmProgram | CompiledLoweredProgram): LoweredAsmProgram {
  return isCompiledLoweredProgram(value) ? value.program : value;
}

function getMap(value: LoweredAsmProgram | CompiledLoweredProgram): EmittedByteMap | undefined {
  return isCompiledLoweredProgram(value) ? value.map : undefined;
}

function readResolvedBytes(map: EmittedByteMap | undefined, address: number, size: number): number[] | undefined {
  if (!map || size <= 0) return undefined;
  const bytes: number[] = [];
  for (let index = 0; index < size; index++) {
    const byte = map.bytes.get(address + index);
    if (byte === undefined) return undefined;
    bytes.push(byte);
  }
  return bytes;
}

function evalStaticLoweredImmExpr(expr: LoweredImmExpr): number | undefined {
  switch (expr.kind) {
    case 'literal':
      return expr.value;
    case 'symbol':
    case 'opaque':
      return undefined;
    case 'unary': {
      const value = evalStaticLoweredImmExpr(expr.expr);
      if (value === undefined) return undefined;
      switch (expr.op) {
        case '+':
          return +value;
        case '-':
          return -value;
        case '~':
          return ~value;
      }
    }
    case 'binary': {
      const left = evalStaticLoweredImmExpr(expr.left);
      const right = evalStaticLoweredImmExpr(expr.right);
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
    }
  }
}

function loweredItemSize(item: LoweredAsmItem): number {
  switch (item.kind) {
    case 'label':
    case 'const':
    case 'comment':
      return 0;
    case 'db':
      return item.values.length;
    case 'dw':
      return item.values.length * 2;
    case 'ds':
      return Math.max(0, evalStaticLoweredImmExpr(item.size) ?? 0);
    case 'instr':
      return item.bytes?.length ?? 0;
  }
}

export async function compilePlacedProgram(entry: string): Promise<CompiledLoweredProgram> {
  let capturedProgram: LoweredAsmProgram | undefined;
  let capturedMap: EmittedByteMap | undefined;
  let capturedSymbols: SymbolEntry[] | undefined;
  const formats = {
    ...defaultFormatWriters,
    writeBin: (map: EmittedByteMap, symbols: SymbolEntry[]): BinArtifact => {
      capturedMap = map;
      capturedSymbols = symbols;
      return { kind: 'bin', bytes: new Uint8Array() };
    },
    writeAsm80: (program: LoweredAsmProgram): Asm80Artifact => {
      capturedProgram = program;
      return { kind: 'asm80', text: '' };
    },
  };
  const res = await compile(
    entry,
    { emitAsm80: true, emitBin: true, emitHex: false, emitListing: false, emitD8m: false },
    { formats },
  );
  if (!capturedProgram) {
    throw new Error('Placed lowered program was not captured from ASM80 emission.');
  }
  if (!capturedMap || !capturedSymbols) {
    throw new Error('Resolved byte map and symbols were not captured from BIN emission.');
  }
  return { program: capturedProgram, diagnostics: res.diagnostics, map: capturedMap, symbols: capturedSymbols };
}

export function flattenLoweredInstructions(
  program: LoweredAsmProgram,
  map?: EmittedByteMap,
): LoweredInstrView[] {
  const out: LoweredInstrView[] = [];
  for (const block of program.blocks) {
    let offset = 0;
    for (let itemIndex = 0; itemIndex < block.items.length; itemIndex++) {
      const item = block.items[itemIndex]!;
      const address = block.origin + offset;
      if (item.kind === 'instr') {
        const size = loweredItemSize(item);
        const view: LoweredInstrView = {
          head: item.head,
          operands: item.operands,
          block,
          address,
          size,
          itemIndex,
        };
        if (item.bytes) view.bytes = item.bytes;
        const resolvedBytes = map ? readResolvedBytes(map, address, size) : undefined;
        if (resolvedBytes) view.resolvedBytes = resolvedBytes;
        out.push(view);
      }
      offset += loweredItemSize(item);
    }
  }
  return out;
}

export function flattenLoweredLabels(program: LoweredAsmProgram): LoweredLabelView[] {
  const out: LoweredLabelView[] = [];
  for (const block of program.blocks) {
    let offset = 0;
    for (let itemIndex = 0; itemIndex < block.items.length; itemIndex++) {
      const item = block.items[itemIndex]!;
      const address = block.origin + offset;
      if (item.kind === 'label') {
        out.push({ name: item.name, address, block, itemIndex });
      }
      offset += loweredItemSize(item);
    }
  }
  return out;
}

export function findLoweredLabel(program: LoweredAsmProgram, name: string): LoweredLabelView | undefined {
  return flattenLoweredLabels(program).find((label) => label.name.toUpperCase() === name.toUpperCase());
}

export function findLoweredBlock(
  program: LoweredAsmProgram,
  matcher: LoweredBlockMatcher,
): LoweredAsmBlock | undefined {
  return program.blocks.find((block) =>
    Object.entries(matcher).every(([key, value]) => block[key as keyof LoweredBlockMatcher] === value),
  );
}

export function flattenLoweredItems(program: LoweredAsmProgram): LoweredAsmItem[] {
  const out: LoweredAsmItem[] = [];
  for (const block of program.blocks) {
    out.push(...block.items);
  }
  return out;
}

function toHex(value: number, width: number): string {
  return value.toString(16).toUpperCase().padStart(width, '0');
}

function formatNumber(value: number): string {
  if (value < 0) {
    const abs = Math.abs(value);
    return `-$${toHex(abs, abs > 0xff ? 4 : 2)}`;
  }
  return `$${toHex(value, value > 0xff ? 4 : 2)}`;
}

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

export function instructionsInLabelRange(
  value: LoweredAsmProgram | CompiledLoweredProgram,
  startLabel: string,
  endLabel?: string,
): LoweredInstrView[] {
  const program = getProgram(value);
  const map = getMap(value);
  const start = findLoweredLabel(program, startLabel);
  if (!start) return [];
  const end = endLabel ? findLoweredLabel(program, endLabel) : undefined;
  if (end && end.block !== start.block) return [];
  return flattenLoweredInstructions(program, map).filter(
    (instr) =>
      instr.block === start.block &&
      instr.itemIndex > start.itemIndex &&
      (end ? instr.itemIndex < end.itemIndex : true),
  );
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

export function hasOperands(view: LoweredInstrView, ...predicates: OperandPredicate[]): boolean {
  return view.operands.length === predicates.length && predicates.every((predicate, index) => predicate(view.operands[index]));
}

export function isReg(op: LoweredOperand | undefined, name: string): boolean {
  return !!op && op.kind === 'reg' && op.name.toUpperCase() === name.toUpperCase();
}

export function isImmLiteral(op: LoweredOperand | undefined, value: number): boolean {
  return !!op && op.kind === 'imm' && op.expr.kind === 'literal' && op.expr.value === value;
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

export function isEaName(op: LoweredOperand | undefined, name: string): boolean {
  return (
    !!op &&
    ((op.kind === 'ea' && op.expr.kind === 'name') || (op.kind === 'mem' && op.expr.kind === 'name')) &&
    op.expr.name.toUpperCase() === name.toUpperCase()
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

export function findSymbol(symbols: SymbolEntry[], name: string): SymbolEntry | undefined {
  return symbols.find((symbol) => symbol.name.toUpperCase() === name.toUpperCase());
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

function readResolvedAbs16Target(view: LoweredInstrView): number | undefined {
  if (view.head !== '@raw' || !view.resolvedBytes) return undefined;
  if (view.resolvedBytes.length < 3) return undefined;
  if (view.resolvedBytes[0] === 0xed || view.resolvedBytes[0] === 0xdd || view.resolvedBytes[0] === 0xfd) {
    if (view.resolvedBytes.length < 4) return undefined;
    return view.resolvedBytes[2]! | (view.resolvedBytes[3]! << 8);
  }
  return view.resolvedBytes[1]! | (view.resolvedBytes[2]! << 8);
}

export function findRawAbs16Target(
  lowered: CompiledLoweredProgram,
  spec: RawAbs16TargetSpec,
): ResolvedRawAbs16TargetView | undefined {
  const symbol = findSymbol(lowered.symbols, spec.target);
  if (!symbol || !('address' in symbol)) return undefined;
  const expectedAddress = (symbol.address + (spec.addend ?? 0)) & 0xffff;
  const search = spec.range
    ? instructionsInLabelRange(lowered, spec.range.startLabel, spec.range.endLabel)
    : flattenLoweredInstructions(lowered.program, lowered.map);

  for (const instr of search) {
    if (instr.head !== '@raw' || !instr.bytes) continue;
    if (instr.bytes[0] !== spec.opcode) continue;
    if (spec.opcode2 !== undefined && instr.bytes[1] !== spec.opcode2) continue;
    const resolvedTargetAddress = readResolvedAbs16Target(instr);
    if (resolvedTargetAddress === undefined || resolvedTargetAddress !== expectedAddress) continue;
    return { ...instr, resolvedTargetAddress, resolvedTargetSymbol: symbol };
  }
  return undefined;
}

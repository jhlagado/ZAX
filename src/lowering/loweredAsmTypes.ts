import type { SectionKind } from './loweringTypes.js';

export type LoweredAsmStream = {
  blocks: LoweredAsmStreamBlock[];
};

export type LoweredAsmStreamBlock = {
  kind: 'base' | 'named';
  section: SectionKind;
  name?: string;
  contributionOrder?: number;
  items: LoweredAsmItem[];
};

export type LoweredAsmProgram = {
  blocks: LoweredAsmBlock[];
  symbols?: LoweredAsmSymbol[];
};

export type LoweredAsmBlock = {
  kind: 'section' | 'absolute';
  origin: number;
  section?: SectionKind;
  name?: string;
  contributionOrder?: number;
  items: LoweredAsmItem[];
};

export type LoweredAsmSymbol =
  | { kind: 'constant'; name: string; value: LoweredImmExpr }
  | { kind: 'label' | 'data' | 'var' | 'unknown'; name: string; address: LoweredImmExpr };

export type LoweredAsmItem =
  | { kind: 'label'; name: string }
  | { kind: 'const'; name: string; value: LoweredImmExpr }
  | { kind: 'db'; values: LoweredImmExpr[] }
  | { kind: 'dw'; values: LoweredImmExpr[] }
  | { kind: 'ds'; size: LoweredImmExpr; fill?: LoweredImmExpr }
  | { kind: 'instr'; head: string; operands: LoweredOperand[]; bytes?: number[] }
  | { kind: 'comment'; text: string };

export type LoweredOperand =
  | { kind: 'reg'; name: string }
  | { kind: 'imm'; expr: LoweredImmExpr }
  | { kind: 'mem'; expr: LoweredEaExpr }
  | { kind: 'ea'; expr: LoweredEaExpr }
  | { kind: 'portImm8'; expr: LoweredImmExpr }
  | { kind: 'portC' };

export type LoweredImmExpr =
  | { kind: 'literal'; value: number }
  | { kind: 'symbol'; name: string; addend: number }
  | { kind: 'unary'; op: '+' | '-' | '~'; expr: LoweredImmExpr }
  | {
      kind: 'binary';
      op: '*' | '/' | '%' | '+' | '-' | '&' | '^' | '|' | '<<' | '>>';
      left: LoweredImmExpr;
      right: LoweredImmExpr;
    }
  | { kind: 'opaque'; text: string };

export type LoweredEaExpr =
  | { kind: 'name'; name: string }
  | { kind: 'imm'; expr: LoweredImmExpr }
  | { kind: 'reinterpret'; typeName: string; base: LoweredEaExpr }
  | { kind: 'field'; base: LoweredEaExpr; field: string }
  | { kind: 'index'; base: LoweredEaExpr; index: LoweredIndexExpr }
  | { kind: 'add'; base: LoweredEaExpr; offset: LoweredImmExpr }
  | { kind: 'sub'; base: LoweredEaExpr; offset: LoweredImmExpr };

export type LoweredIndexExpr =
  | { kind: 'imm'; value: LoweredImmExpr }
  | { kind: 'reg8'; reg: string }
  | { kind: 'reg16'; reg: string }
  | { kind: 'memHL' }
  | { kind: 'memIxIy'; base: 'IX' | 'IY'; disp?: LoweredImmExpr }
  | { kind: 'ea'; expr: LoweredEaExpr };

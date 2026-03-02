import type { Diagnostic } from '../diagnostics/types.js';
import { DiagnosticIds } from '../diagnostics/types.js';
import type {
  AsmInstructionNode,
  AsmOperandNode,
  EaExprNode,
  ImmExprNode,
} from '../frontend/ast.js';
import type { CompileEnv } from '../semantics/env.js';
import { evalImmExpr } from '../semantics/env.js';
import { encodeAluInstruction } from './encodeAlu.js';
import { encodeBitOpsInstruction } from './encodeBitOps.js';
import { encodeControlInstruction } from './encodeControl.js';
import { encodeCoreOpsInstruction } from './encodeCoreOps.js';
import { encodeLdInstruction } from './encodeLd.js';

function diag(
  diagnostics: Diagnostic[],
  node: { span: { file: string; start: { line: number; column: number } } },
  message: string,
): void {
  diagnostics.push({
    id: DiagnosticIds.EncodeError,
    severity: 'error',
    message,
    file: node.span.file,
    line: node.span.start.line,
    column: node.span.start.column,
  });
}

function flattenEaDottedName(ea: EaExprNode): string | undefined {
  if (ea.kind === 'EaName') return ea.name;
  if (ea.kind === 'EaField') {
    const base = flattenEaDottedName(ea.base);
    return base ? `${base}.${ea.field}` : undefined;
  }
  return undefined;
}

function immValue(op: AsmOperandNode, env: CompileEnv): number | undefined {
  if (op.kind === 'Imm') return evalImmExpr(op.expr, env);
  if (op.kind !== 'Ea') return undefined;
  const dotted = flattenEaDottedName(op.expr);
  if (!dotted || !env.enums.has(dotted)) return undefined;
  return evalImmExpr({ kind: 'ImmName', span: op.span, name: dotted }, env);
}

function portImmValue(op: AsmOperandNode, env: CompileEnv): number | undefined {
  if (op.kind !== 'PortImm8') return undefined;
  return evalImmExpr(op.expr, env);
}

function fitsImm8(value: number): boolean {
  return value >= -0x80 && value <= 0xff;
}

function fitsImm16(value: number): boolean {
  return value >= -0x8000 && value <= 0xffff;
}

function regName(op: AsmOperandNode): string | undefined {
  return op.kind === 'Reg' ? op.name.toUpperCase() : undefined;
}

function registerTokenName(op: AsmOperandNode): string | undefined {
  const name =
    op.kind === 'Reg'
      ? op.name.toUpperCase()
      : op.kind === 'Imm' && op.expr.kind === 'ImmName'
        ? op.expr.name.toUpperCase()
        : undefined;
  if (!name) return undefined;
  switch (name) {
    case 'A':
    case 'B':
    case 'C':
    case 'D':
    case 'E':
    case 'H':
    case 'L':
    case 'BC':
    case 'DE':
    case 'HL':
    case 'SP':
    case 'AF':
    case 'IX':
    case 'IY':
    case 'IXH':
    case 'IXL':
    case 'IYH':
    case 'IYL':
      return name;
    default:
      return undefined;
  }
}

function reg8Code(name: string): number | undefined {
  switch (name.toUpperCase()) {
    case 'B':
      return 0;
    case 'C':
      return 1;
    case 'D':
      return 2;
    case 'E':
      return 3;
    case 'H':
      return 4;
    case 'L':
      return 5;
    case 'A':
      return 7;
    default:
      return undefined;
  }
}

function isLegacyHLReg8(name: string | undefined): boolean {
  return name === 'H' || name === 'L';
}

function indexedReg8(
  op: AsmOperandNode,
): { prefix: number; code: number; display: 'IXH' | 'IXL' | 'IYH' | 'IYL' } | undefined {
  const n = regName(op);
  switch (n) {
    case 'IXH':
      return { prefix: 0xdd, code: 4, display: 'IXH' };
    case 'IXL':
      return { prefix: 0xdd, code: 5, display: 'IXL' };
    case 'IYH':
      return { prefix: 0xfd, code: 4, display: 'IYH' };
    case 'IYL':
      return { prefix: 0xfd, code: 5, display: 'IYL' };
    default:
      return undefined;
  }
}

function reg16Name(op: AsmOperandNode): string | undefined {
  if (op.kind !== 'Reg') return undefined;
  const n = op.name.toUpperCase();
  return n === 'BC' || n === 'DE' || n === 'HL' || n === 'SP' || n === 'AF' ? n : undefined;
}

function isMemHL(op: AsmOperandNode): boolean {
  return op.kind === 'Mem' && op.expr.kind === 'EaName' && op.expr.name.toUpperCase() === 'HL';
}

function isMemRegName(op: AsmOperandNode, reg: string): boolean {
  return op.kind === 'Mem' && op.expr.kind === 'EaName' && op.expr.name.toUpperCase() === reg;
}

function isReg16TransferName(name: string | undefined): boolean {
  return (
    name === 'BC' ||
    name === 'DE' ||
    name === 'HL' ||
    name === 'SP' ||
    name === 'AF' ||
    name === 'IX' ||
    name === 'IY'
  );
}

function memIndexed(
  op: AsmOperandNode,
  env: CompileEnv,
): { prefix: number; disp: number } | undefined {
  if (op.kind !== 'Mem') return undefined;
  const ea = op.expr;
  const encodeBaseDisp = (
    baseExpr: EaExprNode,
    dispExpr: ImmExprNode,
    negate = false,
  ): { prefix: number; disp: number } | undefined => {
    if (baseExpr.kind !== 'EaName') return undefined;
    const base = baseExpr.name.toUpperCase();
    if (base !== 'IX' && base !== 'IY') return undefined;
    const rawDisp = evalImmExpr(dispExpr, env);
    if (rawDisp === undefined) return undefined;
    const prefix = base === 'IX' ? 0xdd : 0xfd;
    return { prefix, disp: negate ? -rawDisp : rawDisp };
  };

  if (ea.kind === 'EaIndex' && ea.index.kind === 'IndexImm') {
    return encodeBaseDisp(ea.base, ea.index.value);
  }
  if (ea.kind === 'EaName') {
    const base = ea.name.toUpperCase();
    if (base === 'IX') return { prefix: 0xdd, disp: 0 };
    if (base === 'IY') return { prefix: 0xfd, disp: 0 };
  }
  if (ea.kind === 'EaAdd') {
    return encodeBaseDisp(ea.base, ea.offset);
  }
  if (ea.kind === 'EaSub') {
    return encodeBaseDisp(ea.base, ea.offset, true);
  }
  return undefined;
}

function memAbs16(op: AsmOperandNode, env: CompileEnv): number | undefined {
  if (op.kind !== 'Mem') return undefined;

  const evalEaAbs16 = (ea: EaExprNode): number | undefined => {
    switch (ea.kind) {
      case 'EaName':
        return evalImmExpr(
          {
            kind: 'ImmName',
            span: ea.span,
            name: ea.name,
          },
          env,
        );
      case 'EaAdd': {
        const base = evalEaAbs16(ea.base);
        const delta = evalImmExpr(ea.offset, env);
        if (base === undefined || delta === undefined) return undefined;
        return base + delta;
      }
      case 'EaSub': {
        const base = evalEaAbs16(ea.base);
        const delta = evalImmExpr(ea.offset, env);
        if (base === undefined || delta === undefined) return undefined;
        return base - delta;
      }
      default:
        return undefined;
    }
  };

  return evalEaAbs16(op.expr);
}

function conditionName(op: AsmOperandNode): string | undefined {
  if (op.kind === 'Reg') return op.name.toUpperCase();
  if (op.kind === 'Imm' && op.expr.kind === 'ImmName') return op.expr.name.toUpperCase();
  return undefined;
}

function symbolicImmBaseName(op: AsmOperandNode, env: CompileEnv): string | undefined {
  if (op.kind !== 'Imm') return undefined;
  const expr = op.expr;
  if (expr.kind === 'ImmName') return expr.name.toUpperCase();
  if (expr.kind !== 'ImmBinary') return undefined;
  if (expr.op !== '+' && expr.op !== '-') return undefined;

  const leftName = expr.left.kind === 'ImmName' ? expr.left.name.toUpperCase() : undefined;
  const rightName = expr.right.kind === 'ImmName' ? expr.right.name.toUpperCase() : undefined;

  if (leftName) {
    const right = evalImmExpr(expr.right, env);
    if (right !== undefined) return leftName;
  }
  if (expr.op === '+' && rightName) {
    const left = evalImmExpr(expr.left, env);
    if (left !== undefined) return rightName;
  }
  return undefined;
}

function jpConditionOpcode(name: string): number | undefined {
  switch (name) {
    case 'NZ':
      return 0xc2;
    case 'Z':
      return 0xca;
    case 'NC':
      return 0xd2;
    case 'C':
      return 0xda;
    case 'PO':
      return 0xe2;
    case 'PE':
      return 0xea;
    case 'P':
      return 0xf2;
    case 'M':
      return 0xfa;
    default:
      return undefined;
  }
}

function jrConditionOpcode(name: string): number | undefined {
  switch (name) {
    case 'NZ':
      return 0x20;
    case 'Z':
      return 0x28;
    case 'NC':
      return 0x30;
    case 'C':
      return 0x38;
    default:
      return undefined;
  }
}

function callConditionOpcode(name: string): number | undefined {
  switch (name) {
    case 'NZ':
      return 0xc4;
    case 'Z':
      return 0xcc;
    case 'NC':
      return 0xd4;
    case 'C':
      return 0xdc;
    case 'PO':
      return 0xe4;
    case 'PE':
      return 0xec;
    case 'P':
      return 0xf4;
    case 'M':
      return 0xfc;
    default:
      return undefined;
  }
}

function retConditionOpcode(name: string): number | undefined {
  switch (name) {
    case 'NZ':
      return 0xc0;
    case 'Z':
      return 0xc8;
    case 'NC':
      return 0xd0;
    case 'C':
      return 0xd8;
    case 'PO':
      return 0xe0;
    case 'PE':
      return 0xe8;
    case 'P':
      return 0xf0;
    case 'M':
      return 0xf8;
    default:
      return undefined;
  }
}

function zeroOperandEdOpcode(head: string): number | undefined {
  switch (head) {
    case 'reti':
      return 0x4d;
    case 'retn':
      return 0x45;
    case 'neg':
      return 0x44;
    case 'rrd':
      return 0x67;
    case 'rld':
      return 0x6f;
    case 'ldi':
      return 0xa0;
    case 'ldir':
      return 0xb0;
    case 'ldd':
      return 0xa8;
    case 'lddr':
      return 0xb8;
    case 'cpi':
      return 0xa1;
    case 'cpir':
      return 0xb1;
    case 'cpd':
      return 0xa9;
    case 'cpdr':
      return 0xb9;
    case 'ini':
      return 0xa2;
    case 'inir':
      return 0xb2;
    case 'ind':
      return 0xaa;
    case 'indr':
      return 0xba;
    case 'outi':
      return 0xa3;
    case 'otir':
      return 0xb3;
    case 'outd':
      return 0xab;
    case 'otdr':
      return 0xbb;
    default:
      return undefined;
  }
}

function zeroOperandOpcode(head: string): Uint8Array | undefined {
  switch (head) {
    case 'nop':
      return Uint8Array.of(0x00);
    case 'halt':
      return Uint8Array.of(0x76);
    case 'di':
      return Uint8Array.of(0xf3);
    case 'ei':
      return Uint8Array.of(0xfb);
    case 'scf':
      return Uint8Array.of(0x37);
    case 'ccf':
      return Uint8Array.of(0x3f);
    case 'cpl':
      return Uint8Array.of(0x2f);
    case 'daa':
      return Uint8Array.of(0x27);
    case 'rlca':
      return Uint8Array.of(0x07);
    case 'rrca':
      return Uint8Array.of(0x0f);
    case 'rla':
      return Uint8Array.of(0x17);
    case 'rra':
      return Uint8Array.of(0x1f);
    case 'exx':
      return Uint8Array.of(0xd9);
    default: {
      const edOpcode = zeroOperandEdOpcode(head);
      return edOpcode === undefined ? undefined : Uint8Array.of(0xed, edOpcode);
    }
  }
}

function arityDiagnostic(head: string, operandCount: number): string | undefined {
  switch (head) {
    case 'add':
    case 'ld':
    case 'ex':
      if (operandCount === 2) return undefined;
      return `${head} expects two operands`;
    case 'sub':
    case 'cp':
    case 'and':
    case 'or':
    case 'xor':
      if (operandCount === 1 || operandCount === 2) return undefined;
      return `${head} expects one operand, or two with destination A`;
    case 'adc':
    case 'sbc':
      if (operandCount === 1 || operandCount === 2) return undefined;
      return `${head} expects one operand, two with destination A, or HL,rr form`;
    case 'inc':
    case 'dec':
    case 'push':
    case 'pop':
      if (operandCount === 1) return undefined;
      return `${head} expects one operand`;
    case 'bit':
      if (operandCount === 2) return undefined;
      return `${head} expects two operands`;
    case 'res':
    case 'set':
      if (operandCount === 2 || operandCount === 3) return undefined;
      return `${head} expects two operands, or three with indexed source + reg8 destination`;
    case 'rl':
    case 'rr':
    case 'sla':
    case 'sra':
    case 'srl':
    case 'sll':
    case 'rlc':
    case 'rrc':
      if (operandCount === 1 || operandCount === 2) return undefined;
      return `${head} expects one operand, or two with indexed source + reg8 destination`;
    default:
      return undefined;
  }
}

function isKnownInstructionHead(head: string): boolean {
  const h = head.toLowerCase();
  switch (h) {
    case 'ret':
    case 'add':
    case 'call':
    case 'djnz':
    case 'rst':
    case 'im':
    case 'in':
    case 'out':
    case 'jp':
    case 'jr':
    case 'ld':
    case 'inc':
    case 'dec':
    case 'push':
    case 'pop':
    case 'ex':
    case 'sub':
    case 'cp':
    case 'and':
    case 'or':
    case 'xor':
    case 'adc':
    case 'sbc':
    case 'bit':
    case 'res':
    case 'set':
    case 'rl':
    case 'rr':
    case 'sla':
    case 'sra':
    case 'srl':
    case 'sll':
    case 'rlc':
    case 'rrc':
      return true;
    default:
      return zeroOperandOpcode(h) !== undefined;
  }
}

/**
 * Encode a single `asm` instruction node into Z80 machine-code bytes.
 *
 * - Immediate operands may be `imm` expressions (const/enum names and operators), evaluated via the env.
 * - Unsupported forms append an error diagnostic and return `undefined`.
 */
export function encodeInstruction(
  node: AsmInstructionNode,
  env: CompileEnv,
  diagnostics: Diagnostic[],
): Uint8Array | undefined {
  const diagnosticsBefore = diagnostics.length;
  const head = node.head.toLowerCase();
  const ops = node.operands;

  if (head === 'ret' || head === 'call' || head === 'djnz' || head === 'jp' || head === 'jr') {
    return encodeControlInstruction(node, env, diagnostics, {
      diag,
      immValue,
      registerTokenName,
      conditionName,
      symbolicImmBaseName,
      fitsImm16,
      isMemRegName,
      retConditionOpcode,
      callConditionOpcode,
      jpConditionOpcode,
      jrConditionOpcode,
    });
  }
  const zeroOpcode = zeroOperandOpcode(head);
  if (zeroOpcode) {
    if (ops.length === 0) return zeroOpcode;
    diag(diagnostics, node, `${head} expects no operands`);
    return undefined;
  }

  if (
    head === 'add' ||
    head === 'sub' ||
    head === 'cp' ||
    head === 'and' ||
    head === 'or' ||
    head === 'xor' ||
    head === 'adc' ||
    head === 'sbc'
  ) {
    const encoded = encodeAluInstruction(node, env, diagnostics, {
      diag,
      regName,
      immValue,
      indexedReg8,
      reg8Code,
      fitsImm8,
      isMemHL,
      memIndexed,
    });
    if (encoded) return encoded;
  }

  if (head === 'rst' && ops.length === 1) {
    const n = immValue(ops[0]!, env);
    if (n === undefined || n < 0 || n > 0x38 || (n & 0x07) !== 0) {
      diag(diagnostics, node, `rst expects an imm8 multiple of 8 (0..56)`);
      return undefined;
    }
    return Uint8Array.of(0xc7 + n);
  }
  if (head === 'rst') {
    diag(diagnostics, node, `rst expects one operand`);
    return undefined;
  }

  if (head === 'im' && ops.length === 1) {
    const n = immValue(ops[0]!, env);
    if (n === 0) return Uint8Array.of(0xed, 0x46);
    if (n === 1) return Uint8Array.of(0xed, 0x56);
    if (n === 2) return Uint8Array.of(0xed, 0x5e);
    diag(diagnostics, node, `im expects 0, 1, or 2`);
    return undefined;
  }
  if (head === 'im') {
    diag(diagnostics, node, `im expects one operand`);
    return undefined;
  }

  if (head === 'in' && ops.length === 1) {
    if (ops[0]!.kind === 'PortC') {
      // in (c) => ED 70
      return Uint8Array.of(0xed, 0x70);
    }
    diag(diagnostics, node, `in (c) is the only one-operand in form`);
    return undefined;
  }

  if (head === 'in' && ops.length === 2) {
    const dst = regName(ops[0]!);
    const dst8 = dst ? reg8Code(dst) : undefined;

    if (dst8 === undefined) {
      if (indexedReg8(ops[0]!)) {
        diag(diagnostics, node, `in destination must use legacy reg8 B/C/D/E/H/L/A`);
        return undefined;
      }
      diag(diagnostics, node, `in expects a reg8 destination`);
      return undefined;
    }

    const port = ops[1]!;
    if (port.kind === 'PortC') {
      // in r,(c) => ED 40 + r*8
      return Uint8Array.of(0xed, 0x40 + (dst8 << 3));
    }
    if (port.kind === 'PortImm8') {
      // in a,(n) => DB n
      if (dst !== 'A') {
        diag(diagnostics, node, `in a,(n) immediate port form requires destination A`);
        return undefined;
      }
      const n = portImmValue(port, env);
      if (n === undefined || !fitsImm8(n)) {
        diag(diagnostics, node, `in a,(n) expects an imm8 port number`);
        return undefined;
      }
      return Uint8Array.of(0xdb, n & 0xff);
    }

    diag(diagnostics, node, `in expects a port operand (c) or (imm8)`);
    return undefined;
  }
  if (head === 'in') {
    diag(diagnostics, node, `in expects one or two operands`);
    return undefined;
  }

  if (head === 'out' && ops.length === 2) {
    const port = ops[0]!;
    const src = regName(ops[1]!);
    const src8 = src ? reg8Code(src) : undefined;
    const srcIndexed = indexedReg8(ops[1]!);

    if (port.kind === 'PortC') {
      if (ops[1]!.kind === 'Imm') {
        const n = evalImmExpr(ops[1]!.expr, env);
        if (n === 0) {
          // out (c),0 => ED 71
          return Uint8Array.of(0xed, 0x71);
        }
        diag(diagnostics, node, `out (c), n immediate form supports n=0 only`);
        return undefined;
      }
      if (src8 === undefined) {
        if (srcIndexed) {
          diag(diagnostics, node, `out source must use legacy reg8 B/C/D/E/H/L/A`);
          return undefined;
        }
        diag(diagnostics, node, `out expects a reg8 source`);
        return undefined;
      }
      // out (c),r => ED 41 + r*8
      return Uint8Array.of(0xed, 0x41 + (src8 << 3));
    }
    if (port.kind === 'PortImm8') {
      // out (n),a => D3 n
      if (src8 === undefined) {
        if (srcIndexed) {
          diag(diagnostics, node, `out source must use legacy reg8 B/C/D/E/H/L/A`);
          return undefined;
        }
        diag(diagnostics, node, `out expects a reg8 source`);
        return undefined;
      }
      if (src !== 'A') {
        diag(diagnostics, node, `out (n),a immediate port form requires source A`);
        return undefined;
      }
      const n = portImmValue(port, env);
      if (n === undefined || !fitsImm8(n)) {
        diag(diagnostics, node, `out (n),a expects an imm8 port number`);
        return undefined;
      }
      return Uint8Array.of(0xd3, n & 0xff);
    }

    diag(diagnostics, node, `out expects a port operand (c) or (imm8)`);
    return undefined;
  }
  if (head === 'out') {
    diag(diagnostics, node, `out expects two operands`);
    return undefined;
  }

  if (head === 'ld') {
    return encodeLdInstruction(node, env, diagnostics, {
      diag,
      regName,
      immValue,
      indexedReg8,
      reg8Code,
      fitsImm8,
      fitsImm16,
      memAbs16,
      memIndexed,
      isMemHL,
      isMemRegName,
      isReg16TransferName,
      isLegacyHLReg8,
    });
  }

  if (head === 'inc' || head === 'dec' || head === 'push' || head === 'pop' || head === 'ex') {
    const encoded = encodeCoreOpsInstruction(node, env, diagnostics, {
      diag,
      regName,
      indexedReg8,
      reg8Code,
      isMemHL,
      memIndexed,
    });
    if (encoded) return encoded;
  }

  if (
    head === 'bit' ||
    head === 'res' ||
    head === 'set' ||
    head === 'rl' ||
    head === 'rr' ||
    head === 'sla' ||
    head === 'sra' ||
    head === 'srl' ||
    head === 'sll' ||
    head === 'rlc' ||
    head === 'rrc'
  ) {
    const encoded = encodeBitOpsInstruction(node, env, diagnostics, {
      diag,
      regName,
      immValue,
      indexedReg8,
      reg8Code,
      isMemHL,
      memIndexed,
    });
    if (encoded) return encoded;
    if (ops.length === 1 || ops.length === 2 || ops.length === 3) return undefined;
  }

  if (isKnownInstructionHead(head) && diagnostics.length > diagnosticsBefore) {
    return undefined;
  }

  const arityMessage = arityDiagnostic(head, ops.length);
  if (arityMessage !== undefined) {
    diag(diagnostics, node, arityMessage);
    return undefined;
  }

  if (isKnownInstructionHead(head)) {
    diag(diagnostics, node, `${head} has unsupported operand form`);
    return undefined;
  }

  diag(diagnostics, node, `Unsupported instruction: ${node.head}`);
  return undefined;
}

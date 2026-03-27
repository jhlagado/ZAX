import type { Diagnostic } from '../diagnosticTypes.js';
import type { AsmOperandNode, EaExprNode, ImmExprNode, SourceSpan, TypeExprNode } from '../frontend/ast.js';
import type { EaResolution } from './eaResolution.js';
import type { StepPipeline } from './steps.js';

export type DiagAt = (diagnostics: Diagnostic[], span: SourceSpan, message: string) => void;

/** Shared dependency surface for value / EA materialization helpers. */
export type ValueMaterializationContext = {
  diagnostics: Diagnostic[];
  diagAt: DiagAt;
  reg8: Set<string>;
  resolveEa: (ea: EaExprNode, span: SourceSpan) => EaResolution | undefined;
  resolveEaTypeExpr: (ea: EaExprNode) => TypeExprNode | undefined;
  resolveAggregateType: (
    typeExpr: TypeExprNode,
  ) => { kind: 'record' | 'union'; fields: import('../frontend/ast.js').RecordFieldNode[] } | undefined;
  resolveScalarBinding: (name: string) => 'byte' | 'word' | 'addr' | undefined;
  resolveScalarKind: (typeExpr: TypeExprNode) => 'byte' | 'word' | 'addr' | undefined;
  sizeOfTypeExpr: (typeExpr: TypeExprNode) => number | undefined;
  evalImmExpr: (expr: ImmExprNode) => number | undefined;
  evalImmNoDiag: (expr: ImmExprNode) => number | undefined;
  emitInstr: (head: string, operands: AsmOperandNode[], span: SourceSpan) => boolean;
  emitRawCodeBytes: (bytes: Uint8Array, file: string, asmText: string) => void;
  emitAbs16Fixup: (
    opcode: number,
    baseLower: string,
    addend: number,
    span: SourceSpan,
    asmText?: string,
  ) => void;
  loadImm16ToDE: (value: number, span: SourceSpan) => boolean;
  loadImm16ToHL: (value: number, span: SourceSpan) => boolean;
  negateHL: (span: SourceSpan) => boolean;
  pushZeroExtendedReg8: (reg: string, span: SourceSpan) => boolean;
  emitStepPipeline: (pipeline: StepPipeline, span: SourceSpan) => boolean;
  buildEaBytePipeline: (ea: EaExprNode, span: SourceSpan) => StepPipeline | null;
  buildEaWordPipeline: (ea: EaExprNode, span: SourceSpan) => StepPipeline | null;
  emitScalarWordLoad: (target: 'HL' | 'DE' | 'BC', resolved: EaResolution | undefined, span: SourceSpan) => boolean;
  formatIxDisp: (disp: number) => string;
  TEMPLATE_L_ABC: (dest: string, ea: StepPipeline) => StepPipeline;
  TEMPLATE_LW_DE: (ea: StepPipeline) => StepPipeline;
  LOAD_RP_EA: (rp: 'HL' | 'DE' | 'BC') => StepPipeline;
  STORE_RP_EA: (rp: 'DE' | 'BC') => StepPipeline;
};

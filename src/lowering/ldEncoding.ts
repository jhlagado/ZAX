import type { StepPipeline } from '../addressing/steps.js';
import type { Diagnostic } from '../diagnostics/types.js';
import type { AsmInstructionNode, AsmOperandNode, EaExprNode } from '../frontend/ast.js';
import type { ImmExprNode, SourceSpan, TypeExprNode } from '../frontend/ast.js';
import type { CompileEnv } from '../semantics/env.js';
import type { EaResolution } from './eaResolution.js';
import type { LdForm } from './ldFormSelection.js';
import type { ScalarKind } from './typeResolution.js';

export type LdEncodingContext = {
  LOAD_RP_FVAR: (rp: 'HL' | 'DE' | 'BC', ixDisp: number) => StepPipeline;
  LOAD_RP_GLOB: (rp: 'HL' | 'DE' | 'BC', baseLower: string) => StepPipeline;
  STORE_RP_FVAR: (rp: 'HL' | 'DE' | 'BC', ixDisp: number) => StepPipeline;
  STORE_RP_GLOB: (rp: 'HL' | 'DE' | 'BC', baseLower: string) => StepPipeline;
  TEMPLATE_L_ABC: (dest: string, ea: StepPipeline) => StepPipeline;
  TEMPLATE_L_DE: (dest: 'D' | 'E', ea: StepPipeline) => StepPipeline;
  TEMPLATE_L_HL: (dest: 'H' | 'L', ea: StepPipeline) => StepPipeline;
  TEMPLATE_LW_BC: (ea: StepPipeline) => StepPipeline;
  TEMPLATE_LW_DE: (ea: StepPipeline) => StepPipeline;
  TEMPLATE_LW_HL: (ea: StepPipeline) => StepPipeline;
  TEMPLATE_S_ANY: (src: string, ea: StepPipeline) => StepPipeline;
  TEMPLATE_S_HL: (src: 'H' | 'L', ea: StepPipeline) => StepPipeline;
  TEMPLATE_SW_DEBC: (src: 'DE' | 'BC', ea: StepPipeline) => StepPipeline;
  TEMPLATE_SW_HL: (ea: StepPipeline) => StepPipeline;
  buildEaBytePipeline: (ea: EaExprNode, span: SourceSpan) => StepPipeline | null;
  buildEaWordPipeline: (ea: EaExprNode, span: SourceSpan) => StepPipeline | null;
  canUseScalarWordAccessor: (resolved: EaResolution | undefined) => boolean;
  diagAt: (diagnostics: Diagnostic[], span: SourceSpan, message: string) => void;
  diagnostics: Diagnostic[];
  emitAbs16Fixup: (
    opcode: number,
    target: string,
    addend: number,
    span: SourceSpan,
    asmText?: string,
  ) => void;
  emitAbs16FixupEd: (
    opcode: number,
    target: string,
    addend: number,
    span: SourceSpan,
    asmText?: string,
  ) => void;
  emitAbs16FixupPrefixed: (
    prefix: number,
    opcode: number,
    target: string,
    addend: number,
    span: SourceSpan,
    asmText?: string,
  ) => void;
  emitInstr: (head: string, operands: AsmOperandNode[], span: SourceSpan) => boolean;
  emitLoadWordFromHlAddress: (target: 'HL' | 'DE' | 'BC', span: SourceSpan) => boolean;
  emitRawCodeBytes: (bytes: Uint8Array, file: string, asmText: string) => void;
  emitScalarWordLoad: (
    target: 'HL' | 'DE' | 'BC',
    resolved: EaResolution | undefined,
    span: SourceSpan,
  ) => boolean;
  emitScalarWordStore: (
    source: 'HL' | 'DE' | 'BC',
    resolved: EaResolution | undefined,
    span: SourceSpan,
  ) => boolean;
  emitStepPipeline: (pipeline: StepPipeline, span: SourceSpan) => boolean;
  emitStoreSavedHlToEa: (ea: EaExprNode, span: SourceSpan) => boolean;
  emitStoreWordToHlAddress: (source: 'DE' | 'BC', span: SourceSpan) => boolean;
  env: CompileEnv;
  evalImmExpr: (expr: ImmExprNode) => number | undefined;
  formatIxDisp: (disp: number) => string;
  isWordCompatibleScalarKind: (
    scalar: ScalarKind | undefined,
  ) => scalar is 'word' | 'addr';
  loadImm16ToHL: (value: number, span: SourceSpan) => boolean;
  materializeEaAddressToHL: (ea: EaExprNode, span: SourceSpan) => boolean;
  reg8Code: ReadonlyMap<string, number>;
  resolveScalarKind: (typeExpr: TypeExprNode, seen?: Set<string>) => ScalarKind | undefined;
  setSpTrackingInvalid: () => void;
};

export function createLdEncodingHelpers(ctx: LdEncodingContext) {
  const {
    LOAD_RP_FVAR,
    LOAD_RP_GLOB,
    STORE_RP_FVAR,
    STORE_RP_GLOB,
    TEMPLATE_L_ABC,
    TEMPLATE_L_DE,
    TEMPLATE_L_HL,
    TEMPLATE_LW_BC,
    TEMPLATE_LW_DE,
    TEMPLATE_LW_HL,
    TEMPLATE_S_ANY,
    TEMPLATE_S_HL,
    TEMPLATE_SW_DEBC,
    TEMPLATE_SW_HL,
    buildEaBytePipeline,
    buildEaWordPipeline,
    canUseScalarWordAccessor,
    diagAt,
    diagnostics,
    emitAbs16Fixup,
    emitAbs16FixupEd,
    emitAbs16FixupPrefixed,
    emitInstr,
    emitLoadWordFromHlAddress,
    emitRawCodeBytes,
    emitScalarWordLoad,
    emitScalarWordStore,
    emitStepPipeline,
    emitStoreSavedHlToEa,
    emitStoreWordToHlAddress,
    evalImmExpr,
    formatIxDisp,
    isWordCompatibleScalarKind,
    loadImm16ToHL,
    materializeEaAddressToHL,
    reg8Code,
    resolveScalarKind,
    setSpTrackingInvalid,
  } = ctx;

  const emitLdForm = (form: LdForm): boolean => {
    const { inst, dst, src, dstResolved, srcResolved, dstScalarExact, srcScalarExact, scalarMemToMem } = form;

    const ixDispMem = (disp: number): AsmOperandNode => ({
      kind: 'Mem',
      span: inst.span,
      expr:
        disp === 0
          ? { kind: 'EaName', span: inst.span, name: 'IX' }
          : {
              kind: disp >= 0 ? 'EaAdd' : 'EaSub',
              span: inst.span,
              base: { kind: 'EaName', span: inst.span, name: 'IX' },
              offset: { kind: 'ImmLiteral', span: inst.span, value: Math.abs(disp) },
            },
    });

    if (dst.kind === 'Reg' && src.kind === 'Mem') {
      if (form.srcHasRegisterLikeEaBase) return false;
      if (form.srcIsIxIyDispMem && reg8Code.has(dst.name.toUpperCase())) return false;
      if (form.srcIsEaNameHL) return false;
      if (dst.name.toUpperCase() === 'A' && form.srcIsEaNameBCorDE) return false;
      if (dst.name.toUpperCase() === 'A' && srcResolved?.kind === 'abs') {
        emitAbs16Fixup(0x3a, srcResolved.baseLower, srcResolved.addend, inst.span);
        return true;
      }
      const regUp = dst.name.toUpperCase();
      const d = reg8Code.get(regUp);
      if (d !== undefined) {
        if (srcResolved?.kind === 'abs' && srcResolved.addend === 0) {
          if (!emitInstr('push', [{ kind: 'Reg', span: inst.span, name: 'AF' }], inst.span)) return false;
          emitAbs16Fixup(0x3a, srcResolved.baseLower, 0, inst.span);
          if (
            !emitInstr(
              'ld',
              [
                { kind: 'Reg', span: inst.span, name: regUp },
                { kind: 'Reg', span: inst.span, name: 'A' },
              ],
              inst.span,
            )
          ) {
            return false;
          }
          return emitInstr('pop', [{ kind: 'Reg', span: inst.span, name: 'AF' }], inst.span);
        }

        if (srcResolved?.kind === 'stack' && srcResolved.ixDisp >= -0x80 && srcResolved.ixDisp <= 0x7f) {
          if (regUp === 'H' || regUp === 'L') {
            if (
              !emitInstr(
                'ex',
                [
                  { kind: 'Reg', span: inst.span, name: 'DE' },
                  { kind: 'Reg', span: inst.span, name: 'HL' },
                ],
                inst.span,
              )
            ) {
              return false;
            }
            if (
              !emitInstr(
                'ld',
                [
                  { kind: 'Reg', span: inst.span, name: regUp === 'H' ? 'D' : 'E' },
                  ixDispMem(srcResolved.ixDisp),
                ],
                inst.span,
              )
            ) {
              return false;
            }
            return emitInstr(
              'ex',
              [
                { kind: 'Reg', span: inst.span, name: 'DE' },
                { kind: 'Reg', span: inst.span, name: 'HL' },
              ],
              inst.span,
            );
          }

          emitRawCodeBytes(
            Uint8Array.of(0xdd, 0x46 + (d << 3), srcResolved.ixDisp & 0xff),
            inst.span.file,
            `ld ${regUp}, (ix${formatIxDisp(srcResolved.ixDisp)})`,
          );
          return true;
        }

        const eaPipe = buildEaBytePipeline(src.expr, inst.span);
        if (eaPipe) {
          let templated: StepPipeline | null = null;
          if (regUp === 'A' || regUp === 'B' || regUp === 'C') templated = TEMPLATE_L_ABC(regUp, eaPipe);
          else if (regUp === 'H' || regUp === 'L') templated = TEMPLATE_L_HL(regUp as 'H' | 'L', eaPipe);
          else if (regUp === 'D' || regUp === 'E') templated = TEMPLATE_L_DE(regUp as 'D' | 'E', eaPipe);
          if (templated && emitStepPipeline(templated, inst.span)) return true;
        }

        if (!materializeEaAddressToHL(src.expr, inst.span)) return false;
        emitRawCodeBytes(Uint8Array.of(0x46 + (d << 3)), inst.span.file, `ld ${regUp}, (hl)`);
        return true;
      }

      const r16 = dst.name.toUpperCase();
      if (r16 === 'HL') {
        if (srcScalarExact === 'byte') {
          diagAt(diagnostics, inst.span, 'Word register load requires a word-typed source.');
          return true;
        }
        if (srcResolved?.kind === 'stack') return emitStepPipeline(LOAD_RP_FVAR('HL', srcResolved.ixDisp), inst.span);
        if (srcResolved?.kind === 'abs') {
          if (srcResolved.addend === 0 && emitStepPipeline(LOAD_RP_GLOB('HL', srcResolved.baseLower), inst.span)) {
            return true;
          }
          emitAbs16Fixup(0x2a, srcResolved.baseLower, srcResolved.addend, inst.span);
          return true;
        }
        const srcPipeW = buildEaWordPipeline(src.expr, inst.span);
        if (srcPipeW && emitStepPipeline(TEMPLATE_LW_HL(srcPipeW), inst.span)) return true;
        if (!materializeEaAddressToHL(src.expr, inst.span)) return false;
        return emitLoadWordFromHlAddress('HL', inst.span);
      }
      if (r16 === 'DE') {
        if (srcScalarExact === 'byte') {
          diagAt(diagnostics, inst.span, 'Word register load requires a word-typed source.');
          return true;
        }
        if (srcResolved?.kind === 'stack') return emitStepPipeline(LOAD_RP_FVAR('DE', srcResolved.ixDisp), inst.span);
        if (srcResolved?.kind === 'abs') {
          if (srcResolved.addend === 0 && emitStepPipeline(LOAD_RP_GLOB('DE', srcResolved.baseLower), inst.span)) {
            return true;
          }
          emitAbs16FixupEd(0x5b, srcResolved.baseLower, srcResolved.addend, inst.span);
          return true;
        }
        const srcPipeW = buildEaWordPipeline(src.expr, inst.span);
        if (srcPipeW && emitStepPipeline(TEMPLATE_LW_DE(srcPipeW), inst.span)) return true;
        if (!materializeEaAddressToHL(src.expr, inst.span)) return false;
        return emitLoadWordFromHlAddress('DE', inst.span);
      }
      if (r16 === 'BC') {
        if (srcScalarExact === 'byte') {
          diagAt(diagnostics, inst.span, 'Word register load requires a word-typed source.');
          return true;
        }
        if (srcResolved?.kind === 'stack') return emitStepPipeline(LOAD_RP_FVAR('BC', srcResolved.ixDisp), inst.span);
        if (srcResolved?.kind === 'abs') {
          if (srcResolved.addend === 0 && emitStepPipeline(LOAD_RP_GLOB('BC', srcResolved.baseLower), inst.span)) {
            return true;
          }
          emitAbs16FixupEd(0x4b, srcResolved.baseLower, srcResolved.addend, inst.span);
          return true;
        }
        const srcPipeW = buildEaWordPipeline(src.expr, inst.span);
        if (srcPipeW && emitStepPipeline(TEMPLATE_LW_BC(srcPipeW), inst.span)) return true;
        if (!materializeEaAddressToHL(src.expr, inst.span)) return false;
        return emitLoadWordFromHlAddress('BC', inst.span);
      }
      if (r16 === 'SP' && srcResolved?.kind === 'abs') {
        emitAbs16FixupEd(0x7b, srcResolved.baseLower, srcResolved.addend, inst.span);
        setSpTrackingInvalid();
        return true;
      }
      if (r16 === 'IX' || r16 === 'IY') {
        if (srcResolved?.kind === 'abs') {
          emitAbs16FixupPrefixed(r16 === 'IX' ? 0xdd : 0xfd, 0x2a, srcResolved.baseLower, srcResolved.addend, inst.span);
          return true;
        }
        if (!materializeEaAddressToHL(src.expr, inst.span)) return false;
        if (!emitLoadWordFromHlAddress('HL', inst.span)) return false;
        if (
          !emitInstr('push', [{ kind: 'Reg', span: inst.span, name: 'HL' }], inst.span) ||
          !emitInstr('pop', [{ kind: 'Reg', span: inst.span, name: r16 }], inst.span)
        ) {
          return false;
        }
        return true;
      }
    }

    if (dst.kind === 'Mem' && src.kind === 'Reg') {
      if (form.dstHasRegisterLikeEaBase) return false;
      if (form.dstIsIxIyDispMem && reg8Code.has(src.name.toUpperCase())) return false;
      if (form.dstIsEaNameHL) return false;
      if (src.name.toUpperCase() === 'A' && form.dstIsEaNameBCorDE) return false;
      if (src.name.toUpperCase() === 'A' && dstResolved?.kind === 'abs') {
        emitAbs16Fixup(0x32, dstResolved.baseLower, dstResolved.addend, inst.span);
        return true;
      }
      const s8 = reg8Code.get(src.name.toUpperCase());
      if (s8 !== undefined) {
        const regUp = src.name.toUpperCase();
        if (dstResolved?.kind === 'abs' && dstResolved.addend === 0) {
          if (!emitInstr('push', [{ kind: 'Reg', span: inst.span, name: 'AF' }], inst.span)) return false;
          if (
            !emitInstr(
              'ld',
              [
                { kind: 'Reg', span: inst.span, name: 'A' },
                { kind: 'Reg', span: inst.span, name: regUp },
              ],
              inst.span,
            )
          ) {
            return false;
          }
          emitAbs16Fixup(0x32, dstResolved.baseLower, 0, inst.span);
          return emitInstr('pop', [{ kind: 'Reg', span: inst.span, name: 'AF' }], inst.span);
        }

        if (dstResolved?.kind === 'stack' && dstResolved.ixDisp >= -0x80 && dstResolved.ixDisp <= 0x7f) {
          if (regUp === 'H' || regUp === 'L') {
            if (
              !emitInstr(
                'ex',
                [
                  { kind: 'Reg', span: inst.span, name: 'DE' },
                  { kind: 'Reg', span: inst.span, name: 'HL' },
                ],
                inst.span,
              )
            ) {
              return false;
            }
            if (
              !emitInstr(
                'ld',
                [
                  ixDispMem(dstResolved.ixDisp),
                  { kind: 'Reg', span: inst.span, name: regUp === 'H' ? 'D' : 'E' },
                ],
                inst.span,
              )
            ) {
              return false;
            }
            return emitInstr(
              'ex',
              [
                { kind: 'Reg', span: inst.span, name: 'DE' },
                { kind: 'Reg', span: inst.span, name: 'HL' },
              ],
              inst.span,
            );
          }
          emitRawCodeBytes(
            Uint8Array.of(0xdd, 0x70 + s8, dstResolved.ixDisp & 0xff),
            inst.span.file,
            `ld (ix${formatIxDisp(dstResolved.ixDisp)}), ${regUp}`,
          );
          return true;
        }

        const dstPipe = buildEaBytePipeline(dst.expr, inst.span);
        if (dstPipe) {
          if ((regUp === 'H' || regUp === 'L') && emitStepPipeline(TEMPLATE_S_HL(regUp as 'H' | 'L', dstPipe), inst.span)) {
            return true;
          }
          if (emitStepPipeline(TEMPLATE_S_ANY(regUp, dstPipe), inst.span)) return true;
        }
        const preserveA = regUp === 'A';
        if (preserveA && !emitInstr('push', [{ kind: 'Reg', span: inst.span, name: 'AF' }], inst.span)) return false;
        if (!materializeEaAddressToHL(dst.expr, inst.span)) {
          if (preserveA) return emitInstr('pop', [{ kind: 'Reg', span: inst.span, name: 'AF' }], inst.span);
          return false;
        }
        emitRawCodeBytes(Uint8Array.of(0x70 + s8), inst.span.file, `ld (hl), ${regUp}`);
        if (preserveA && !emitInstr('pop', [{ kind: 'Reg', span: inst.span, name: 'AF' }], inst.span)) return false;
        return true;
      }

      const r16 = src.name.toUpperCase();
      if (r16 === 'HL') {
        if (dstScalarExact === 'byte') {
          diagAt(diagnostics, inst.span, 'Word register store requires a word-typed destination.');
          return true;
        }
        const dstPipeW = buildEaWordPipeline(dst.expr, inst.span);
        if (dstPipeW && emitStepPipeline(TEMPLATE_SW_HL(dstPipeW), inst.span)) return true;
        if (dstResolved?.kind === 'stack') return emitStepPipeline(STORE_RP_FVAR('HL', dstResolved.ixDisp), inst.span);
        if (dstResolved?.kind === 'abs') {
          if (dstResolved.addend === 0 && emitStepPipeline(STORE_RP_GLOB('HL', dstResolved.baseLower), inst.span)) {
            return true;
          }
          emitAbs16Fixup(0x22, dstResolved.baseLower, dstResolved.addend, inst.span);
          return true;
        }
        return emitStoreSavedHlToEa(dst.expr, inst.span);
      }
      if (r16 === 'DE') {
        if (dstScalarExact === 'byte') {
          diagAt(diagnostics, inst.span, 'Word register store requires a word-typed destination.');
          return true;
        }
        const dstPipeW = buildEaWordPipeline(dst.expr, inst.span);
        if (dstPipeW) return emitStepPipeline(TEMPLATE_SW_DEBC('DE', dstPipeW), inst.span);
        if (dstResolved?.kind === 'stack') return emitStepPipeline(STORE_RP_FVAR('DE', dstResolved.ixDisp), inst.span);
        if (dstResolved?.kind === 'abs') {
          if (dstResolved.addend === 0 && emitStepPipeline(STORE_RP_GLOB('DE', dstResolved.baseLower), inst.span)) {
            return true;
          }
          emitAbs16FixupEd(0x53, dstResolved.baseLower, dstResolved.addend, inst.span);
          return true;
        }
        if (!materializeEaAddressToHL(dst.expr, inst.span)) return false;
        return emitStoreWordToHlAddress('DE', inst.span);
      }
      if (r16 === 'BC') {
        if (dstScalarExact === 'byte') {
          diagAt(diagnostics, inst.span, 'Word register store requires a word-typed destination.');
          return true;
        }
        const dstPipeW = buildEaWordPipeline(dst.expr, inst.span);
        if (dstPipeW) return emitStepPipeline(TEMPLATE_SW_DEBC('BC', dstPipeW), inst.span);
        if (dstResolved?.kind === 'stack') return emitStepPipeline(STORE_RP_FVAR('BC', dstResolved.ixDisp), inst.span);
        if (dstResolved?.kind === 'abs') {
          if (dstResolved.addend === 0 && emitStepPipeline(STORE_RP_GLOB('BC', dstResolved.baseLower), inst.span)) {
            return true;
          }
          emitAbs16FixupEd(0x43, dstResolved.baseLower, dstResolved.addend, inst.span);
          return true;
        }
        if (!materializeEaAddressToHL(dst.expr, inst.span)) return false;
        return emitStoreWordToHlAddress('BC', inst.span);
      }
      if (r16 === 'SP' && dstResolved?.kind === 'abs') {
        emitAbs16FixupEd(0x73, dstResolved.baseLower, dstResolved.addend, inst.span);
        return true;
      }
      if (r16 === 'IX' || r16 === 'IY') {
        if (dstResolved?.kind === 'abs') {
          emitAbs16FixupPrefixed(r16 === 'IX' ? 0xdd : 0xfd, 0x22, dstResolved.baseLower, dstResolved.addend, inst.span);
          return true;
        }
        if (
          !emitInstr('push', [{ kind: 'Reg', span: inst.span, name: r16 }], inst.span) ||
          !emitInstr('pop', [{ kind: 'Reg', span: inst.span, name: 'DE' }], inst.span)
        ) {
          return false;
        }
        if (!materializeEaAddressToHL(dst.expr, inst.span)) return false;
        return emitStoreWordToHlAddress('DE', inst.span);
      }
    }

    if (dst.kind === 'Mem' && src.kind === 'Mem') {
      if (
        (srcScalarExact === 'byte' && isWordCompatibleScalarKind(dstScalarExact)) ||
        (dstScalarExact === 'byte' && isWordCompatibleScalarKind(srcScalarExact))
      ) {
        diagAt(diagnostics, inst.span, 'Word mem->mem move requires word-typed source and destination.');
        return true;
      }
      if (
        scalarMemToMem !== undefined &&
        dstResolved?.kind === 'stack' &&
        srcResolved?.kind === 'stack' &&
        dstResolved.ixDisp >= -0x80 &&
        dstResolved.ixDisp <= 0x7f &&
        srcResolved.ixDisp >= -0x80 &&
        srcResolved.ixDisp <= 0x7f
      ) {
        const dstLoDisp = dstResolved.ixDisp;
        const dstHiDisp = dstResolved.ixDisp + 1;
        const srcLoDisp = srcResolved.ixDisp;
        const srcHiDisp = srcResolved.ixDisp + 1;
        const fmtIxDisp = (disp: number): string => {
          const abs = Math.abs(disp).toString(16).padStart(4, '0').toUpperCase();
          return disp >= 0 ? `(IX + $${abs})` : `(IX - $${abs})`;
        };
        const dstLo = dstLoDisp & 0xff;
        const dstHi = dstHiDisp & 0xff;
        const srcLo = srcLoDisp & 0xff;
        const srcHi = srcHiDisp & 0xff;

        if (scalarMemToMem === 'byte') {
          emitRawCodeBytes(Uint8Array.of(0xdd, 0x5e, srcLo), inst.span.file, `ld e, ${fmtIxDisp(srcLoDisp)}`);
          emitRawCodeBytes(Uint8Array.of(0xdd, 0x73, dstLo), inst.span.file, `ld ${fmtIxDisp(dstLoDisp)}, e`);
          return true;
        }

        emitRawCodeBytes(Uint8Array.of(0xdd, 0x5e, srcLo), inst.span.file, `ld e, ${fmtIxDisp(srcLoDisp)}`);
        emitRawCodeBytes(Uint8Array.of(0xdd, 0x56, srcHi), inst.span.file, `ld d, ${fmtIxDisp(srcHiDisp)}`);
        emitRawCodeBytes(Uint8Array.of(0xdd, 0x73, dstLo), inst.span.file, `ld ${fmtIxDisp(dstLoDisp)}, e`);
        emitRawCodeBytes(Uint8Array.of(0xdd, 0x72, dstHi), inst.span.file, `ld ${fmtIxDisp(dstHiDisp)}, d`);
        return true;
      }

      if (!scalarMemToMem) return false;
      if (scalarMemToMem === 'byte') {
        const srcPipe = buildEaBytePipeline(src.expr, inst.span);
        const dstPipe = buildEaBytePipeline(dst.expr, inst.span);
        if (srcPipe && dstPipe) {
          if (!emitStepPipeline(TEMPLATE_L_ABC('A', srcPipe), inst.span)) return false;
          if (!emitStepPipeline(TEMPLATE_S_ANY('A', dstPipe), inst.span)) return false;
          return true;
        }
        if (!emitInstr('push', [{ kind: 'Reg', span: inst.span, name: 'AF' }], inst.span)) return false;
        if (!materializeEaAddressToHL(src.expr, inst.span)) return false;
        emitRawCodeBytes(Uint8Array.of(0x7e), inst.span.file, 'ld a, (hl)');
        if (!materializeEaAddressToHL(dst.expr, inst.span)) return false;
        emitRawCodeBytes(Uint8Array.of(0x77), inst.span.file, 'ld (hl), a');
        if (!emitInstr('pop', [{ kind: 'Reg', span: inst.span, name: 'AF' }], inst.span)) return false;
        return true;
      }
      const srcPipeW = buildEaWordPipeline(src.expr, inst.span);
      const dstPipeW = buildEaWordPipeline(dst.expr, inst.span);
      if (srcPipeW && dstPipeW) {
        if (!emitStepPipeline(TEMPLATE_LW_DE(srcPipeW), inst.span)) return false;
        if (!emitStepPipeline(TEMPLATE_SW_DEBC('DE', dstPipeW), inst.span)) return false;
        return true;
      }
      if (srcPipeW && canUseScalarWordAccessor(dstResolved)) {
        if (!emitStepPipeline(TEMPLATE_LW_DE(srcPipeW), inst.span)) return false;
        if (!emitScalarWordStore('DE', dstResolved, inst.span)) return false;
        return true;
      }
      if (canUseScalarWordAccessor(srcResolved) && dstPipeW) {
        if (!emitScalarWordLoad('DE', srcResolved, inst.span)) return false;
        if (!emitStepPipeline(TEMPLATE_SW_DEBC('DE', dstPipeW), inst.span)) return false;
        return true;
      }
      if (canUseScalarWordAccessor(srcResolved) && canUseScalarWordAccessor(dstResolved)) {
        if (!emitScalarWordLoad('DE', srcResolved, inst.span)) return false;
        if (!emitScalarWordStore('DE', dstResolved, inst.span)) return false;
        return true;
      }
      if (!materializeEaAddressToHL(src.expr, inst.span)) return false;
      if (!emitLoadWordFromHlAddress('DE', inst.span)) return false;
      if (!emitInstr('push', [{ kind: 'Reg', span: inst.span, name: 'DE' }], inst.span)) return false;
      if (!materializeEaAddressToHL(dst.expr, inst.span)) return false;
      if (!emitInstr('pop', [{ kind: 'Reg', span: inst.span, name: 'DE' }], inst.span)) return false;
      return emitStoreWordToHlAddress('DE', inst.span);
    }

    if (dst.kind === 'Mem' && src.kind === 'Imm') {
      if (form.dstHasRegisterLikeEaBase) return false;
      if (form.dstIsIxIyDispMem) return false;
      if (form.dstIsEaNameHL) return false;
      const scalar =
        dstResolved?.typeExpr !== undefined ? resolveScalarKind(dstResolved.typeExpr, new Set()) : undefined;
      const v = evalImmExpr(src.expr);
      if (v === undefined) {
        diagAt(diagnostics, inst.span, 'ld (ea), imm expects a constant imm expression.');
        return true;
      }
      const fitsImm8 = (value: number): boolean => value >= -0x80 && value <= 0xff;
      const fitsImm16 = (value: number): boolean => value >= -0x8000 && value <= 0xffff;

      if (scalar === 'byte') {
        if (!fitsImm8(v)) {
          diagAt(diagnostics, inst.span, 'ld (ea), imm expects imm8.');
          return true;
        }
        if (!materializeEaAddressToHL(dst.expr, inst.span)) return true;
        return emitInstr(
          'ld',
          [
            { kind: 'Mem', span: inst.span, expr: { kind: 'EaName', span: inst.span, name: 'HL' } },
            { kind: 'Imm', span: inst.span, expr: { kind: 'ImmLiteral', span: inst.span, value: v } },
          ],
          inst.span,
        );
      }

      if (scalar === 'word' || scalar === 'addr') {
        if (!fitsImm16(v)) {
          diagAt(diagnostics, inst.span, 'ld (ea), imm expects imm16.');
          return true;
        }
        if (dstResolved?.kind === 'abs') {
          if (!loadImm16ToHL(v, inst.span)) return true;
          emitAbs16Fixup(0x22, dstResolved.baseLower, dstResolved.addend, inst.span);
          return true;
        }
        if (!materializeEaAddressToHL(dst.expr, inst.span)) return true;
        const lo = v & 0xff;
        const hi = (v >> 8) & 0xff;
        if (
          !emitInstr(
            'ld',
            [
              { kind: 'Mem', span: inst.span, expr: { kind: 'EaName', span: inst.span, name: 'HL' } },
              { kind: 'Imm', span: inst.span, expr: { kind: 'ImmLiteral', span: inst.span, value: lo } },
            ],
            inst.span,
          )
        ) {
          return true;
        }
        if (!emitInstr('inc', [{ kind: 'Reg', span: inst.span, name: 'HL' }], inst.span)) return true;
        return emitInstr(
          'ld',
          [
            { kind: 'Mem', span: inst.span, expr: { kind: 'EaName', span: inst.span, name: 'HL' } },
            { kind: 'Imm', span: inst.span, expr: { kind: 'ImmLiteral', span: inst.span, value: hi } },
          ],
          inst.span,
        );
      }

      diagAt(diagnostics, inst.span, 'ld (ea), imm is supported only for byte/word/addr destinations.');
      return true;
    }

    return false;
  };

  return { emitLdForm };
}

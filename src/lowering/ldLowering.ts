import type { StepPipeline } from '../addressing/steps.js';
import type { AsmInstructionNode, AsmOperandNode, EaExprNode } from '../frontend/ast.js';

export function createLdLoweringHelpers(ctx: any) {
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
    env,
    evalImmExpr,
    formatIxDisp,
    isWordCompatibleScalarKind,
    loadImm16ToHL,
    materializeEaAddressToHL,
    reg8Code,
    resolveEa,
    resolveScalarBinding,
    resolveScalarKind,
    resolveScalarTypeForEa,
    resolveScalarTypeForLd,
    resolvedScalarKind,
    setSpTrackingInvalid,
    stackSlotOffsets,
    storageTypes,
  } = ctx;

  const lowerLdWithEa = (inst: AsmInstructionNode): boolean => {
    if (inst.head.toLowerCase() !== 'ld' || inst.operands.length !== 2) return false;
    const coerceValueOperand = (op: AsmOperandNode): AsmOperandNode => {
      if (op.kind === 'Imm' && op.expr.kind === 'ImmName') {
        const scalar = resolveScalarBinding(op.expr.name);
        if (scalar) {
          return {
            kind: 'Mem',
            span: op.span,
            expr: { kind: 'EaName', span: op.span, name: op.expr.name },
          };
        }
      }
      if (op.kind === 'Reg') {
        const lower = op.name.toLowerCase();
        if (stackSlotOffsets.has(lower) || storageTypes.has(lower) || env.consts.has(lower)) {
          return {
            kind: 'Mem',
            span: op.span,
            expr: { kind: 'EaName', span: op.span, name: op.name },
          };
        }
      }
      if (op.kind === 'Ea') {
        if (op.explicitAddressOf) return op;
        // Use resolveScalarTypeForLd to allow indexed access to data arrays
        const scalar = resolveScalarTypeForLd(op.expr);
        if (scalar) return { kind: 'Mem', span: op.span, expr: op.expr };
      }
      return op;
    };
    const dst = coerceValueOperand(inst.operands[0]!);
    const src = coerceValueOperand(inst.operands[1]!);
    const isRegisterToken = (name: string): boolean => {
      const token = name.toUpperCase();
      return (
        token === 'A' ||
        token === 'B' ||
        token === 'C' ||
        token === 'D' ||
        token === 'E' ||
        token === 'H' ||
        token === 'L' ||
        token === 'AF' ||
        token === 'BC' ||
        token === 'DE' ||
        token === 'HL' ||
        token === 'SP' ||
        token === 'IX' ||
        token === 'IY' ||
        token === 'IXH' ||
        token === 'IXL' ||
        token === 'IYH' ||
        token === 'IYL'
      );
    };
    const isBoundEaName = (name: string): boolean => {
      const lower = name.toLowerCase();
      return stackSlotOffsets.has(lower) || storageTypes.has(lower) || env.consts.has(lower);
    };
    const hasRegisterLikeEaBase = (ea: EaExprNode): boolean => {
      switch (ea.kind) {
        case 'EaName':
          return isRegisterToken(ea.name) && !isBoundEaName(ea.name);
        case 'EaField':
          return hasRegisterLikeEaBase(ea.base);
        case 'EaIndex':
          return hasRegisterLikeEaBase(ea.base);
        case 'EaAdd':
        case 'EaSub':
          return hasRegisterLikeEaBase(ea.base);
      }
    };
    const isEaNameHL = (ea: EaExprNode): boolean =>
      ea.kind === 'EaName' && ea.name.toUpperCase() === 'HL';
    const isEaNameBCorDE = (ea: EaExprNode): boolean =>
      ea.kind === 'EaName' && (ea.name.toUpperCase() === 'BC' || ea.name.toUpperCase() === 'DE');
    const isIxIyBaseEa = (ea: EaExprNode): boolean =>
      ea.kind === 'EaName' && (ea.name.toUpperCase() === 'IX' || ea.name.toUpperCase() === 'IY');
    const isIxIyDispMem = (op: AsmOperandNode): boolean =>
      op.kind === 'Mem' &&
      (isIxIyBaseEa(op.expr) ||
        (op.expr.kind === 'EaIndex' &&
          isIxIyBaseEa(op.expr.base) &&
          op.expr.index.kind === 'IndexImm') ||
        ((op.expr.kind === 'EaAdd' || op.expr.kind === 'EaSub') && isIxIyBaseEa(op.expr.base)));
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
  
    // LD r8, (ea)
    if (dst.kind === 'Reg' && src.kind === 'Mem') {
      const srcResolved = resolveEa(src.expr, inst.span);
      if (hasRegisterLikeEaBase(src.expr)) return false;
      if (isIxIyDispMem(src) && reg8Code.has(dst.name.toUpperCase())) return false; // let encoder handle (ix/iy+disp)
      if (isEaNameHL(src.expr)) return false; // let the encoder handle (hl)
      if (dst.name.toUpperCase() === 'A' && isEaNameBCorDE(src.expr)) return false; // ld a,(bc|de)
      if (dst.name.toUpperCase() === 'A') {
        const r = resolveEa(src.expr, inst.span);
        if (r?.kind === 'abs') {
          emitAbs16Fixup(0x3a, r.baseLower, r.addend, inst.span); // ld a, (nn)
          return true;
        }
      }
      const regUp = dst.name.toUpperCase();
      const d = reg8Code.get(regUp);
      if (d !== undefined) {
        if (srcResolved?.kind === 'abs' && srcResolved.addend === 0) {
          if (!emitInstr('push', [{ kind: 'Reg', span: inst.span, name: 'AF' }], inst.span))
            return false;
          emitAbs16Fixup(0x3a, srcResolved.baseLower, 0, inst.span); // ld a, (nn)
          if (
            !emitInstr(
              'ld',
              [
                { kind: 'Reg', span: inst.span, name: regUp },
                { kind: 'Reg', span: inst.span, name: 'A' },
              ],
              inst.span,
            )
          )
            return false;
          return emitInstr('pop', [{ kind: 'Reg', span: inst.span, name: 'AF' }], inst.span);
        }
  
        // Fast path: reg8 <- stack slot via IX+d. H/L use the DE shuttle so DE is preserved.
        if (
          srcResolved?.kind === 'stack' &&
          srcResolved.ixDisp >= -0x80 &&
          srcResolved.ixDisp <= 0x7f
        ) {
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
            )
              return false;
            if (
              !emitInstr(
                'ld',
                [
                  { kind: 'Reg', span: inst.span, name: regUp === 'H' ? 'D' : 'E' },
                  ixDispMem(srcResolved.ixDisp),
                ],
                inst.span,
              )
            )
              return false;
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
  
        // Template path via step library (preservation-safe) when EA can be built.
        const eaPipe = buildEaBytePipeline(src.expr, inst.span);
        if (eaPipe) {
          let templated: StepPipeline | null = null;
          if (regUp === 'A' || regUp === 'B' || regUp === 'C') {
            templated = TEMPLATE_L_ABC(regUp, eaPipe);
          } else if (regUp === 'H' || regUp === 'L') {
            templated = TEMPLATE_L_HL(regUp as 'H' | 'L', eaPipe);
          } else if (regUp === 'D' || regUp === 'E') {
            templated = TEMPLATE_L_DE(regUp as 'D' | 'E', eaPipe);
          }
          if (templated && emitStepPipeline(templated, inst.span)) return true;
        }
  
        if (!materializeEaAddressToHL(src.expr, inst.span)) return false;
        emitRawCodeBytes(Uint8Array.of(0x46 + (d << 3)), inst.span.file, `ld ${regUp}, (hl)`);
        return true;
      }
  
      const r16 = dst.name.toUpperCase();
      if (r16 === 'HL') {
        if (resolvedScalarKind(srcResolved) === 'byte') {
          diagAt(diagnostics, inst.span, `Word register load requires a word-typed source.`);
          return true;
        }
        if (srcResolved?.kind === 'stack') {
          return emitStepPipeline(LOAD_RP_FVAR('HL', srcResolved.ixDisp), inst.span);
        }
        const r = resolveEa(src.expr, inst.span);
        if (r?.kind === 'abs') {
          if (r.addend === 0 && emitStepPipeline(LOAD_RP_GLOB('HL', r.baseLower), inst.span)) {
            return true;
          }
          emitAbs16Fixup(0x2a, r.baseLower, r.addend, inst.span); // ld hl, (nn)
          return true;
        }
        const srcPipeW = buildEaWordPipeline(src.expr, inst.span);
        if (srcPipeW && emitStepPipeline(TEMPLATE_LW_HL(srcPipeW), inst.span)) return true;
        if (!materializeEaAddressToHL(src.expr, inst.span)) return false;
        return emitLoadWordFromHlAddress('HL', inst.span);
      }
      if (r16 === 'DE') {
        if (resolvedScalarKind(srcResolved) === 'byte') {
          diagAt(diagnostics, inst.span, `Word register load requires a word-typed source.`);
          return true;
        }
        if (srcResolved?.kind === 'stack') {
          return emitStepPipeline(LOAD_RP_FVAR('DE', srcResolved.ixDisp), inst.span);
        }
        const r = resolveEa(src.expr, inst.span);
        if (r?.kind === 'abs') {
          if (r.addend === 0 && emitStepPipeline(LOAD_RP_GLOB('DE', r.baseLower), inst.span)) {
            return true;
          }
          emitAbs16FixupEd(0x5b, r.baseLower, r.addend, inst.span); // ld de, (nn)
          return true;
        }
        const srcPipeW = buildEaWordPipeline(src.expr, inst.span);
        if (srcPipeW && emitStepPipeline(TEMPLATE_LW_DE(srcPipeW), inst.span)) return true;
        if (!materializeEaAddressToHL(src.expr, inst.span)) return false;
        return emitLoadWordFromHlAddress('DE', inst.span);
      }
      if (r16 === 'BC') {
        if (resolvedScalarKind(srcResolved) === 'byte') {
          diagAt(diagnostics, inst.span, `Word register load requires a word-typed source.`);
          return true;
        }
        if (srcResolved?.kind === 'stack') {
          return emitStepPipeline(LOAD_RP_FVAR('BC', srcResolved.ixDisp), inst.span);
        }
        const r = resolveEa(src.expr, inst.span);
        if (r?.kind === 'abs') {
          if (r.addend === 0 && emitStepPipeline(LOAD_RP_GLOB('BC', r.baseLower), inst.span)) {
            return true;
          }
          emitAbs16FixupEd(0x4b, r.baseLower, r.addend, inst.span); // ld bc, (nn)
          return true;
        }
        const srcPipeW = buildEaWordPipeline(src.expr, inst.span);
        if (srcPipeW && emitStepPipeline(TEMPLATE_LW_BC(srcPipeW), inst.span)) return true;
        if (!materializeEaAddressToHL(src.expr, inst.span)) return false;
        return emitLoadWordFromHlAddress('BC', inst.span);
      }
      if (r16 === 'SP') {
        const r = resolveEa(src.expr, inst.span);
        if (r?.kind === 'abs') {
          emitAbs16FixupEd(0x7b, r.baseLower, r.addend, inst.span); // ld sp, (nn)
          setSpTrackingInvalid();
          return true;
        }
      }
      if (r16 === 'IX' || r16 === 'IY') {
        const r = resolveEa(src.expr, inst.span);
        if (r?.kind === 'abs') {
          emitAbs16FixupPrefixed(
            r16 === 'IX' ? 0xdd : 0xfd,
            0x2a,
            r.baseLower,
            r.addend,
            inst.span,
          ); // ld ix/iy, (nn)
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
  
    // LD (ea), r8/r16
    if (dst.kind === 'Mem' && src.kind === 'Reg') {
      const dstResolved = resolveEa(dst.expr, inst.span);
      if (hasRegisterLikeEaBase(dst.expr)) return false;
      if (isIxIyDispMem(dst) && reg8Code.has(src.name.toUpperCase())) return false; // let encoder handle (ix/iy+disp)
      if (isEaNameHL(dst.expr)) return false; // let the encoder handle (hl)
      if (src.name.toUpperCase() === 'A' && isEaNameBCorDE(dst.expr)) return false; // ld (bc|de),a
      if (src.name.toUpperCase() === 'A') {
        const r = resolveEa(dst.expr, inst.span);
        if (r?.kind === 'abs') {
          emitAbs16Fixup(0x32, r.baseLower, r.addend, inst.span); // ld (nn), a
          return true;
        }
      }
      const s8 = reg8Code.get(src.name.toUpperCase());
      if (s8 !== undefined) {
        const regUp = src.name.toUpperCase();
        if (dstResolved?.kind === 'abs' && dstResolved.addend === 0) {
          if (!emitInstr('push', [{ kind: 'Reg', span: inst.span, name: 'AF' }], inst.span))
            return false;
          if (
            !emitInstr(
              'ld',
              [
                { kind: 'Reg', span: inst.span, name: 'A' },
                { kind: 'Reg', span: inst.span, name: regUp },
              ],
              inst.span,
            )
          )
            return false;
          emitAbs16Fixup(0x32, dstResolved.baseLower, 0, inst.span); // ld (nn), a
          return emitInstr('pop', [{ kind: 'Reg', span: inst.span, name: 'AF' }], inst.span);
        }
  
        if (
          dstResolved?.kind === 'stack' &&
          dstResolved.ixDisp >= -0x80 &&
          dstResolved.ixDisp <= 0x7f
        ) {
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
            )
              return false;
            if (
              !emitInstr(
                'ld',
                [
                  ixDispMem(dstResolved.ixDisp),
                  { kind: 'Reg', span: inst.span, name: regUp === 'H' ? 'D' : 'E' },
                ],
                inst.span,
              )
            )
              return false;
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
          if (
            (regUp === 'H' || regUp === 'L') &&
            emitStepPipeline(TEMPLATE_S_HL(regUp as 'H' | 'L', dstPipe), inst.span)
          ) {
            return true;
          }
          if (emitStepPipeline(TEMPLATE_S_ANY(regUp, dstPipe), inst.span)) return true;
        }
        // Fallback: materialize address and emit direct store.
        const preserveA = regUp === 'A';
        if (
          preserveA &&
          !emitInstr('push', [{ kind: 'Reg', span: inst.span, name: 'AF' }], inst.span)
        ) {
          return false;
        }
        if (!materializeEaAddressToHL(dst.expr, inst.span)) {
          if (
            preserveA &&
            !emitInstr('pop', [{ kind: 'Reg', span: inst.span, name: 'AF' }], inst.span)
          ) {
            return false;
          }
          return false;
        }
        emitRawCodeBytes(Uint8Array.of(0x70 + s8), inst.span.file, `ld (hl), ${regUp}`);
        if (
          preserveA &&
          !emitInstr('pop', [{ kind: 'Reg', span: inst.span, name: 'AF' }], inst.span)
        ) {
          return false;
        }
        return true;
      }
  
      const r16 = src.name.toUpperCase();
      if (r16 === 'HL') {
        if (resolvedScalarKind(dstResolved) === 'byte') {
          diagAt(diagnostics, inst.span, `Word register store requires a word-typed destination.`);
          return true;
        }
        const dstPipeW = buildEaWordPipeline(dst.expr, inst.span);
        if (dstPipeW && emitStepPipeline(TEMPLATE_SW_HL(dstPipeW), inst.span)) return true;
        if (dstResolved?.kind === 'stack') {
          return emitStepPipeline(STORE_RP_FVAR('HL', dstResolved.ixDisp), inst.span);
        }
        const r = resolveEa(dst.expr, inst.span);
        if (r?.kind === 'abs') {
          if (r.addend === 0 && emitStepPipeline(STORE_RP_GLOB('HL', r.baseLower), inst.span)) {
            return true;
          }
          emitAbs16Fixup(0x22, r.baseLower, r.addend, inst.span); // ld (nn), hl
          return true;
        }
        return emitStoreSavedHlToEa(dst.expr, inst.span);
      }
      if (r16 === 'DE') {
        if (resolvedScalarKind(dstResolved) === 'byte') {
          diagAt(diagnostics, inst.span, `Word register store requires a word-typed destination.`);
          return true;
        }
        const dstPipeW = buildEaWordPipeline(dst.expr, inst.span);
        if (dstPipeW) {
          // Store DE via template.
          return emitStepPipeline(TEMPLATE_SW_DEBC('DE', dstPipeW), inst.span);
        }
        if (dstResolved?.kind === 'stack') {
          return emitStepPipeline(STORE_RP_FVAR('DE', dstResolved.ixDisp), inst.span);
        }
        const r = resolveEa(dst.expr, inst.span);
        if (r?.kind === 'abs') {
          if (r.addend === 0 && emitStepPipeline(STORE_RP_GLOB('DE', r.baseLower), inst.span)) {
            return true;
          }
          emitAbs16FixupEd(0x53, r.baseLower, r.addend, inst.span); // ld (nn), de
          return true;
        }
        if (!materializeEaAddressToHL(dst.expr, inst.span)) return false;
        return emitStoreWordToHlAddress('DE', inst.span);
      }
      if (r16 === 'BC') {
        if (resolvedScalarKind(dstResolved) === 'byte') {
          diagAt(diagnostics, inst.span, `Word register store requires a word-typed destination.`);
          return true;
        }
        const dstPipeW = buildEaWordPipeline(dst.expr, inst.span);
        if (dstPipeW) {
          // Store BC via template (uses DE/BC path).
          return emitStepPipeline(TEMPLATE_SW_DEBC('BC', dstPipeW), inst.span);
        }
        if (dstResolved?.kind === 'stack') {
          return emitStepPipeline(STORE_RP_FVAR('BC', dstResolved.ixDisp), inst.span);
        }
        const r = resolveEa(dst.expr, inst.span);
        if (r?.kind === 'abs') {
          if (r.addend === 0 && emitStepPipeline(STORE_RP_GLOB('BC', r.baseLower), inst.span)) {
            return true;
          }
          emitAbs16FixupEd(0x43, r.baseLower, r.addend, inst.span); // ld (nn), bc
          return true;
        }
        if (!materializeEaAddressToHL(dst.expr, inst.span)) return false;
        return emitStoreWordToHlAddress('BC', inst.span);
      }
      if (r16 === 'SP') {
        const r = resolveEa(dst.expr, inst.span);
        if (r?.kind === 'abs') {
          emitAbs16FixupEd(0x73, r.baseLower, r.addend, inst.span); // ld (nn), sp
          return true;
        }
      }
      if (r16 === 'IX' || r16 === 'IY') {
        const r = resolveEa(dst.expr, inst.span);
        if (r?.kind === 'abs') {
          emitAbs16FixupPrefixed(
            r16 === 'IX' ? 0xdd : 0xfd,
            0x22,
            r.baseLower,
            r.addend,
            inst.span,
          ); // ld (nn), ix/iy
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
  
    // LD (ea), (ea) via A/HL
    if (dst.kind === 'Mem' && src.kind === 'Mem') {
      const scalar =
        resolveScalarTypeForEa(dst.expr) ?? resolveScalarTypeForEa(src.expr) ?? undefined;
      const dstResolved = resolveEa(dst.expr, inst.span);
      const srcResolved = resolveEa(src.expr, inst.span);
      const dstScalarExact = resolvedScalarKind(dstResolved);
      const srcScalarExact = resolvedScalarKind(srcResolved);
      if (
        (srcScalarExact === 'byte' && isWordCompatibleScalarKind(dstScalarExact)) ||
        (dstScalarExact === 'byte' && isWordCompatibleScalarKind(srcScalarExact))
      ) {
        diagAt(
          diagnostics,
          inst.span,
          `Word mem->mem move requires word-typed source and destination.`,
        );
        return true;
      }
      // Stack-to-stack fast path using IX+d with DE shuttle; avoids HL address materialization.
      if (
        scalar !== undefined &&
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
  
        if (scalar === 'byte') {
          emitRawCodeBytes(
            Uint8Array.of(0xdd, 0x5e, srcLo),
            inst.span.file,
            `ld e, ${fmtIxDisp(srcLoDisp)}`,
          );
          emitRawCodeBytes(
            Uint8Array.of(0xdd, 0x73, dstLo),
            inst.span.file,
            `ld ${fmtIxDisp(dstLoDisp)}, e`,
          );
          return true;
        }
  
        // word/addr use DE shuttle: load from src then store to dst.
        emitRawCodeBytes(
          Uint8Array.of(0xdd, 0x5e, srcLo),
          inst.span.file,
          `ld e, ${fmtIxDisp(srcLoDisp)}`,
        );
        emitRawCodeBytes(
          Uint8Array.of(0xdd, 0x56, srcHi),
          inst.span.file,
          `ld d, ${fmtIxDisp(srcHiDisp)}`,
        );
        emitRawCodeBytes(
          Uint8Array.of(0xdd, 0x73, dstLo),
          inst.span.file,
          `ld ${fmtIxDisp(dstLoDisp)}, e`,
        );
        emitRawCodeBytes(
          Uint8Array.of(0xdd, 0x72, dstHi),
          inst.span.file,
          `ld ${fmtIxDisp(dstHiDisp)}, d`,
        );
        return true;
      }
  
      if (!scalar) return false;
      if (scalar === 'byte') {
        const srcPipe = buildEaBytePipeline(src.expr, inst.span);
        const dstPipe = buildEaBytePipeline(dst.expr, inst.span);
        if (srcPipe && dstPipe) {
          // Load via L-ABC (dest=A), then store via S-ANY. Templates preserve AF/DE/HL.
          if (!emitStepPipeline(TEMPLATE_L_ABC('A', srcPipe), inst.span)) return false;
          if (!emitStepPipeline(TEMPLATE_S_ANY('A', dstPipe), inst.span)) return false;
          return true;
        }
        // Fallback: materialize addresses, preserve A manually.
        if (!emitInstr('push', [{ kind: 'Reg', span: inst.span, name: 'AF' }], inst.span))
          return false;
        if (!materializeEaAddressToHL(src.expr, inst.span)) return false;
        emitRawCodeBytes(Uint8Array.of(0x7e), inst.span.file, 'ld a, (hl)');
        if (!materializeEaAddressToHL(dst.expr, inst.span)) return false;
        emitRawCodeBytes(Uint8Array.of(0x77), inst.span.file, 'ld (hl), a');
        if (!emitInstr('pop', [{ kind: 'Reg', span: inst.span, name: 'AF' }], inst.span))
          return false;
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
      if (!emitInstr('push', [{ kind: 'Reg', span: inst.span, name: 'DE' }], inst.span))
        return false;
      if (!materializeEaAddressToHL(dst.expr, inst.span)) return false;
      if (!emitInstr('pop', [{ kind: 'Reg', span: inst.span, name: 'DE' }], inst.span))
        return false;
      return emitStoreWordToHlAddress('DE', inst.span);
    }
  
    // LD (ea), imm (imm8 for byte, imm16 for word/addr)
    if (dst.kind === 'Mem' && src.kind === 'Imm') {
      if (hasRegisterLikeEaBase(dst.expr)) return false;
      if (isIxIyDispMem(dst)) return false; // let the encoder handle (ix/iy+disp), imm8
      if (isEaNameHL(dst.expr)) return false; // let the encoder handle (hl)
      const resolved = resolveEa(dst.expr, inst.span);
      const scalar =
        resolved?.typeExpr !== undefined
          ? resolveScalarKind(resolved.typeExpr, new Set())
          : undefined;
      const v = evalImmExpr(src.expr, env, diagnostics);
      if (v === undefined) {
        diagAt(diagnostics, inst.span, `ld (ea), imm expects a constant imm expression.`);
        return true;
      }
      const fitsImm8 = (value: number): boolean => value >= -0x80 && value <= 0xff;
      const fitsImm16 = (value: number): boolean => value >= -0x8000 && value <= 0xffff;
  
      if (scalar === 'byte') {
        if (!fitsImm8(v)) {
          diagAt(diagnostics, inst.span, `ld (ea), imm expects imm8.`);
          return true;
        }
        if (!materializeEaAddressToHL(dst.expr, inst.span)) return true;
        return emitInstr(
          'ld',
          [
            { kind: 'Mem', span: inst.span, expr: { kind: 'EaName', span: inst.span, name: 'HL' } },
            {
              kind: 'Imm',
              span: inst.span,
              expr: { kind: 'ImmLiteral', span: inst.span, value: v },
            },
          ],
          inst.span,
        );
      }
  
      if (scalar === 'word' || scalar === 'addr') {
        if (!fitsImm16(v)) {
          diagAt(diagnostics, inst.span, `ld (ea), imm expects imm16.`);
          return true;
        }
        const r = resolveEa(dst.expr, inst.span);
        if (r?.kind === 'abs') {
          // Fast path for absolute EA: store via `ld (nn), hl` after loading HL with the immediate.
          // This is smaller than emitting two separate byte stores.
          if (!loadImm16ToHL(v, inst.span)) return true;
          emitAbs16Fixup(0x22, r.baseLower, r.addend, inst.span); // ld (nn), hl
          return true;
        }
        if (!materializeEaAddressToHL(dst.expr, inst.span)) return true;
        const lo = v & 0xff;
        const hi = (v >> 8) & 0xff;
        if (
          !emitInstr(
            'ld',
            [
              {
                kind: 'Mem',
                span: inst.span,
                expr: { kind: 'EaName', span: inst.span, name: 'HL' },
              },
              {
                kind: 'Imm',
                span: inst.span,
                expr: { kind: 'ImmLiteral', span: inst.span, value: lo },
              },
            ],
            inst.span,
          )
        ) {
          return true;
        }
        if (!emitInstr('inc', [{ kind: 'Reg', span: inst.span, name: 'HL' }], inst.span))
          return true;
        return emitInstr(
          'ld',
          [
            { kind: 'Mem', span: inst.span, expr: { kind: 'EaName', span: inst.span, name: 'HL' } },
            {
              kind: 'Imm',
              span: inst.span,
              expr: { kind: 'ImmLiteral', span: inst.span, value: hi },
            },
          ],
          inst.span,
        );
      }
  
      diagAt(
        diagnostics,
        inst.span,
        `ld (ea), imm is supported only for byte/word/addr destinations.`,
      );
      return true;
    }
  
    return false;
  };

  return { lowerLdWithEa };
}

/**
 * Addressing step library (spec-driven, v0.2).
 *
 * These helpers are pure: they return pipelines of assembly strings
 * (one instruction per entry) and perform only light arithmetic
 * (const folding of frame displacements). No emitter side effects.
 *
 * Later, the lowering emitter can map these strings to actual
 * instruction emission; for now, the unit tests assert the sequences
 * match the reviewed `docs/addressing-model.md`.
 */

export type StepInstr = { asm: string };
export type StepPipeline = StepInstr[];

const instr = (asm: string): StepInstr => ({ asm });

// ---------------------------------------------------------------------------
// Save / restore
// ---------------------------------------------------------------------------
export const SAVE_HL = (): StepPipeline => [instr('push hl')];
export const SAVE_DE = (): StepPipeline => [instr('push de')];
export const RESTORE_HL = (): StepPipeline => [instr('pop hl')];
export const RESTORE_DE = (): StepPipeline => [instr('pop de')];
export const SWAP_HL_DE = (): StepPipeline => [instr('ex de, hl')];
export const SWAP_HL_SAVED = (): StepPipeline => [instr('ex (sp), hl')];

// ---------------------------------------------------------------------------
// Base loaders (DE = base)
// ---------------------------------------------------------------------------
export const LOAD_BASE_GLOB = (glob: string): StepPipeline => [instr(`ld de, ${glob}`)];

export const LOAD_BASE_FVAR = (disp: number): StepPipeline => {
  const d = formatDisp(disp);
  return [instr(`ld e, (ix${d})`), instr(`ld d, (ix${formatDisp(disp + 1)})`)];
};

// ---------------------------------------------------------------------------
// Index loaders (HL = index)
// ---------------------------------------------------------------------------
export const LOAD_IDX_CONST = (value: number): StepPipeline => [
  instr(`ld hl, ${formatImm16(value)}`),
];

export const LOAD_IDX_REG = (reg8: string): StepPipeline => [
  instr('ld h, 0'),
  instr(`ld l, ${reg8}`),
];

export const LOAD_IDX_RP = (rp: string): StepPipeline => [instr(`ld hl, ${rp}`)];

export const LOAD_IDX_GLOB = (glob: string): StepPipeline => [instr(`ld hl, (${glob})`)];

export const LOAD_IDX_FVAR = (disp: number): StepPipeline => [
  ...SWAP_HL_DE(),
  ...LOAD_BASE_FVAR(disp),
  ...SWAP_HL_DE(),
];

// ---------------------------------------------------------------------------
// Combine
// ---------------------------------------------------------------------------
export const CALC_EA = (): StepPipeline => [instr('add hl, de')];

export const CALC_EA_2 = (): StepPipeline => [instr('add hl, hl'), instr('add hl, de')];

// ---------------------------------------------------------------------------
// Accessors (byte)
// ---------------------------------------------------------------------------
export const LOAD_REG_EA = (reg: string): StepPipeline => [instr(`ld ${reg}, (hl)`)];

export const STORE_REG_EA = (reg: string): StepPipeline => [instr(`ld (hl), ${reg}`)];

export const LOAD_REG_GLOB = (reg: string, glob: string): StepPipeline => [
  ...(reg.toUpperCase() === 'A'
    ? [instr(`ld a, (${glob})`)]
    : [instr('push af'), instr(`ld a, (${glob})`), instr(`ld ${reg}, a`), instr('pop af')]),
];

export const STORE_REG_GLOB = (reg: string, glob: string): StepPipeline => [
  ...(reg.toUpperCase() === 'A'
    ? [instr(`ld (${glob}), a`)]
    : [instr('push af'), instr(`ld a, ${reg}`), instr(`ld (${glob}), a`), instr('pop af')]),
];

export const LOAD_REG_FVAR = (reg: string, disp: number): StepPipeline => [
  instr(`ld ${reg}, (ix${formatDisp(disp)})`),
];

export const STORE_REG_FVAR = (reg: string, disp: number): StepPipeline => [
  instr(`ld (ix${formatDisp(disp)}), ${reg}`),
];

export const LOAD_REG_REG = (dst: string, src: string): StepPipeline => [
  instr(`ld ${dst}, ${src}`),
];

// ---------------------------------------------------------------------------
// Accessors (word)
// ---------------------------------------------------------------------------
export const LOAD_RP_EA = (rp: string): StepPipeline => [
  instr('ld e, (hl)'),
  instr('inc hl'),
  instr('ld d, (hl)'),
  instr(`ld lo(${rp}), e`),
  instr(`ld hi(${rp}), d`),
];

export const STORE_RP_EA = (rp: string): StepPipeline => [
  instr(`ld e, lo(${rp})`),
  instr(`ld d, hi(${rp})`),
  instr('ld (hl), e'),
  instr('inc hl'),
  instr('ld (hl), d'),
];

export const STORE_RP_EA_FROM_STACK = (): StepPipeline => [
  instr('pop de'), // value
  instr('ld (hl), e'),
  instr('inc hl'),
  instr('ld (hl), d'),
];

export const LOAD_RP_GLOB = (rp: string, glob: string): StepPipeline => [
  instr(`ld ${rp}, (${glob})`),
];

export const STORE_RP_GLOB = (rp: string, glob: string): StepPipeline => [
  instr(`ld (${glob}), ${rp}`),
];

export const LOAD_RP_FVAR = (rp: string, disp: number): StepPipeline => [
  instr(`ld lo(${rp}), (ix${formatDisp(disp)})`),
  instr(`ld hi(${rp}), (ix${formatDisp(disp + 1)})`),
];

export const STORE_RP_FVAR = (rp: string, disp: number): StepPipeline => [
  instr(`ld (ix${formatDisp(disp)}), lo(${rp})`),
  instr(`ld (ix${formatDisp(disp + 1)}), hi(${rp})`),
];

// ---------------------------------------------------------------------------
// EA builders (byte size, HL=EA)
// ---------------------------------------------------------------------------
export const EA_GLOB_CONST = (glob: string, idxConst: number): StepPipeline => [
  ...LOAD_BASE_GLOB(glob),
  ...LOAD_IDX_CONST(idxConst),
  ...CALC_EA(),
];

export const EA_GLOB_REG = (glob: string, reg8: string): StepPipeline => [
  ...LOAD_BASE_GLOB(glob),
  ...LOAD_IDX_REG(reg8),
  ...CALC_EA(),
];

export const EA_GLOB_RP = (glob: string, rp: string): StepPipeline => [
  ...LOAD_BASE_GLOB(glob),
  ...LOAD_IDX_RP(rp),
  ...CALC_EA(),
];

export const EA_FVAR_CONST = (fvar: number, idxConst: number): StepPipeline => {
  const folded = foldFvar(fvar, idxConst);
  return [...LOAD_BASE_FVAR(folded.base), ...LOAD_IDX_CONST(folded.idx), ...CALC_EA()];
};

export const EA_FVAR_REG = (fvar: number, reg8: string): StepPipeline => [
  ...LOAD_BASE_FVAR(fvar),
  ...LOAD_IDX_REG(reg8),
  ...CALC_EA(),
];

export const EA_FVAR_RP = (fvar: number, rp: string): StepPipeline => [
  ...LOAD_BASE_FVAR(fvar),
  ...LOAD_IDX_RP(rp),
  ...CALC_EA(),
];

export const EA_GLOB_FVAR = (glob: string, fvar: number): StepPipeline => [
  ...LOAD_BASE_GLOB(glob),
  ...LOAD_IDX_FVAR(fvar),
  ...CALC_EA(),
];

export const EA_FVAR_FVAR = (fvarBase: number, fvarIdx: number): StepPipeline => [
  ...LOAD_BASE_FVAR(fvarBase),
  ...LOAD_IDX_FVAR(fvarIdx),
  ...CALC_EA(),
];

export const EA_FVAR_GLOB = (fvar: number, glob: string): StepPipeline => [
  ...LOAD_BASE_FVAR(fvar),
  ...LOAD_IDX_GLOB(glob),
  ...CALC_EA(),
];

export const EA_GLOB_GLOB = (globBase: string, globIdx: string): StepPipeline => [
  ...LOAD_BASE_GLOB(globBase),
  ...LOAD_IDX_GLOB(globIdx),
  ...CALC_EA(),
];

// ---------------------------------------------------------------------------
// EA builders (word size, HL=EA, scaled by 2)
// ---------------------------------------------------------------------------
export const EAW_GLOB_CONST = (glob: string, idxConst: number): StepPipeline => [
  ...LOAD_BASE_GLOB(glob),
  ...LOAD_IDX_CONST(idxConst),
  ...CALC_EA_2(),
];

export const EAW_GLOB_REG = (glob: string, reg8: string): StepPipeline => [
  ...LOAD_BASE_GLOB(glob),
  ...LOAD_IDX_REG(reg8),
  ...CALC_EA_2(),
];

export const EAW_GLOB_RP = (glob: string, rp: string): StepPipeline => [
  ...LOAD_BASE_GLOB(glob),
  ...LOAD_IDX_RP(rp),
  ...CALC_EA_2(),
];

export const EAW_FVAR_CONST = (fvar: number, idxConst: number): StepPipeline => {
  const folded = foldFvar(fvar, idxConst * 2); // scale const when folding
  return [...LOAD_BASE_FVAR(folded.base), ...LOAD_IDX_CONST(folded.idx), ...CALC_EA_2()];
};

export const EAW_FVAR_REG = (fvar: number, reg8: string): StepPipeline => [
  ...LOAD_BASE_FVAR(fvar),
  ...LOAD_IDX_REG(reg8),
  ...CALC_EA_2(),
];

export const EAW_FVAR_RP = (fvar: number, rp: string): StepPipeline => [
  ...LOAD_BASE_FVAR(fvar),
  ...LOAD_IDX_RP(rp),
  ...CALC_EA_2(),
];

export const EAW_GLOB_FVAR = (glob: string, fvar: number): StepPipeline => [
  ...LOAD_BASE_GLOB(glob),
  ...LOAD_IDX_FVAR(fvar),
  ...CALC_EA_2(),
];

export const EAW_FVAR_FVAR = (fvarBase: number, fvarIdx: number): StepPipeline => [
  ...LOAD_BASE_FVAR(fvarBase),
  ...LOAD_IDX_FVAR(fvarIdx),
  ...CALC_EA_2(),
];

export const EAW_FVAR_GLOB = (fvar: number, glob: string): StepPipeline => [
  ...LOAD_BASE_FVAR(fvar),
  ...LOAD_IDX_GLOB(glob),
  ...CALC_EA_2(),
];

export const EAW_GLOB_GLOB = (globBase: string, globIdx: string): StepPipeline => [
  ...LOAD_BASE_GLOB(globBase),
  ...LOAD_IDX_GLOB(globIdx),
  ...CALC_EA_2(),
];

// ---------------------------------------------------------------------------
// Templates: byte loads
// ---------------------------------------------------------------------------
export const TEMPLATE_L_ABC = (dest: string, ea: StepPipeline): StepPipeline => [
  ...SAVE_DE(),
  ...SAVE_HL(),
  ...ea,
  ...LOAD_REG_EA(dest),
  ...RESTORE_HL(),
  ...RESTORE_DE(),
];

export const TEMPLATE_L_HL = (dest: 'H' | 'L', ea: StepPipeline): StepPipeline => [
  ...SAVE_DE(),
  ...SAVE_HL(),
  ...ea,
  ...LOAD_REG_EA('E'),
  ...RESTORE_HL(),
  ...LOAD_REG_REG(dest, 'E'),
  ...RESTORE_DE(),
];

export const TEMPLATE_L_DE = (dest: 'D' | 'E', ea: StepPipeline): StepPipeline => [
  ...SAVE_HL(),
  ...SAVE_DE(),
  ...ea,
  ...LOAD_REG_EA('L'),
  ...RESTORE_DE(),
  ...LOAD_REG_REG(dest, 'L'),
  ...RESTORE_HL(),
];

// ---------------------------------------------------------------------------
// Templates: byte stores
// ---------------------------------------------------------------------------
export const TEMPLATE_S_ANY = (vreg: string, ea: StepPipeline): StepPipeline => [
  ...SAVE_DE(),
  ...SAVE_HL(),
  ...ea,
  ...STORE_REG_EA(vreg),
  ...RESTORE_HL(),
  ...RESTORE_DE(),
];

export const TEMPLATE_S_HL = (vreg: 'H' | 'L', ea: StepPipeline): StepPipeline => [
  // Save DE (caller may need it) and save the source byte (H/L) on the stack.
  ...SAVE_DE(), // stack: [orig DE]
  ...SAVE_HL(), // stack: [orig DE, value] (value = original H|L)
  ...ea, // HL = EA
  ...RESTORE_DE(), // DE = saved value (E=L, D=H). Stack: [orig DE]
  ...STORE_REG_EA(vreg === 'L' ? 'E' : 'D'), // store source byte at EA
  ...RESTORE_DE(),
];

// ---------------------------------------------------------------------------
// Templates: word loads
// ---------------------------------------------------------------------------
export const TEMPLATE_LW_HL = (ea: StepPipeline): StepPipeline => [
  ...SAVE_DE(),
  ...ea,
  ...LOAD_RP_EA('HL'),
  ...RESTORE_DE(),
];

export const TEMPLATE_LW_DE = (ea: StepPipeline): StepPipeline => [
  ...SAVE_HL(),
  ...ea,
  ...LOAD_RP_EA('HL'),
  ...SWAP_HL_DE(),
  ...RESTORE_HL(),
];

export const TEMPLATE_LW_BC = (ea: StepPipeline): StepPipeline => [
  ...SAVE_DE(),
  ...SAVE_HL(),
  ...ea,
  ...LOAD_RP_EA('HL'),
  ...LOAD_REG_REG('C', 'L'),
  ...LOAD_REG_REG('B', 'H'),
  ...RESTORE_HL(),
  ...RESTORE_DE(),
];

// ---------------------------------------------------------------------------
// Templates: word stores
// ---------------------------------------------------------------------------
export const TEMPLATE_SW_DEBC = (vpair: 'DE' | 'BC', ea: StepPipeline): StepPipeline => [
  ...SAVE_DE(),
  ...SAVE_HL(),
  ...ea,
  ...RESTORE_HL(),
  ...RESTORE_DE(),
  ...STORE_RP_EA(vpair),
];

export const TEMPLATE_SW_HL = (ea: StepPipeline): StepPipeline => [
  ...SAVE_DE(),
  ...SAVE_HL(),
  ...ea,
  ...STORE_RP_EA_FROM_STACK(), // pops value into DE
  ...RESTORE_DE(),
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDisp(disp: number): string {
  const hex = Math.abs(disp).toString(16).padStart(2, '0');
  const sign = disp >= 0 ? '+' : '-';
  return `${sign}$${hex}`;
}

function formatImm16(n: number): string {
  const value = ((n & 0xffff) >>> 0).toString(16).toUpperCase().padStart(4, '0');
  return `$${value}`;
}

function foldFvar(fvar: number, idxConst: number): { base: number; idx: number } {
  // Fold constant index into frame displacement when possible.
  // If folding would overflow byte displacement range, leave as-is.
  const disp = fvar + idxConst;
  if (disp >= -128 && disp <= 127) {
    return { base: disp, idx: 0 };
  }
  return { base: fvar, idx: idxConst };
}

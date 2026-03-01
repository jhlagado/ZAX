/**
 * Addressing step library (spec-driven, v0.4).
 *
 * These helpers are pure: they return typed step pipelines.
 * Rendering to pseudo-assembly text is only for tests/document checks.
 */

export type StepReg8 =
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'H'
  | 'L'
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'h'
  | 'l';
export type StepReg16 = 'BC' | 'DE' | 'HL';
export type StepStackReg = 'AF' | 'DE' | 'HL';
export type StepBytePart = 'lo' | 'hi';

export type StepInstr =
  | { kind: 'push'; reg: StepStackReg }
  | { kind: 'pop'; reg: StepStackReg }
  | { kind: 'exDeHl' }
  | { kind: 'exSpHl' }
  | { kind: 'addHlDe' }
  | { kind: 'addHlHl' }
  | { kind: 'incHl' }
  | { kind: 'ldHZero' }
  | { kind: 'ldRegReg'; dst: StepReg8; src: StepReg8 }
  | { kind: 'ldRegMemHl'; reg: StepReg8 }
  | { kind: 'ldMemHlReg'; reg: StepReg8 }
  | { kind: 'ldRegIxDisp'; reg: StepReg8; disp: number }
  | { kind: 'ldIxDispReg'; disp: number; reg: StepReg8 }
  | { kind: 'ldRpByteFromIx'; part: StepBytePart; rp: StepReg16; disp: number }
  | { kind: 'ldIxDispFromRpByte'; disp: number; part: StepBytePart; rp: StepReg16 }
  | { kind: 'ldRpImm'; rp: 'DE' | 'HL'; value: number }
  | { kind: 'ldRpGlob'; rp: 'DE' | 'HL'; glob: string }
  | { kind: 'ldHlPtrGlob'; glob: string }
  | { kind: 'ldRpPtrGlob'; rp: 'BC' | 'DE'; glob: string }
  | { kind: 'ldPtrGlobRp'; glob: string; rp: 'BC' | 'DE' | 'HL' }
  | { kind: 'ldHlRp'; rp: StepReg16 }
  | { kind: 'ldRegGlob'; reg: StepReg8; glob: string }
  | { kind: 'ldGlobReg'; glob: string; reg: StepReg8 }
  | { kind: 'ldRpByteFromReg'; part: StepBytePart; rp: StepReg16; reg: StepReg8 }
  | { kind: 'ldRegFromRpByte'; reg: StepReg8; part: StepBytePart; rp: StepReg16 };

export type StepPipeline = StepInstr[];

const step = <T extends StepInstr>(instr: T): T => instr;

export function renderStepInstr(instr: StepInstr): string {
  switch (instr.kind) {
    case 'push':
      return `push ${instr.reg.toLowerCase()}`;
    case 'pop':
      return `pop ${instr.reg.toLowerCase()}`;
    case 'exDeHl':
      return 'ex de, hl';
    case 'exSpHl':
      return 'ex (sp), hl';
    case 'addHlDe':
      return 'add hl, de';
    case 'addHlHl':
      return 'add hl, hl';
    case 'incHl':
      return 'inc hl';
    case 'ldHZero':
      return 'ld h, 0';
    case 'ldRegReg':
      return `ld ${instr.dst}, ${instr.src}`;
    case 'ldRegMemHl':
      return `ld ${instr.reg}, (hl)`;
    case 'ldMemHlReg':
      return `ld (hl), ${instr.reg}`;
    case 'ldRegIxDisp':
      return `ld ${instr.reg}, (ix${formatDisp(instr.disp)})`;
    case 'ldIxDispReg':
      return `ld (ix${formatDisp(instr.disp)}), ${instr.reg}`;
    case 'ldRpByteFromIx':
      return `ld ${instr.part}(${instr.rp}), (ix${formatDisp(instr.disp)})`;
    case 'ldIxDispFromRpByte':
      return `ld (ix${formatDisp(instr.disp)}), ${instr.part}(${instr.rp})`;
    case 'ldRpImm':
      return `ld ${instr.rp.toLowerCase()}, ${formatImm16(instr.value)}`;
    case 'ldRpGlob':
      return `ld ${instr.rp.toLowerCase()}, ${instr.glob}`;
    case 'ldHlPtrGlob':
      return `ld hl, (${instr.glob})`;
    case 'ldRpPtrGlob':
      return `ld ${instr.rp.toLowerCase()}, (${instr.glob})`;
    case 'ldPtrGlobRp':
      return `ld (${instr.glob}), ${instr.rp}`;
    case 'ldHlRp':
      return `ld hl, ${instr.rp.toLowerCase()}`;
    case 'ldRegGlob':
      return `ld ${instr.reg}, (${instr.glob})`;
    case 'ldGlobReg':
      return `ld (${instr.glob}), ${instr.reg}`;
    case 'ldRpByteFromReg':
      return `ld ${instr.part}(${instr.rp}), ${instr.reg}`;
    case 'ldRegFromRpByte':
      return `ld ${instr.reg}, ${instr.part}(${instr.rp})`;
  }
}

export const renderStepPipeline = (pipeline: StepPipeline): string[] =>
  pipeline.map(renderStepInstr);

// ---------------------------------------------------------------------------
// Save / restore
// ---------------------------------------------------------------------------
export const SAVE_HL = (): StepPipeline => [step({ kind: 'push', reg: 'HL' })];
export const SAVE_DE = (): StepPipeline => [step({ kind: 'push', reg: 'DE' })];
export const RESTORE_HL = (): StepPipeline => [step({ kind: 'pop', reg: 'HL' })];
export const RESTORE_DE = (): StepPipeline => [step({ kind: 'pop', reg: 'DE' })];
export const SWAP_HL_DE = (): StepPipeline => [step({ kind: 'exDeHl' })];
export const SWAP_HL_SAVED = (): StepPipeline => [step({ kind: 'exSpHl' })];

// ---------------------------------------------------------------------------
// Base loaders (DE = base)
// ---------------------------------------------------------------------------
export const LOAD_BASE_GLOB = (glob: string): StepPipeline => [
  step({ kind: 'ldRpGlob', rp: 'DE', glob }),
];

export const LOAD_BASE_FVAR = (disp: number): StepPipeline => [
  step({ kind: 'ldRegIxDisp', reg: 'e', disp }),
  step({ kind: 'ldRegIxDisp', reg: 'd', disp: disp + 1 }),
];

// ---------------------------------------------------------------------------
// Index loaders (HL = index)
// ---------------------------------------------------------------------------
export const LOAD_IDX_CONST = (value: number): StepPipeline => [
  step({ kind: 'ldRpImm', rp: 'HL', value }),
];

export const LOAD_IDX_REG = (reg8: string): StepPipeline => [
  step({ kind: 'ldHZero' }),
  step({ kind: 'ldRegReg', dst: 'l', src: reg8 as StepReg8 }),
];

export const LOAD_IDX_RP = (rp: string): StepPipeline => [
  step({ kind: 'ldHlRp', rp: rp.toUpperCase() as StepReg16 }),
];

export const LOAD_IDX_GLOB = (glob: string): StepPipeline => [step({ kind: 'ldHlPtrGlob', glob })];

export const LOAD_IDX_FVAR = (disp: number): StepPipeline => [
  ...SWAP_HL_DE(),
  ...LOAD_BASE_FVAR(disp),
  ...SWAP_HL_DE(),
];

// ---------------------------------------------------------------------------
// Combine
// ---------------------------------------------------------------------------
export const CALC_EA = (): StepPipeline => [step({ kind: 'addHlDe' })];

export const CALC_EA_2 = (): StepPipeline => [step({ kind: 'addHlHl' }), step({ kind: 'addHlDe' })];

// ---------------------------------------------------------------------------
// Accessors (byte)
// ---------------------------------------------------------------------------
export const LOAD_REG_EA = (reg: string): StepPipeline => [
  step({ kind: 'ldRegMemHl', reg: reg as StepReg8 }),
];

export const STORE_REG_EA = (reg: string): StepPipeline => [
  step({ kind: 'ldMemHlReg', reg: reg as StepReg8 }),
];

export const LOAD_REG_GLOB = (reg: string, glob: string): StepPipeline => [
  ...(reg.toUpperCase() === 'A'
    ? [step({ kind: 'ldRegGlob', reg: 'a', glob })]
    : [
        step({ kind: 'push', reg: 'AF' }),
        step({ kind: 'ldRegGlob', reg: 'a', glob }),
        step({ kind: 'ldRegReg', dst: reg as StepReg8, src: 'a' }),
        step({ kind: 'pop', reg: 'AF' }),
      ]),
];

export const STORE_REG_GLOB = (reg: string, glob: string): StepPipeline => [
  ...(reg.toUpperCase() === 'A'
    ? [step({ kind: 'ldGlobReg', glob, reg: 'a' })]
    : [
        step({ kind: 'push', reg: 'AF' }),
        step({ kind: 'ldRegReg', dst: 'a', src: reg as StepReg8 }),
        step({ kind: 'ldGlobReg', glob, reg: 'a' }),
        step({ kind: 'pop', reg: 'AF' }),
      ]),
];

export const LOAD_REG_FVAR = (reg: string, disp: number): StepPipeline => [
  step({ kind: 'ldRegIxDisp', reg: reg as StepReg8, disp }),
];

export const STORE_REG_FVAR = (reg: string, disp: number): StepPipeline => [
  step({ kind: 'ldIxDispReg', disp, reg: reg as StepReg8 }),
];

export const LOAD_REG_REG = (dst: string, src: string): StepPipeline => [
  step({
    kind: 'ldRegReg',
    dst: dst as StepReg8,
    src: src as StepReg8,
  }),
];

// ---------------------------------------------------------------------------
// Accessors (word)
// ---------------------------------------------------------------------------
export const LOAD_RP_EA = (rp: string): StepPipeline => [
  step({ kind: 'ldRegMemHl', reg: 'e' }),
  step({ kind: 'incHl' }),
  step({ kind: 'ldRegMemHl', reg: 'd' }),
  step({ kind: 'ldRpByteFromReg', part: 'lo', rp: rp.toUpperCase() as StepReg16, reg: 'e' }),
  step({ kind: 'ldRpByteFromReg', part: 'hi', rp: rp.toUpperCase() as StepReg16, reg: 'd' }),
];

export const STORE_RP_EA = (rp: string): StepPipeline => [
  ...(rp.toUpperCase() === 'DE'
    ? []
    : [
        step({ kind: 'ldRegFromRpByte', reg: 'e', part: 'lo', rp: rp.toUpperCase() as StepReg16 }),
        step({ kind: 'ldRegFromRpByte', reg: 'd', part: 'hi', rp: rp.toUpperCase() as StepReg16 }),
      ]),
  step({ kind: 'ldMemHlReg', reg: 'e' }),
  step({ kind: 'incHl' }),
  step({ kind: 'ldMemHlReg', reg: 'd' }),
];

export const STORE_RP_EA_FROM_STACK = (): StepPipeline => [
  step({ kind: 'pop', reg: 'DE' }),
  step({ kind: 'ldMemHlReg', reg: 'e' }),
  step({ kind: 'incHl' }),
  step({ kind: 'ldMemHlReg', reg: 'd' }),
];

export const LOAD_RP_GLOB = (rp: string, glob: string): StepPipeline => {
  const upper = rp.toUpperCase();
  if (upper === 'HL') return [step({ kind: 'ldHlPtrGlob', glob })];
  return [step({ kind: 'ldRpPtrGlob', rp: upper as 'BC' | 'DE', glob })];
};

export const STORE_RP_GLOB = (rp: string, glob: string): StepPipeline => [
  step({ kind: 'ldPtrGlobRp', glob, rp: rp.toUpperCase() as 'BC' | 'DE' | 'HL' }),
];

export const LOAD_RP_FVAR = (rp: string, disp: number): StepPipeline => [
  ...(rp.toUpperCase() === 'HL'
    ? [
        step({ kind: 'exDeHl' }),
        step({ kind: 'ldRegIxDisp', reg: 'e', disp }),
        step({ kind: 'ldRegIxDisp', reg: 'd', disp: disp + 1 }),
        step({ kind: 'exDeHl' }),
      ]
    : [
        step({
          kind: 'ldRpByteFromIx',
          part: 'lo',
          rp: rp.toUpperCase() as Exclude<StepReg16, never>,
          disp,
        }),
        step({
          kind: 'ldRpByteFromIx',
          part: 'hi',
          rp: rp.toUpperCase() as Exclude<StepReg16, never>,
          disp: disp + 1,
        }),
      ]),
];

export const STORE_RP_FVAR = (rp: string, disp: number): StepPipeline => [
  ...(rp.toUpperCase() === 'HL'
    ? [
        step({ kind: 'exDeHl' }),
        step({ kind: 'ldIxDispReg', disp, reg: 'e' }),
        step({ kind: 'ldIxDispReg', disp: disp + 1, reg: 'd' }),
        step({ kind: 'exDeHl' }),
      ]
    : [
        step({
          kind: 'ldIxDispFromRpByte',
          disp,
          part: 'lo',
          rp: rp.toUpperCase() as Exclude<StepReg16, never>,
        }),
        step({
          kind: 'ldIxDispFromRpByte',
          disp: disp + 1,
          part: 'hi',
          rp: rp.toUpperCase() as Exclude<StepReg16, never>,
        }),
      ]),
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
  const folded = foldFvar(fvar, idxConst * 2);
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
  ...SAVE_DE(),
  ...SAVE_HL(),
  ...ea,
  ...RESTORE_DE(),
  ...STORE_REG_EA(vreg === 'L' ? 'E' : 'D'),
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
export const TEMPLATE_SW_DEBC = (vpair: 'DE' | 'BC', ea: StepPipeline): StepPipeline =>
  vpair === 'DE'
    ? [...SAVE_HL(), ...SAVE_DE(), ...ea, ...RESTORE_DE(), ...STORE_RP_EA('DE'), ...RESTORE_HL()]
    : [...SAVE_DE(), ...SAVE_HL(), ...ea, ...STORE_RP_EA('BC'), ...RESTORE_HL(), ...RESTORE_DE()];

export const TEMPLATE_SW_HL = (ea: StepPipeline): StepPipeline => [
  ...SAVE_DE(),
  ...SAVE_HL(),
  ...ea,
  ...STORE_RP_EA_FROM_STACK(),
  ...RESTORE_DE(),
];

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
  const disp = fvar + idxConst;
  if (disp >= -128 && disp <= 127) {
    return { base: disp, idx: 0 };
  }
  return { base: fvar, idx: idxConst };
}

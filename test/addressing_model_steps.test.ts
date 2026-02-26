import { describe, it, expect } from 'vitest';
import {
  EA_GLOB_CONST,
  EA_GLOB_REG,
  EA_FVAR_CONST,
  EAW_GLOB_CONST,
  EAW_FVAR_CONST,
  TEMPLATE_L_ABC,
  TEMPLATE_LW_HL,
  LOAD_BASE_GLOB,
  LOAD_IDX_CONST,
  CALC_EA,
} from '../src/addressing/steps';

const asm = (pipeline: { asm: string }[]) => pipeline.map((s) => s.asm);

describe('addressing-model step library', () => {
  it('EA_GLOB_CONST matches doc (byte)', () => {
    const p = EA_GLOB_CONST('glob_b', 2);
    expect(asm(p)).toEqual(['ld de, glob_b', 'ld hl, $0002', 'add hl, de']);
  });

  it('EA_GLOB_REG (byte) zero-extends reg8', () => {
    const p = EA_GLOB_REG('glob_b', 'c');
    expect(asm(p)).toEqual(['ld de, glob_b', 'ld h, 0', 'ld l, c', 'add hl, de']);
  });

  it('EA_FVAR_CONST folds small disps', () => {
    const p = EA_FVAR_CONST(-4, 2);
    expect(asm(p)).toEqual([
      'ld e, (ix-$02)',
      'ld d, (ix-$01)',
      'ld hl, $0000',
      'add hl, de',
    ]);
  });

  it('EAW_GLOB_CONST scales by two', () => {
    const p = EAW_GLOB_CONST('glob_w', 3);
    expect(asm(p)).toEqual([
      'ld de, glob_w',
      'ld hl, $0003',
      'add hl, hl',
      'add hl, de',
    ]);
  });

  it('EAW_FVAR_CONST folds scaled const when possible', () => {
    const p = EAW_FVAR_CONST(-6, 1);
    expect(asm(p)).toEqual([
      'ld e, (ix-$04)',
      'ld d, (ix-$03)',
      'ld hl, $0000',
      'add hl, hl',
      'add hl, de',
    ]);
  });

  it('L-ABC template wraps EA with saves/restores', () => {
    const p = TEMPLATE_L_ABC('a', [...LOAD_BASE_GLOB('glob_b'), ...LOAD_IDX_CONST(1), ...CALC_EA()]);
    expect(asm(p)).toEqual([
      'push de',
      'push hl',
      'ld de, glob_b',
      'ld hl, $0001',
      'add hl, de',
      'ld a, (hl)',
      'pop hl',
      'pop de',
    ]);
  });

  it('LW-HL template preserves DE', () => {
    const p = TEMPLATE_LW_HL(EAW_GLOB_CONST('glob_w', 0));
    expect(asm(p)).toEqual([
      'push de',
      'ld de, glob_w',
      'ld hl, $0000',
      'add hl, hl',
      'add hl, de',
      'ld e, (hl)',
      'inc hl',
      'ld d, (hl)',
      'ld lo(HL), e',
      'ld hi(HL), d',
      'pop de',
    ]);
  });
});

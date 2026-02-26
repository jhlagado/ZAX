## Notes

The goal is to compose the lowering code from a series of reusable stages.

Frame vars are arguments and local variables. They work the same way by using IX:

- args have +ve displacements
- locals have -ve displacements

IX cannot access H or L registers so we often need to use the DE shuttle method to load HL from frame vars. This means we need to think about DE preservation in addition to HL preservation.

## Scalars (no index)

This is a single-step process.

### global

```zax
ld reg8, global
```

```asm
ld reg8, (global)
```

```zax
ld reg16, global
```

```asm
ld reg16l, (global)
ld reg16h, (global+1)
```

### Frame var

```zax
ld reg8, local
```

```asm
ld reg8, (ix+dispF)
```

```zax
ld reg16, local
```

```asm
ld reg16l, (ix+dispF)
ld reg16h, (ix+dispF+1)
```

## Indexed by const

This is a single-step process.

### Global

```zax
ld reg8, global[imm]
```

```asm
ld reg8, (global + imm)
```

```zax
ld reg16, global[imm]
```

```asm
ld reg16l, (global + imm * 2)
ld reg16h, (global + imm * 2 + 1)
```

### Frame var

```zax
ld reg8, local[imm]
```

```asm
ld reg8, (ix+disp + imm)
```

```zax
ld reg16, local
```

```asm
ld reg16l, (ix+disp + imm * 2)
ld reg16h, (ix+disp + imm * 2 + 1)
```

## Indexed addressing

### Multiple-step process.

- preserve DE, HL (unless one is the destination, then save the other)

1. Gather inputs

- load base into DE
- load index into HL

2. Calculate effective address

- scaled_index = index \* scale
- address = base + scaled_index

3. Load destination

- load destination via HL

- restore DE, HL

Register preservation is required for all registers except the destination. Preservation happens at the level of register pair.

If HL is the destination, handle differently (no need to save HL, but still preserve DE if used as scratch).

### Gather inputs

#### Indexed by register

##### Global

```zax
ld reg8, global[c]
```

```
ld de, global
ld h, 0
ld l, c
```

##### Frame var

```zax
ld reg8, local[c]
```

```
ld e, (ix+dispF)
ld d, (ix+dispF+1)    ; DE = base
ld h, 0
ld l, c               ; idx
```

#### Indexed by variable

##### global[global]

```zax
ld reg8, global[idxGlobal]
```

```
ld de, global
ld hl, (idxGlobal)
```

##### global[idxFrame]

```zax
ld reg8, global[idxFrame]
```

```
ld de, global
ex de, hl
ld e, (ix+dispF)
ld d, (ix+dispF+1)
ex de, hl
```

##### frame[idxGlobal]

```zax
ld reg8, frame[idxFrame]
```

```
ld e, (global)
ld d, (global+1)    ; DE = base
ex de, hl
ld e, (ix+dispF)
ld d, (ix+dispF+1)
ex de, hl
```

##### frame[idxFrame]

```zax
ld reg8, frame[idxFrame]
```

```
ld e, (ix+dispF1)
ld d, (ix+dispF1+1)    ; DE = base
ex de, hl
ld e, (ix+dispF2)
ld d, (ix+dispF2+1)    ; DE = base
ex de, hl
```

### Calculate effective address

#### dest 8 bit

```
add hl,de
```

#### dest 16 bit

```
add hl,hl
add hl,de
```

### Load destination

#### dest 8 bit

```
ld reg8,(hl)
```

#### dest 16 bit

```
ld e, (hl)
inc hl
ld d, (hl)
ex de, hl
```

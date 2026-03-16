# ZAX

ZAX is a structured assembler for Z80-family processors. It compiles source directly to machine code — there is no separate linker, no object format, and no runtime system.

The language layers typed storage, named functions with formal parameters and locals, structured control flow (`if`, `while`, `repeat`, `select`), a typed macro system, and explicit modules on top of raw Z80 assembly. Register selection, flag management, and memory layout remain the programmer's responsibility throughout.

ZAX is not a high-level language that targets Z80. It is assembly with structured organisation layered on top.

---

## A First Look

A function with a typed parameter, local variables, and a declared return register. Raw Z80 instructions and ZAX constructs intermix freely in the same instruction stream:

```zax
func fib(target_count: word): HL
  var
    prev_value:  word = 0
    curr_value:  word = 1
    index_value: word = 0
    next_value:  word = 0
  end

  ld a, 1
  or a                       ; establish NZ before entering loop
  while NZ
    hl := index_value
    de := target_count
    xor a
    sbc hl, de
    if Z
      hl := prev_value       ; return early
      ret
    end

    hl := prev_value
    de := curr_value
    add hl, de
    next_value := hl

    hl := curr_value
    prev_value := hl
    hl := next_value
    curr_value := hl

    hl := index_value
    inc hl
    index_value := hl

    ld a, 1
    or a                     ; re-establish NZ for next iteration
  end

  hl := prev_value
end

export func main(): void
  fib 10                     ; result in HL
end
```

- `func fib(target_count: word): HL` — declares a function with one `word` parameter; HL is the return register
- `var … end` — allocates named typed locals in the function's stack frame, with initializers
- `:=` — reads or writes a named variable; the compiler emits the required load or store
- `ld`, `or`, `sbc` — raw Z80 instructions, emitted exactly as written
- `while NZ` / `if Z` — structured control flow; the programmer sets flags immediately before each test with a Z80 instruction

---

## Motivation

Traditional Z80 assemblers provide mnemonics and text macros. Text macros operate on token streams — they have no concept of operand types, no overload resolution, and no way to reason about what a macro does to machine state. In non-trivial projects this accumulates into a layer of fragile, context-dependent definitions.

ZAX replaces that layer with a proper compiler: names are resolved across the full module graph, data layouts are computed from type declarations, and inline macro-instructions expand with typed operand matching. Errors report source locations and clear diagnostics — not mangled token streams. The output is deterministic: same source, same flags, same binary, every time.

Typical use cases: game engines, demoscene tools, firmware, ROM monitors, hardware drivers, systems programming education.

---

## Typed Storage and `:=`

Module-level storage is declared in named `data` sections. Function-local storage lives in `var` blocks. Both are accessed with `:=`:

```zax
section data vars at $8000
  count:  word
  mode:   byte
  origin: Point = { x: 0, y: 0 }
end

func update(): void
  var
    delta: word = 10
  end
  hl := count     ; load word into HL
  de := delta     ; load local into DE
  add hl, de
  count := hl     ; store result back

  a := mode       ; load byte into A
  inc a
  mode := a       ; store back
end
```

The compiler emits the required load or store for each access — no address arithmetic to write by hand.

### Address-of with `@path`

`@path` takes the address of a storage location rather than its value:

```zax
hl := @player.flags     ; HL = address of the flags field
de := @sprites[bc].x    ; DE = address of sprites[BC].x
```

### Typed Reinterpretation

`<Type>base.tail` reinterprets a register as a typed pointer for a field access. Useful when the pointed-to type is known at the access site:

```zax
; HL holds a runtime pointer to a Header record
a := <Header>hl.flags       ; read the flags field via HL
ld a, 1
<Header>hl.flags := a       ; write back
```

---

## Functions

Functions have formal typed parameters, scoped locals, and a declared return register. The compiler manages the stack frame, call sequences, and register preservation:

```zax
func abs_diff(a_val: word, b_val: word): HL
  hl := a_val
  de := b_val
  xor a
  sbc hl, de
  if C
    ex de, hl
    xor a
    sbc hl, de
  end
end
```

The return register is declared in the signature (`): HL`, `): A`, `): void`). Parameters are passed by value at the call site. Locals are scoped to the function body. The return register is the one register not preserved across ZAX function calls — all others are saved and restored automatically.

External routines (BIOS calls, ROM entry points) are declared once and called with the same syntax:

```zax
extern func bios_puts(buf: addr, len: word): void at $F006

func print_banner(): void
  bios_puts banner_msg, banner_len
end
```

---

## Structured Control Flow

Four constructs cover the common patterns. None of them set flags — the programmer sets flags with a Z80 instruction immediately before each condition keyword.

### `if` / `else`

```zax
cp $80
if C              ; A < $80
  cp $40
  if C            ; A < $40
    ld b, 0
  else            ; $40 ≤ A < $80
    ld b, 1
  end
else              ; A ≥ $80
  ld b, 2
end
```

### `while` — top-test loop

Flags must be established before entering and re-established before each back-edge:

```zax
hl := count
ld a, h
or l              ; NZ if count ≠ 0
while NZ
  ; ... process item ...
  dec hl
  ld a, h
  or l            ; re-establish flags for next test
end
```

### `repeat … until` — bottom-test loop

Body always executes at least once; flags are tested at `until`:

```zax
; Walk a null-terminated string
repeat
  ld a, (hl)      ; read byte
  inc hl
  or a            ; Z if null terminator
until Z
; HL points one past the null terminator
```

### `select` / `case` — multi-way dispatch

Cases may list comma-separated values or inclusive ranges. No fallthrough:

```zax
a := mode_value
select A
  case Mode.Idle, Mode.Stopped
    ld a, 0
  case Mode.Run
    ld a, 1
  case 'A'..'Z', '_'            ; inclusive range plus singleton
    call handle_identifier
  else
    ld a, $FF
end
```

---

## The Op System — Typed Inline Macros

`op` declarations are named, typed inline macros. An op expands at the call site — no call instruction, no return. Multiple overloads of the same name are selected by operand type at the call site:

```zax
op add16(dst: HL, src: reg16)
  xor a
  adc hl, src
end

op add16(dst: DE, src: reg16)
  ex de, hl
  xor a
  adc hl, src
  ex de, hl
end

op add16(dst: BC, src: reg16)
  push hl
  ld hl, 0
  add hl, src
  push hl
  pop bc
  pop hl
end
```

`add16 DE, BC` selects the `DE` overload; `add16 HL, SP` selects the `HL` overload. Ops can call other ops. Local labels inside op bodies are rewritten per expansion site, so multiple uses of the same op never collide on label names.

---

## Records, Arrays, and Unions

Types describe memory layout. There is no runtime metadata, vtable, or allocator:

```zax
type Point
  x: word
  y: word
end

type Sprite
  pos:   Point
  tile:  byte
  flags: byte
end

enum Mode Idle, Run, Dead

section data vars at $8000
  sprites: Sprite[8]
  player:  Sprite = { pos: { x: 0, y: 0 }, tile: 0, flags: 0 }
end
```

Field and array accesses compose as place expressions:

```zax
func update_sprite(idx: byte): void
  l := idx
  a := sprites[L].flags    ; load flags field of sprites[idx]
  set 0, a
  sprites[L].flags := a    ; write back

  hl := @sprites[L].pos    ; HL = address of the pos sub-record
end
```

Use `sizeof` and `offsetof` for layout constants — they update automatically when type definitions change:

```zax
const SpriteSize  = sizeof(Sprite)           ; = 6 (pos: 4, tile: 1, flags: 1)
const FlagsOffset = offsetof(Sprite, flags)  ; = 5 (after pos: 4, tile: 1)
```

Unions overlay fields at the same base address:

```zax
union Value
  b: byte
  w: word
  p: ptr
end
```

---

## Raw Data Directives

Lookup tables, jump tables, and binary blobs sit alongside typed storage in `data` sections:

```zax
section data assets at $0100
  sine:
  db $00, $19, $32, $4A, $61, $74, $84, $90   ; raw bytes

  dispatch:
  dw handler_a, handler_b, handler_c           ; 16-bit words or label addresses

  padding:
  ds 8                                         ; 8 zero bytes
end
```

Labels within raw data blocks are valid as jump targets and in `dw` initializers.

---

## Compile-Time Expressions

Constants, enums, and layout queries are resolved at compile time:

```zax
const ScreenBase = $C000
const TileWidth  = 8
const TileBytes  = TileWidth * TileWidth    ; = 64
const FlagMask   = (1 << 4) | (1 << 2)     ; = %00010100

enum Priority Low, Normal, High, Critical   ; = 0, 1, 2, 3

const DefaultPri = Priority.Normal          ; = 1
```

Literal forms: decimal `255`, hex `$FF`, binary `%11111111` or `0b11111111`, character `'A'`. Full arithmetic with standard operator precedence including bitwise ops and shifts. Forward references between constants are resolved.

---

## Modules

Programs compose from modules with explicit imports. Symbols are private by default; `export` makes them visible to importers:

```zax
import mathlib
import "drivers/uart.zax"
```

The compiler resolves the full import graph and reports name collisions as errors. There is no `#include` and no textual concatenation.

---

## Getting Started

### Requirements

- Node.js 20+

### Install

```sh
git clone https://github.com/jhlagado/zax.git
cd zax
npm install
```

### Compile

```sh
npm run zax -- examples/language-tour/02_fibonacci_args_locals.zax
```

### Outputs

| File            | Contents                                    |
| --------------- | ------------------------------------------- |
| `.bin`          | Flat binary image                           |
| `.hex`          | Intel HEX                                   |
| `.lst`          | Byte dump with symbol table                 |
| `.d8dbg.json`   | Debug80-compatible debug map                |
| `.asm`          | Lowered instruction trace                   |

### CLI Options

```
zax [options] <entry.zax>

  -o, --output <file>    Output path (default: <entry>.hex)
  -t, --type <type>      Output type: hex, bin (default: hex)
  -n, --nolist           Suppress .lst output
  --nobin                Suppress .bin output
  --nohex                Suppress .hex output
  --nod8m                Suppress .d8dbg.json output
  --noasm                Suppress .asm output
  -I, --include <dir>    Add import search path (repeatable)
  --case-style <m>       Case-style lint: off, upper, lower, consistent
  --op-stack-policy <m>  Op stack-discipline diagnostics: off, warn, error
  --type-padding-warn    Warn on padded composite types
  -V, --version          Print version
  -h, --help             Print help
```

---

## Documentation

| Document                                       | Purpose                                                                |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| `docs/reference/ZAX-quick-guide.md`            | Practical quick-start — recommended first read after this README       |
| `docs/spec/zax-spec.md`                        | Normative language specification                                       |
| `docs/design/zax-algorithms-course.md`         | Algorithm course — classic CS problems in ZAX                          |
| `docs/reference/testing-verification-guide.md` | Testing and verification flow                                          |
| `docs/reference/zax-dev-playbook.md`           | Contributor workflow and review hygiene                                |

---

## Design Notes

ZAX keeps the programmer close to the hardware. Register names, condition codes, and addressing modes appear directly in source. Constructs that require the programmer to name a register — `select A`, `hl := count` — are preferred over ones that allocate registers implicitly.

The language draws a clear line between raw Z80 (`ld`, `add`, `call`) and ZAX constructs (`:=`, `if`, `func`, `op`). Anything that crosses a type boundary or manages a name goes through ZAX. Anything that touches registers directly stays Z80.

Output is deterministic: same source, same flags, same binary. The `.asm` trace shows exactly what instruction sequence was emitted for each source construct.

---

## Project Status

ZAX is under active development. The end-to-end pipeline is functional.

**Working today:**
- Single and multi-module compilation
- Functions with typed parameters, locals, and stack-frame calling conventions
- Structured control flow (`if` / `else`, `while`, `repeat` / `until`, `select` / `case`)
- The op system — typed inline macros with overload resolution
- Records, unions, arrays, and nested types
- Named `section code` / `section data` blocks
- Typed storage via `:=`, address-of (`@path`), and typed reinterpretation (`<Type>base`)
- Raw data directives (`db` / `dw` / `ds`)
- Compile-time expressions with forward references
- Multiple output formats: `.bin`, `.hex`, `.lst`, `.asm`, `.d8dbg.json`

**Active work:**
- Exact-size runtime indexing for non-power-of-two composite strides
- Broader Z80 ISA coverage
- Debug80 integration

---

## License

GPL-3.0-only. See [LICENSE](LICENSE).

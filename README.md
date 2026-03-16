# ZAX

ZAX is a structured assembler for Z80-family processors. It compiles source directly to machine code — there is no separate linker, no object format, and no runtime system.

The language adds typed storage, function declarations with formal parameters and stack-frame locals, structured control flow (`if`, `while`, `repeat`, `select`), inline macro-instructions with typed operand matching and overload resolution, and a module system with explicit imports and full-graph name resolution. Register selection, flag management, and memory layout remain the programmer's responsibility throughout.

ZAX is not a high-level language that targets Z80. It is assembly with structured organisation layered on top.

---

## A First Look

A function that takes a typed argument, maintains local variables across iterations, and returns a value in a declared register. It mixes raw Z80 instructions with typed storage accesses and structured control flow in the same instruction stream:

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
      hl := prev_value    ; return early — epilogue handles frame cleanup
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

`func fib(target_count: word): HL` declares a function with one parameter of type `word` and a return value in register `HL`. The `var` block allocates four `word`-sized locals in the IX-anchored stack frame, with initializers emitted at function entry. `:=` reads and writes named locals and parameters by value — the compiler emits IX-relative loads and stores. `ld` and `or` are raw Z80 instructions. `while NZ` and `if Z` lower to compiler-managed conditional jumps; the programmer establishes the flags with `or a` or `xor a`/`sbc hl,de` before each test. `ret` inside the loop is routed through the compiler-generated epilogue, which restores the frame before returning.

---

## Motivation

Traditional Z80 assemblers provide mnemonics and text macros. Text macros operate on token streams — they have no concept of operand types, no overload resolution, no hygiene, and no mechanism for the assembler to reason about what a macro does to machine state. The result in any non-trivial project is an accumulated layer of fragile, context-dependent macro definitions.

ZAX uses a compiler pipeline instead: source is parsed to an AST, names are resolved across the full module graph, data layouts are computed from type declarations, and inline macro-instructions are expanded with typed operand matching. The output is deterministic — same source, same flags, same binary — and inspectable via the `.asm` lowering trace.

Register selection, flag management, and memory layout remain the programmer's responsibility. The compiler manages names, scopes, call sequences, and frame layout; it makes no decisions about register usage or data placement.

Typical use cases: game engines, demoscene tools, firmware, ROM monitors, hardware drivers, systems programming education.

---

## Typed Storage and `:=`

Module-level storage is declared in named `data` sections. Function-local storage lives in `var` blocks. Both are accessed with `:=` using value semantics:

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

For scalars, `target := source` inserts the required load or store automatically — IX-relative for locals, absolute for module storage. Frame offsets are computed by the compiler.

### Address-of with `@path`

`@path` takes the address of a typed storage path rather than its value:

```zax
hl := @player.flags     ; HL = address of the flags field
de := @sprites[bc].x    ; DE = address of sprites[BC].x
```

### Typed Reinterpretation

`<Type>base.tail` reinterprets a register or pointer as a typed base for a field access. The cast is local — it does not permanently retype the register:

```zax
; HL holds a runtime pointer to a Header in memory
a := <Header>hl.flags       ; read the flags field via HL
ld a, 1
<Header>hl.flags := a       ; write back
bump <Header>hl.flags          ; op call with typed path
```

This is the mechanism used for pointer-based traversal where the type of the pointed-to data is known at the access site but not statically bound to the pointer.

---

## Functions

ZAX functions have formal typed parameters, scoped locals, and a compiler-managed IX-anchored stack frame. The return register is declared explicitly:

```zax
func fib(target_count: word): HL
  var
    prev_value:  word = 0
    curr_value:  word = 1
    index_value: word = 0
    next_value:  word = 0
  end

  ld a, 1
  or a                       ; establish NZ to enter loop
  while NZ
    hl := index_value
    de := target_count
    xor a
    sbc hl, de
    if Z
      hl := prev_value
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
    or a
  end

  hl := prev_value
end

export func main(): void
  fib 10            ; result returned in HL
end
```

Parameters are pushed right-to-left at call sites; locals occupy IX-relative frame slots. The compiler generates the prologue, epilogue, and all call-site sequences. The callee-save complement is computed from the declared return registers, so preservation is mechanically enforced.

**At typed call boundaries:** `HL` is boundary-volatile; all other registers are callee-preserved by the compiler-generated epilogue. Raw `call` and `extern func` calls carry no such guarantee — assume all registers may be clobbered.

External entry points (BIOS calls, ROM routines) are declared once and called with the same syntax:

```zax
extern func bios_puts(buf: addr, len: word): void at $F006

func print_banner(): void
  bios_puts banner_msg, banner_len   ; compiler emits push × 2, call, pop × 2
end
```

---

## Structured Control Flow

All four constructs lower to conditional jumps. The constructs do not set flags — they test the CPU flag state at the point where the condition code keyword appears. The programmer is responsible for establishing the correct flags with a Z80 instruction immediately before the condition is tested.

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

Flags must be established before entering. The body re-establishes them before the back-edge:

```zax
hl := count
ld a, h
or l              ; set NZ if count ≠ 0
while NZ
  ; ... process item ...
  dec hl
  ld a, h
  or l            ; re-establish flags for next test
end
```

### `repeat ... until` — bottom-test loop

Body always runs at least once. Flags are tested at `until`:

```zax
; Walk a null-terminated string
repeat
  ld a, (hl)      ; read byte
  inc hl
  or a            ; Z if null terminator
until Z
; HL points one past the null terminator
```

### `select` / `case` — multi-way dispatch with ranges

`select` dispatches by value equality. A single `case` line may list comma-separated values or inclusive ranges. There is no fallthrough:

```zax
a := mode_value
select A
  case Mode.Idle, Mode.Stopped  ; two values, one body
    ld a, 0
  case Mode.Run
    ld a, 1
  case 'A'..'Z', '_'            ; inclusive range plus singleton
    call handle_identifier
  else
    ld a, $FF
end
```

The compiler-generated dispatch may use a compare-and-branch chain or a jump table. Stack depth must match across all paths at every structured-flow join point — a `push` in one arm without a matching `pop` before `end` is a compile error.

---

## The Op System — Typed Inline Macros

`op` declarations define inline macro-instructions with AST-level operand matching and overload resolution. An op expands inline at the call site — there is no call instruction and no return. The compiler selects the matching overload based on operand types using a specificity-ranked resolution:

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

At a call site, `add16 DE, BC` is parsed as an op invocation. The compiler matches `DE` against the first parameter of each overload: the fixed matcher `DE` is more specific than the class matcher `reg16`, so the second overload is selected. `BC` is substituted for `src` and the expansion is emitted inline. If two overloads match at equal specificity, the call is a compile error. Fixed matchers (`HL`, `DE`, `A`, `BC`, `SP`) always beat class matchers (`reg8`, `reg16`, `imm8`, `imm16`, `ea`, `mem8`, `mem16`).

Op bodies can call other ops:

```zax
op clear_carry()
  xor a
end

op add16(dst: HL, src: reg16)
  clear_carry
  adc hl, src
end
```

Local labels inside op bodies are hygienically rewritten per expansion site, so two expansions of the same op at different call sites never collide on label names.

---

## Records, Arrays, and Unions

Records, unions, and arrays are layout descriptions. They compute field offsets and array strides at compile time; there is no associated runtime metadata, vtable, or allocator:

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

Field and array access compose as place expressions. The compiler lowers them to address calculations and load/store sequences:

```zax
func update_sprite(idx: byte): void
  move l, idx
  a := sprites[L].flags    ; load flags field of sprites[idx]
  set 0, a
  sprites[L].flags := a    ; write back

  hl := @sprites[L].pos    ; HL = address of the pos sub-record
end
```

Composite types use exact semantic sizes. Use `sizeof` and `offsetof` for all layout constants; they update automatically when type definitions change:

```zax
const SpriteSize  = sizeof(Sprite)           ; = 6 (pos: 4, tile: 1, flags: 1)
const FlagsOffset = offsetof(Sprite, flags)  ; = 5 (after pos: 4, tile: 1)
```

Unions overlay fields at the same base address. All fields refer to the same memory; the programmer selects the interpretation in use:

```zax
union Value
  b: byte
  w: word
  p: ptr
end
```

---

## Raw Data Directives

For lookup tables, jump tables, and binary blobs, raw data directives are supported directly inside `data` sections:

```zax
section data assets at $0100
  sine:
  db $00, $19, $32, $4A, $61, $74, $84, $90   ; raw bytes

  fibonacci:
  db 1, 2, 3, 5, 8, 13, 21, 34               ; raw bytes (decimal)

  dispatch:
  dw handler_a, handler_b, handler_c          ; 16-bit words or label addresses

  padding:
  ds 8                                        ; 8 zero bytes
end
```

Labels within raw data blocks are valid as jump targets and in `dw` initializers. Raw declarations coexist with typed storage declarations in the same section.

---

## Compile-Time Expressions

Constants, enums, and all layout queries are resolved entirely at compile time:

```zax
const ScreenBase = $C000
const TileWidth  = 8
const TileBytes  = TileWidth * TileWidth    ; = 64
const FlagMask   = (1 << 4) | (1 << 2)     ; = %00010100

enum Priority Low, Normal, High, Critical   ; = 0, 1, 2, 3

const DefaultPri = Priority.Normal          ; = 1
```

Literal forms: decimal `255`, hex `$FF`, binary `%11111111` or `0b11111111`, character `'A'`. Full arithmetic with standard operator precedence including bitwise ops and shifts. Forward references between constants are allowed.

---

## Modules

ZAX programs compose from modules with explicit imports. The compiler resolves the full import graph, detects collisions, and packs sections in a deterministic order:

```zax
import mathlib
import "drivers/uart.zax"
```

All module-scope names share a single global namespace. Name collisions are compile errors with clear diagnostics. Use `export` to mark symbols visible to importers; unexported symbols are module-private. There is no `#include` and no textual concatenation.

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

| File          | Contents                                          |
| ------------- | ------------------------------------------------- |
| `.bin`        | flat binary image                                 |
| `.hex`        | Intel HEX output                                  |
| `.lst`        | deterministic byte dump with symbol table         |
| `.d8dbg.json` | Debug80-compatible debug map                      |
| `.asm`        | lowered trace — exactly what the compiler emitted |

### CLI Options

```
zax [options] <entry.zax>

  -o, --output <file>    Primary output path (default: <entry>.hex)
  -t, --type <type>      Output type: hex, bin (default: hex)
  -n, --nolist           Suppress .lst output
  --nobin                Suppress .bin output
  --nohex                Suppress .hex output
  --nod8m                Suppress .d8dbg.json output
  --noasm                Suppress .asm output
  -I, --include <dir>    Add import search path (repeatable)
  --case-style <m>       Case-style lint: off, upper, lower, consistent
  --op-stack-policy <m>  Op stack-discipline diagnostics: off, warn, error
  --type-padding-warn    Warn when composite type storage is padded
  -V, --version          Print version
  -h, --help             Print help
```

---

## Documentation

| Document                                       | Purpose                                                                |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| `docs/reference/ZAX-quick-guide.md`            | Practical quick-start guide — recommended first read after this README |
| `docs/spec/zax-spec.md`                        | Normative language specification                                       |
| `docs/design/zax-algorithms-course.md`         | Algorithm course outline — classic CS problems in ZAX                  |
| `docs/reference/testing-verification-guide.md` | Contributor testing and verification flow                              |
| `docs/reference/zax-dev-playbook.md`           | Contributor workflow and review hygiene                                |

---

## Design Notes

The language surface is deliberately close to the Z80 instruction set. Register names, condition codes, and addressing modes appear directly in source. Constructs that require the programmer to specify a register (such as `select A` or `hl := count`) are preferred over constructs that allocate registers implicitly.

The compiler pipeline operates on an AST with typed nodes. There are no textual macros, no token re-scanning, and no string substitution. Name resolution, type checking, and code generation are distinct phases; errors are reported with source locations, not mangled token streams.

Output is deterministic: given the same source and the same compiler flags, the binary is identical across platforms and invocations. The `.asm` lowering trace shows exactly what instruction sequence was emitted for each source construct.

---

## Project Status

ZAX is under active development. The compiler is a Node.js CLI tool; the end-to-end pipeline (lex → parse → lower → encode → emit) is functional and produces `.bin`, `.hex`, `.d8dbg.json`, `.lst`, and `.asm` output.

What works today: single and multi-module compilation, functions with typed parameters and locals, IX-anchored frame calling conventions, structured control flow, the op system, records/unions/arrays, named `section code`/`section data` blocks, typed storage via `:=` (with transitional `move`), `@path` address-of, `<Type>base.tail` typed reinterpretation, grouped and ranged `select case`, raw data directives (`db`/`dw`/`ds`), compile-time expressions, forward references and fixups, and a growing slice of the Z80 instruction set.

Active work: exact-size runtime indexing for non-power-of-two composite strides (issues #817–820), broader ISA coverage, and Debug80 integration.

---

## License

GPL-3.0-only. See [LICENSE](LICENSE).

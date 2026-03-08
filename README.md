# ZAX

**A structured assembler for the Z80 family.**

ZAX is a compiler that produces Z80 machine code from structured, assembly-like source. You still choose registers, manage flags, and decide what lives in RAM versus ROM — but you do it inside a language that gives you imports, typed data layouts, functions with real calling conventions, structured control flow, and an inline macro system that understands operand types.

ZAX is not a high-level language that happens to target Z80. It is assembly with the organization problems solved.

```
const MsgLen = 5

section data app_data at $8000
  msg: byte[5] = "HELLO"
end

extern func bios_putc(ch: byte): void at $F003

export func main(): void
  var
    p: addr
  end
  ld hl, msg
  ld p, hl

  ld b, MsgLen
  repeat
    ld hl, p
    ld a, (hl)
    inc hl
    ld p, hl
    push bc
    bios_putc A
    pop bc
    dec b
  until Z
end
```

Every instruction in that listing is a real Z80 instruction or a direct call. `repeat ... until Z` compiles to a conditional branch. `bios_putc A` compiles to a push, a `call $F003`, and a stack cleanup. There is no hidden abstraction — just structure.

---

## Why ZAX Exists

Traditional Z80 assemblers give you mnemonics and macros. The mnemonics are fine. The macros are not.

Text-based macros operate on strings. They paste tokens, re-scan the result, and hope it parses. They have no concept of operand types, no overloading, no hygiene, no way for the assembler to reason about what a macro does to the machine state. The result is that any non-trivial assembler project eventually accumulates a layer of fragile, opaque macro definitions that no one wants to touch.

ZAX replaces this with a proper compiler. Source is parsed into an AST. Names are resolved across modules. Data layouts are computed from type declarations. Macros are expanded at the AST level with typed operand matching. The output is deterministic machine code, Intel HEX, and a debug map — from any platform, every time.

---

## Functions With Real Arguments and Locals

In a traditional assembler, a "function" is a label you `call` and a `ret` you hope eventually executes. Arguments are wherever you left them — in registers, on the stack, at some agreed-upon memory address. Locals are registers you promised not to step on, or RAM you allocated by hand. The calling convention exists only in comments and in the programmer's head.

ZAX functions have formal typed parameters, optional local variables, and a compiler-managed stack frame:

```
func add_words(a: word, b: word): word
  var
    result: word
  end
  ld hl, a
  ld de, b
  add hl, de
  ld result, hl
end
```

Arguments are passed on the stack (pushed right-to-left by the caller, cleaned up after return). Each argument and each local occupies a 16-bit slot. The compiler computes SP-relative offsets for every slot, so names like `a` and `result` map to real SP-relative accesses in lowered code. Return values come back in `HL` (16-bit) or `L` (8-bit), following Z80 convention.

Calling a function inside an instruction stream looks like calling an instruction:

```
func main(): void
  add_words $0010, $0020   ; compiler pushes args, emits call, cleans stack
  ; HL now contains the result
end
```

The compiler emits the full calling sequence: push the arguments, `call` the function, pop the arguments. You can pass registers, immediates, effective addresses, or dereferenced memory as arguments — the compiler handles the marshalling.

Crucially, a function body is still real assembly. You have full access to every Z80 instruction. The function declaration gives you a frame and named slots; what you do inside is up to you. If control falls off the end of the instruction stream, the compiler inserts an implicit `ret` (including any epilogue needed to clean up locals). If you write `ret` yourself, the compiler rewrites it to jump through the epilogue so the stack is always correct.

This is the middle ground ZAX occupies: you get the organizational benefit of C-style function signatures — typed parameters, scoped locals, a defined return convention — without surrendering control of the register file or the instruction stream. The function boundary is real (it affects the stack and the calling convention), but inside that boundary you are writing assembly, not a high-level language.

External entry points work the same way. If your ROM has a BIOS call at a fixed address, you declare it as an `extern func` and call it with the same syntax:

```
extern func bios_putc(ch: byte): void at $F003

; later, in a function body:
bios_putc A    ; pushes A (zero-extended), calls $F003, cleans up
```

The compiler generates the correct calling sequence to the absolute address. You don't hand-roll the push/call/pop dance for every BIOS entry point in your project. At typed call boundaries (`func`/`extern func`), `void` calls preserve boundary-visible registers/flags, while non-`void` calls expose `HL` as the return channel.

---

## Conditionals: if / else

ZAX provides `if`/`else` inside function and op bodies. The key design decision is that **the programmer still sets the flags**. The keyword tests a CPU condition code that you establish with normal Z80 instructions — there is no expression evaluator, no implicit comparison, no hidden register usage:

```
; Compare A to zero and branch
or a
if Z
  ld b, $FF       ; A was zero
else
  ld b, $00       ; A was nonzero
end
```

You write the instruction that sets the flags, then you write the keyword that tests them. The structure is purely for the human reader and the compiler's jump/label bookkeeping — the CPU sees only a conditional jump.

The compiler enforces stack-depth matching at all join points. If one arm of an `if` pushes a value and the other doesn't, that's a compile error, not a runtime crash three minutes into your program.

---

## Multi-way Dispatch: select / case

For multi-way branching, `select`/`case` dispatches on a value in a register:

```
; Multi-way dispatch on a value
ld a, (mode)
select A
  case Mode.Read
    call do_read
  case Mode.Write
    call do_write
  else
    call do_error
end
```

Each `case` compares the selected register against a compile-time constant and jumps to the matching arm. The `else` arm handles anything that falls through. The `select` dispatch may use `A` internally — the programmer controls what is loaded before the construct and what registers the arms use.

---

## Loops: while and repeat / until

ZAX provides two looping constructs. Both compile to conditional jumps — nothing more.

`while` tests a condition at the top of the loop. You set the flags yourself before and at the bottom of the body:

```
ld b, 10
cp b            ; set flags before entering
while NZ
  ; ... loop body ...
  dec b
  cp b          ; reset flags for next test
end
```

`repeat`/`until` tests at the bottom, guaranteeing at least one execution. This maps naturally onto the Z80's `DJNZ` idiom:

```
; Loop until a counter expires
ld b, 10
repeat
  ; ... loop body ...
  dec b
until Z
```

The condition after `while` or `until` is any standard Z80 condition code: `Z`, `NZ`, `C`, `NC`, `M`, `P`, `PE`, `PO`. You set the condition with whatever instruction is appropriate — `dec`, `cp`, `or`, `bit`, anything.

---

## The Op System: Typed Inline Macros

The most distinctive feature of ZAX is `op` — inline macro-instructions with compiler-level operand matching. An op looks like a new opcode. It expands inline (no call, no return, zero overhead) and the compiler selects the right implementation based on the operands you pass, using a specificity-ranked overload system.

The Z80 can add a 16-bit register pair into `HL`, but not into `DE` or `BC`. In a traditional assembler you'd write a macro or just inline the exchange dance every time. In ZAX:

```
op add16(dst: HL, src: reg16)
  add hl, src
end

op add16(dst: DE, src: reg16)
  ex de, hl
  add hl, src
  ex de, hl
end

op add16(dst: BC, src: reg16)
  push hl
  push bc
  pop hl
  add hl, src
  push hl
  pop bc
  pop hl
end
```

At a call site, `add16 DE, BC` reads like a native instruction. The compiler sees that the first operand is `DE`, selects the second overload (because the fixed matcher `DE` is more specific than the class matcher `reg16`), substitutes `BC` for `src`, and emits the resulting instruction sequence inline.

This is not text substitution. The compiler operates on parsed AST nodes and matcher types. Register/flag/stack discipline inside an `op` body is developer-managed, so authors should keep expansions explicit and stack-balanced. If an expansion produces an invalid instruction, the error points to the call site with a clear diagnostic — not to a mangled token stream three macro levels deep.

Op parameters use a system of **matcher types** that constrain what each operand position accepts:

| Matcher                     | Accepts                            |
| --------------------------- | ---------------------------------- |
| `reg8`                      | `A B C D E H L`                    |
| `reg16`                     | `HL DE BC SP`                      |
| `A`, `HL`, `DE`, `BC`, `SP` | That register only                 |
| `imm8`, `imm16`             | Compile-time immediate expressions |
| `ea`                        | Effective address expressions      |
| `mem8`, `mem16`             | Memory dereference operands `(ea)` |

Fixed matchers beat class matchers. `imm8` beats `imm16` for small values. If two overloads tie, the compiler rejects the call as ambiguous rather than silently picking one. The resolution rules are simple enough to reason about by hand, which matters when you're debugging at the instruction level.

---

## Data Layouts That Stay Out of Your Way

ZAX has records (power-of-two-sized layouts), unions (overlays), arrays, and enums. These are **layout descriptions**, not runtime abstractions. They compute addresses — nothing else.

```
type Sprite
  x: word
  y: word
  w: byte
  h: byte
  flags: byte
end

section data sprites_data at $8200
  sprites: Sprite[8] = { ... }
end
```

Field access and array indexing produce effective addresses. Parentheses dereference. This is the same convention as Z80 indirect addressing, extended to structured data:

```
ld hl, (sprites[C].x)    ; load word at sprites[C].x into HL
ld (sprites[C].flags), A  ; store A into the flags field
```

The compiler lowers these into real instruction sequences (computing the offset, loading the address, performing the access). If a form can't be lowered without violating register/flag preservation constraints, it's a compile error — not a silent clobber.

Unions overlay fields at the same base address, useful for reinterpreting memory regions:

```
union Value
  b: byte
  w: word
  p: ptr
end
```

There are no tags, no runtime checks, no vtables. A union is a lens over bytes. You decide which interpretation applies.

---

## Modules, Not Include Files

ZAX programs are composed of modules with explicit imports. The compiler resolves the full import graph, detects collisions, and packs sections in a deterministic order. There is no `#include` and no textual concatenation.

```
import mathlib
import "drivers/uart.zax"
```

All module-scope names share a single global namespace. Name collisions across modules are compile errors with clear diagnostics, not silent redefinitions. The compiler produces the same binary regardless of filesystem enumeration order or platform path conventions.

---

## Project Status

ZAX is under active development. The compiler exists as a Node.js CLI tool and handles a meaningful subset of the active v0.2 draft specification. The end-to-end pipeline (lex → parse → lower → encode → emit) is functional and produces `.bin`, `.hex`, `.d8dbg.json` (Debug80-compatible debug maps), and `.lst` output.

What works today: single and multi-module compilation, functions with locals and calling conventions, structured control flow, the op system, records/unions/arrays, named `section code`/`section data` blocks with direct declarations (`const`/`enum`/typed storage/`bin`/`hex`/`extern`), forward references and fixups, and a growing slice of the Z80 instruction set.

What remains: broader ISA coverage, CLI hardening, full listing output, cross-platform acceptance testing, and Debug80 integration. See `docs/reference/zax-dev-playbook.md` for the concrete milestone plan.

---

## Getting Started

### Requirements

- Node.js 20+

### Install and Build

```sh
git clone https://github.com/user/zax.git
cd zax
npm install
```

### Compile a ZAX File

```sh
npm run zax -- examples/hello.zax
```

This produces `examples/hello.hex`, `examples/hello.bin`, `examples/hello.d8dbg.json`, and `examples/hello.lst` alongside the source.

### Specify an Output Path

```sh
npm run zax -- -o build/output.hex examples/hello.zax
```

All sibling artifacts (`.bin`, `.lst`, `.d8dbg.json`) are derived from the primary output path.

### CLI Options

```
zax [options] <entry.zax>

  -o, --output <file>    Primary output path (default: <entry>.hex)
  -t, --type <type>      Primary output type: hex, bin (default: hex)
  -n, --nolist           Suppress .lst output
  --nobin                Suppress .bin output
  --nohex                Suppress .hex output
  --nod8m                Suppress .d8dbg.json output
  -I, --include <dir>    Add import search path (repeatable)
  -V, --version          Print version
  -h, --help             Print help
```

---

## Development

Use the canonical contributor verification guide:

- `docs/reference/testing-verification-guide.md`

It defines the current local verification flow, fixture refresh commands, and CI expectations.

---

## Documentation

| Document                             | Purpose                                                           |
| ------------------------------------ | ----------------------------------------------------------------- |
| `docs/spec/zax-spec.md`                   | **Normative** language specification (includes CLI/op appendices) |
| `docs/reference/ZAX-quick-guide.md`            | Practical quick guide for daily language usage (non-normative)    |
| `docs/reference/testing-verification-guide.md` | Canonical testing/verification flow for contributors              |
| `docs/reference/zax-dev-playbook.md`           | Contributor workflow and review/merge hygiene                     |
| `docs/archive/versioned/v02-codegen-reference.md`      | Consolidated v0.2 codegen entry point and archive links           |

---

## Design Principles

**High-level structure, low-level semantics.** You still choose registers and manage flags. The language adds names, scope, and structure — not abstraction.

**Compiler, not preprocessor.** ZAX parses to an AST and emits code with fixups. There are no textual macros, no re-scanning, no token pasting. Every construct the compiler processes is typed and validated.

**Registers are first-class.** Register names appear directly in code, in op matcher types, and in calling conventions. The language is designed around the reality of an 8-bit register file, not against it.

**Deterministic output.** Same source, same flags, same binary. No timestamps, no host paths, no enumeration-order dependencies. Builds are reproducible by construction.

---

## License

GPL-3.0-only. See [LICENSE](LICENSE).

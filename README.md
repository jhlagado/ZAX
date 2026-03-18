# ZAX

ZAX is a structured assembler for Z80-family processors. It compiles source directly to machine code — no separate linker, no object format, no runtime.

The language adds typed storage, named functions, structured control flow, a typed macro system, and explicit modules on top of raw Z80 assembly. Register selection, flag management, and memory layout stay the programmer's responsibility throughout.

ZAX is not a high-level language targeting Z80. It is assembly with structure layered on top.

---

## A First Look

```zax
func abs_diff(a_val: word, b_val: word): HL
  hl := b_val
  de := a_val
  xor a
  sbc hl, de        ; try b_val − a_val first
  if C              ; b_val < a_val — subtract the other way
    hl := a_val
    de := b_val
    xor a
    sbc hl, de
  end
end
```

- `func abs_diff(a_val: word, b_val: word): HL` — typed parameters, declared return register
- `:=` — reads or writes a named variable; the compiler emits the required load or store
- `xor a / sbc hl, de` — raw Z80 instructions, emitted exactly as written
- `if C` — structured control flow; the programmer sets flags immediately before each test

ZAX constructs and raw Z80 instructions intermix freely in the same instruction stream.

---

## What ZAX Adds

**Typed storage and `:=`**
Variables are declared with types in `section data` blocks or `var` locals. `:=` reads or writes them — the compiler handles the load or store. No address arithmetic to write by hand.

**Functions with scoped locals**
Functions have typed parameters, a declared return register, and local variables with optional initializers. The compiler manages the stack frame and register preservation.

**Structured control flow**
`if` / `else`, `while`, `repeat` / `until`, and `select` / `case` — all condition-code driven. The programmer sets flags with a Z80 instruction; ZAX provides the structure around it.

**The op system**
`op` declarations are named, typed inline macros. Multiple overloads of the same name are resolved by operand type at the call site. Ops expand inline — no call instruction, no return.

**Records, unions, and arrays**
Types describe memory layout with no runtime metadata. Field and element accesses compose as path expressions. `sizeof` and `offsetof` update automatically when a type changes.

**Modules**
Programs compose from modules with explicit imports. Symbols are private by default; `export` makes them visible across module boundaries.

**Compile-time expressions**
Constants, enums, `sizeof`, and `offsetof` resolve at compile time with full arithmetic, bitwise ops, and forward references.

---

The dividing line is consistent throughout: anything that crosses a type boundary or manages a name goes through a ZAX construct. Anything that touches a register or flag directly stays raw Z80.

---

## Motivation

Traditional Z80 assemblers provide mnemonics and text macros. Text macros operate on token streams — they have no concept of operand types and no way to reason about what a macro does to machine state. In non-trivial projects this accumulates into a layer of fragile, context-dependent definitions.

ZAX replaces that layer with a proper compiler: names resolve across the full module graph, data layouts are computed from type declarations, and macros expand with typed operand matching. Errors report source locations and clear diagnostics. The output is deterministic — same source, same flags, same binary.

Typical use cases: game engines, demoscene tools, firmware, ROM monitors, hardware drivers, systems programming education.

---

## Getting Started

### Requirements

Node.js 20+

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

### Output Files

| File            | Contents                             |
| --------------- | ------------------------------------ |
| `.bin`          | Flat binary image                    |
| `.hex`          | Intel HEX                            |
| `.lst`          | Byte dump with symbol table          |
| `.d8dbg.json`   | Debug80-compatible debug map         |
| `.asm`          | Lowered instruction trace            |

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

| Document                                         | Purpose                                                          |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| `docs/reference/ZAX-quick-guide.md`              | Practical quick-start — recommended first read after this README |
| `docs/spec/zax-spec.md`                          | Normative language specification                                 |
| `docs/intro/README.md`                           | Planned beginner-first volume — learn Z80 programming in ZAX |
| `docs/work/intro-authoring-plan.md`              | Writer brief for the beginner-first volume |
| `docs/course/README.md`                          | Advanced practical-programming volume — substantial ZAX programs and data structures |
| `docs/work/z80-intro-course-plan.md`             | Planning brief for the beginner-facing "Learn Z80 Programming in ZAX" volume (`docs/intro/`) |
| `docs/reference/testing-verification-guide.md`   | Testing and verification flow                                    |
| `docs/reference/zax-dev-playbook.md`             | Contributor workflow and review hygiene                          |

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

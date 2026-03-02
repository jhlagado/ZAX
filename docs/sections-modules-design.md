# ZAX Sections and Module System — Design Specification

> **Status**: Design proposal. Not yet normative. Feeds into `zax-spec.md` when accepted.
> **Scope**: Section declarations, variable syntax unification, import placement, export model.

---

## 1. Motivation

The v0.2 spec defines `data` blocks and `globals` blocks as distinct constructs with different syntax. It has no mechanism for expressing which memory region code or data should occupy, and no model for how imported module content is placed into the address space. This document specifies a unified section and module system that addresses both.

---

## 2. Sections

### 2.1 Syntax

```
section <kind> <name> at <address>
  ...
end
```

- `<kind>` is either `code` or `data`.
- `<name>` is an identifier. Multiple source files may declare sections with the same name and kind; their contents are concatenated in import order.
- `<address>` is a numeric literal (decimal or `$`-prefixed hex). It sets the base address for this section.

**Example:**

```
section code rom at $0000
  ...
end

section data ram at $8000
  ...
end
```

### 2.2 Section Kinds

| Kind   | Content                                                  | Output                                                         |
| ------ | -------------------------------------------------------- | -------------------------------------------------------------- |
| `code` | Function definitions, inline data                        | Executable bytes baked into the binary at `<address>`          |
| `data` | Variable declarations (initialized and zero-initialized) | Bytes baked into binary; startup routine initializes RAM items |

The distinction matters for type safety: a function reference resolves to a `code`-section address; a data reference resolves to a `data`-section address. The compiler warns if imports are placed into the wrong section kind (see §4.3).

### 2.3 Multiple Sections and Named Merging

A program may declare multiple sections of the same kind at different addresses:

```
section code low_rom at $0000
  ...
end

section code high_rom at $C000
  ...
end
```

Sections with the same name and kind across multiple source files are concatenated, with the first declaration setting the base address. This allows library content to grow a named section across files without the importer managing offsets manually.

### 2.4 Libraries Must Not Declare Sections

Library files (files intended for import) must not contain `section` declarations. All placement decisions belong to the importing program. This ensures no conflict between a library's assumed layout and the importer's actual memory map.

---

## 3. Variable Declarations

### 3.1 Unified Syntax

Both initialized data and variables use a single declaration form inside any section:

```
<name>: <type> [= <initializer>]
```

The inner `data ... end` and `globals ... end` block keywords are removed. Declarations appear directly inside the section body, alongside function definitions (in `code` sections) or as the primary content (in `data` sections).

### 3.2 Initializer Semantics

| Declaration                                      | Meaning                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| `x: byte = 42`                                   | Initialized to `42` at startup                                     |
| `x: byte = 0`                                    | Initialized to `0` at startup (explicit; preferred over bare zero) |
| `x: byte`                                        | Zero-initialized at startup                                        |
| `buf: byte[256]`                                 | 256 bytes, zero-initialized at startup                             |
| `tbl: byte[8] = { 1, 2, 4, 8, 16, 32, 64, 128 }` | Initialized to given values at startup                             |
| `msg: byte[] = "hello\0"`                        | Initialized to string bytes at startup                             |

**No initializer means zero-initialized** — not undefined. This is explicit policy: silence is zero, not garbage. If you genuinely do not want initialization cost, use a comment to document intent; the compiler still zeroes the region.

### 3.3 Example

```
section code rom at $0000
  lookup: byte[8] = { 1, 2, 4, 8, 16, 32, 64, 128 }  ; ROM table, baked in place

  func main(): void
    ...
  end
end

section data ram at $8000
  cursor_x: byte = 0    ; startup-initialized to 0
  cursor_y: byte = 0
  buffer: byte[256]     ; zero-initialized, no explicit value needed
end
```

### 3.4 Startup Initialization

The compiler generates a startup routine that runs before the program entry point. For each `data` section it:

1. Copies any `= value` initializer bytes from their ROM storage location to the section's runtime address.
2. Zeroes any declaration with no initializer.

For `code` sections, data declared inline (e.g., `lookup` above) is baked directly at that address in the binary — no copy is needed.

---

## 4. Imports

### 4.1 Import Inside a Section

Concrete content (functions, variables, data) is imported inside the section where it should be placed:

```
section code rom at $0000
  import counter        ; counter's functions placed here
  import display

  func main(): void
    call counter.increment
  end
end

section data ram at $8000
  import counter.state  ; counter.state's variables placed here
end
```

The import statement names a module file. The compiler places the module's exported content into the current section. Address assignment follows the section's base address plus accumulated offset.

### 4.2 Import at Module Scope (Types)

Abstract content — types, enums, constants — has no memory footprint. Files that export only abstract content are imported at module scope, before any section declaration:

```
import counter.types    ; types/constants visible throughout this file

section code rom at $0000
  ...
end
```

By convention, type imports appear at the top of the file. They may technically appear anywhere, but placing them before sections makes file-level dependencies visible at a glance.

### 4.3 Section-Kind Matching

When a module is imported into a section, the compiler checks whether the module's exported content matches the section's kind:

- Importing a functions file into a `data` section: **warning** — "nothing from `counter` matched section kind `data`; no content placed."
- Importing a variables file into a `code` section: **warning** — same message.
- Importing a types file into any section: **no warning** — types are always compatible; they are made visible but nothing is placed.

The import is never an error — the programmer may have a reason — but the silence should not be mysterious.

### 4.4 Auto-Placement (Simple Programs)

When a program has exactly one section of each kind, a module-scope import auto-places content into the unique section of the matching kind:

```
import counter          ; functions → code section, vars → data section (unambiguous)

section code rom at $0000
  func main(): void
    call counter.increment
  end
end

section data ram at $8000
  cursor_x: byte = 0
end
```

When there are multiple sections of the same kind, the compiler requires explicit placement via import inside the target section. Auto-placement is a convenience for the common single-section case.

---

## 5. Exports

### 5.1 Library Files

Library files export content for use by importing programs. They contain no `section` declarations — placement is always the importer's responsibility.

A library file is a collection of:

- Exported functions
- Exported variable declarations
- Exported types, enums, constants

### 5.2 Export Syntax

Prefix any top-level declaration with `export`:

**Functions:**

```
export func increment(): void
  cursor_count = cursor_count + 1
end

export func reset(): void
  cursor_count = 0
end
```

**Variables:**

```
export cursor_count: byte = 0    ; initial value; placement by importer
export high_score: byte          ; zero-initialized
export buffer: byte[256]
```

**Types and constants:**

```
export type CounterMode = enum
  single
  wrap
end

export const MAX_COUNT: byte = 255
```

### 5.3 Library Files May Import Other Libraries

A library file may import other libraries for name resolution. This does not cause placement — it only makes exported symbols from the dependency visible within the library:

```
; counter.zax
import counter.state    ; name resolution only

export func increment(): void
  cursor_count = cursor_count + 1    ; cursor_count from counter.state
end
```

When the main program imports `counter` and `counter.state` separately into their respective sections, the fixup for `cursor_count` in `increment`'s body is resolved to the address assigned by the `section data` import.

### 5.4 No Export from Sections

Symbols declared inside a `section` in the main program file are program-scope within that compilation unit. The `export` keyword is not used on section-level declarations.

---

## 6. Scope Rules

- **Sections control placement, not visibility.** All exported symbols from imported modules and all symbols declared in any section are visible throughout the program.
- **Name resolution is order-independent within a compilation.** Forward references are resolved via fixups.
- **Qualified access uses dot notation.** `counter.increment`, `counter.state.cursor_count`.
- **No implicit namespace pollution.** An `import counter` does not bring `increment` into the unqualified namespace; you write `counter.increment`.

---

## 7. Complete Example

### Library files

```
; stdlib/mem.types.zax
export type BytePtr = addr

export const RAM_START: word = $8000
```

```
; stdlib/mem.zax
import stdlib/mem.types

export func clear(ptr: BytePtr, len: word): void
  ld hl, (ptr)
  ld de, (ptr)
  inc de
  ld bc, (len)
  dec bc
  ld (hl), 0
  ldir
end

export func copy(src: BytePtr, dst: BytePtr, len: word): void
  ld hl, (src)
  ld de, (dst)
  ld bc, (len)
  ldir
end
```

```
; game/player.state.zax
export pos_x:  byte = 0
export pos_y:  byte = 0
export health: byte = 3
export lives:  byte = 3
```

### Main program

```
; main.zax
import stdlib/mem.types    ; BytePtr, RAM_START visible throughout

section code rom at $0000
  import stdlib/mem        ; clear, copy placed here
  import game/player       ; player functions placed here (separate file not shown)

  func main(): void
    call stdlib/mem.clear(RAM_START, 256)
    call game/player.init
    ; ... game loop
  end
end

section data ram at $8000
  import game/player.state ; pos_x, pos_y, health, lives placed here

  frame_count: word = 0
  scroll_offset: byte
end
```

---

## 8. Open Questions

1. **Startup routine ownership.** Who emits the startup initialization routine — the compiler automatically, or an explicit `startup` function the programmer provides? Automatic is safer; explicit gives control.

2. **Binary layout of initialization data.** For `data ram` sections with `= value` initializers, where in the binary are the source bytes stored? (Adjacent to code? In a dedicated init-data segment?) Needs a convention for the output format.

3. **Section ordering in output.** When multiple named sections merge, the output order follows import order. Should there be an explicit ordering mechanism for edge cases?

4. **Extern compatibility.** The existing `extern func ... at <address>` syntax should still work for BIOS/firmware calls. Verify it composes with sections without ambiguity.

Good — I’m going to rewrite Chapter 1 properly this time.

You were right earlier: it needs another layer of structure and density. It must mirror the Pascal Quick Guide pattern:

Concept framing

Formal structure

Toolchain section

Tables

A minimal working program

A “When compiled and executed…” block

Bullet-point notes

This version will be tighter, more instructional, and less conversational.

---

ZAX Quick Guide

Chapter 1 — Overviews and Getting Started

---

1.1 What Is ZAX?

ZAX is a structured assembler for the Z80 processor family.

It combines:

Direct Z80 instruction emission

Structured control flow

Typed storage

Compile-time expressions

Deterministic module layout

ZAX does not introduce:

A runtime system

Automatic memory management

Implicit stack frames

Hidden register preservation

Extended 64KB memory models

ZAX is designed around one core principle:

> Source constructs must lower to predictable, bounded Z80 instruction sequences.

---

1.2 Why Use ZAX?

Traditional Z80 assembly:

Offers complete control

Lacks structure

Encourages duplication

High-level languages:

Offer structure

Hide machine behavior

Introduce runtime cost

ZAX provides:

Feature ZAX Approach

Structure if, while, select, func, op
Memory layout Explicit and storage-visible
Indexing Shift-scaled only
Types Width-based, no signed storage
Linking Deterministic compile-time resolution

ZAX is appropriate for:

Firmware

ROM-based systems

CP/M-style environments

Monitor-driven development

Game engines

OS-level development via extern bindings

---

1.3 ZAX Program Structure

A minimal ZAX program consists of:

Optional const block

Optional type definitions

Optional globals block

Function declarations

An exported entry function

---

General File Structure

const
...
end

type
...
end

globals
...
end

export func main(): void
...
end

All sections are optional except for at least one function.

---

1.4 The ZAX Toolchain

ZAX source files use the extension:

.zax

Compile from the command line:

zax filename.zax

---

Output Files

File Purpose

.hex Intel HEX (64KB model only)
.bin Raw binary image
.d8dbg.json Debug metadata

ZAX targets a single 64KB address space.

Extended-address HEX record types (02/04) are not supported.

---

1.5 External Functions

Operating system or firmware routines may be imported:

extern func os_print_char(a: byte): void

External declarations:

Generate no code

Declare a boundary

Must match the external ABI

This allows integration with:

BIOS routines

Monitor ROM calls

OS kernels

Hardware interrupt handlers

---

1.6 First Program

Create a file named main.zax:

export func main(): void
ld a, 'A'
ret
end

---

Explanation

Construct Meaning

export Makes symbol visible to linker
func Declares a function
(): void No parameters, no return value
ld a, 'A' Raw Z80 instruction
ret Explicit return
end Terminates function

There is:

No implicit ret

No automatic stack frame

No hidden register save

---

1.7 When Compiled and Executed…

The emitted machine code corresponds directly to:

3E 41 ; LD A,'A'
C9 ; RET

When called:

Register A contains ASCII 'A'

Control returns immediately

---

1.8 ZAX v0.2 Core Invariants

ZAX v0.2 introduces important structural rules:

1. Composite types use power-of-two storage sizes

2. Address expressions allow only one runtime atom

3. arr[HL] means 16-bit direct index

4. arr[(HL)] means indirect byte-at-HL

5. sizeof returns padded storage size

6. Enum members must be namespace-qualified

7. Functions do not support overloading

8. Ops expand inline and do not create stack frames

These rules ensure bounded and predictable lowering.

---

1.9 Important Points to Note

ZAX is assembler-first.

Storage layout is explicit and visible.

Compile-time expressions generate no runtime code.

Index scaling never generates multiplication.

Function boundaries are preservation-safe.

Signedness is not a storage property.

---

1.10 What Comes Next

The next chapter explains the Storage Model:

Scalar widths

Composite layout

Power-of-two padding

sizeof and offsetof

Storage-visible invariants

Understanding storage is required before arrays and indexing.

---

If you’d like, I can now:

Refine Chapter 1 even further to match Pascal’s editorial tone more closely

Or begin restructuring the entire tutorial outline using your full Pascal blueprint

Or tighten this into a “Quick Guide condensed edition” style

Your call.

Good — now we follow the Pascal rhythm: after structure and mechanics comes constants and expressions, with formal syntax, tables, and runnable demonstrations.

---

ZAX Quick Guide

Chapter 4 — Constants and Compile-Time Expressions

---

4.1 Introduction

ZAX distinguishes between:

Runtime values (registers, variables)

Compile-time values (constants and folded expressions)

Compile-time expressions:

Do not generate code

Must be fully resolvable by the compiler

Participate in layout and addressing

This chapter defines:

const

Compile-time arithmetic

sizeof

offsetof

Atom interaction rules

---

4.2 Constant Declarations

General Form

const
name = expression
end

The expression must be fully computable at compile time.

---

Example

const
screen_width = 32
screen_height = 24
screen_size = screen_width \* screen_height
end

All three are compile-time constants.

---

When Compiled…

No code is emitted.
Values are substituted directly into instruction operands.

---

4.3 Compile-Time Expression Rules

A compile-time expression may include:

Integer literals

Previously defined constants

Arithmetic operators

sizeof(Type)

offsetof(Type, field)

Parentheses for grouping

It may NOT include:

Registers

Variables

Indirect forms

Function calls

---

4.4 Arithmetic Operators (Compile-Time)

Arithmetic Operators Table

Operator Meaning

- Addition

* Subtraction

- Multiplication
  / Integer division
  % Remainder
  << Shift left
  > >     Shift right
  > >
  > > & Bitwise AND
  > > `	`
  > > ^ Bitwise XOR

All operations use integer arithmetic.

---

Example

const
mask = (1 << 3)
value = (5 + 2) \* 4
end

mask = 8
value = 28

---

4.5 sizeof

Returns storage size of a type (power-of-two rounded).

Example

type Point
x: byte
y: byte
end

const
point_size = sizeof(Point)
end

point_size = 2

---

Example with Padding

type Sprite
x: byte
y: byte
tile: byte
flags: word
end

const
sprite_size = sizeof(Sprite)
end

Natural size = 5
Storage size = 8

sprite_size = 8

---

4.6 offsetof

Returns byte offset of a field within a record.

General Form

offsetof(Type, field_path)

---

Example

const
offset_tile = offsetof(Sprite, tile)
offset_flags = offsetof(Sprite, flags)
end

Layout:

Field Offset

x 0
y 1
tile 2
flags 3

Offsets reflect natural layout order.
Total size still rounded to 8.

---

4.7 Nested offsetof

Allowed when indices are constant:

type Scene
sprites: Sprite[4]
end

const
second_sprite_offset = offsetof(Scene, sprites[1])
end

second_sprite_offset = 8

(Each Sprite occupies 8 bytes.)

---

4.8 Atom Interaction with Expressions

Compile-time arithmetic does not contribute runtime atoms.

Example:

ld a, table[CONST1 + CONST2 * 4]

Atom count = 0
Fully resolved at compile time.

---

Rejected Example

ld a, table[i + j]

Atom count = 2
Compile error.

Diagnostic:

Error: Address expression contains more than one runtime atom.

---

4.9 Grouping Parentheses

Parentheses inside [] may mean:

1. Z80 indirect form (HL)

2. Expression grouping (3+5)

If parentheses contain only constants:

arr[(3+5)]

Compiler may emit a warning:

Warning: Redundant grouping parentheses.

---

4.10 Compile-Time vs Runtime Example

const
index = 5
end

globals
table: byte[16]
end

export func main(): void
ld a, table[index]
ret
end

Here:

index is compile-time constant

Address is computed at compile time

No runtime scaling needed

---

When Compiled and Executed…

Instruction will directly reference:

table + 5

No extra instructions emitted.

---

4.11 Important Points to Note

const values exist only at compile time.

sizeof returns storage size.

offsetof returns byte offset.

Compile-time expressions generate no runtime code.

Runtime atoms only apply to dynamic sources.

Constant arithmetic is unlimited in depth.

---

4.12 Summary

Compile-time expressions in ZAX:

Define layout

Parameterize addressing

Avoid magic numbers

Interact safely with the runtime-atom rule

They form the bridge between storage and structured control flow.

---

What Comes Next

Chapter 5 introduces:

Structured control flow

if

while

repeat

select

Flag-based semantics

Lowering behavior

This is where ZAX moves from layout to execution structure.

---

If you want to keep following Pascal’s rhythm exactly, next chapter should be Control Flow before Functions — because that mirrors the traditional learning progression.

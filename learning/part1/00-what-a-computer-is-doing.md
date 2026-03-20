[Part 1](README.md) | [Numbers and Registers →](01-numbers-and-registers.md)

# Chapter 00 — What a Computer Is Doing

Before you can write assembly language comfortably, you need a clear picture of
what the computer actually is.

At this level, a computer is not an abstract "environment" and it is not a set
of friendly library calls. It is a processor connected to memory. Some memory
holds program code. Some memory holds data. The processor reads bytes from one
address, interprets those bytes as instructions, and uses registers to move and
change data as it works.

That is the mental model this chapter sets up.

Nothing here depends on already knowing the Z80 instruction set. The purpose of
this chapter is simpler than that. By the end of it, you should be able to say
what memory is, what a register is, what machine code is, what an assembler
does, and what kind of thing a small ZAX program turns into after assembly.

---

## The smallest useful picture of a Z80 computer

A beginner does not need every electrical detail of the machine. But you do need
four concrete ideas from the start:

| Part | What it is | Why it matters |
|------|------------|----------------|
| CPU | The Z80 processor itself | Executes instructions, uses registers, reads and writes memory |
| RAM | Read/write memory | Holds data that can change while the program runs |
| ROM | Read-only memory | Often holds monitor code, firmware, or built-in routines |
| I/O ports | Separate hardware addresses for input and output | Let the CPU talk to external devices |

That is already enough to explain a great deal.

The CPU does not "understand programs" in the broad human sense. It understands
very small operations: load a value, store a value, add two values, compare two
values, jump to another address, call a subroutine, return from a subroutine,
read from a port, write to a port.

A real program is built by placing many such operations in memory in the right
order.

---

## Memory is a long row of numbered byte locations

The Z80 can address 65536 byte locations. That means it can name addresses from
`$0000` to `$FFFF`.

It helps to imagine memory as a long row of boxes. Each box holds one byte, and
its address is the box number.

| Address | Stored byte |
|---------|-------------|
| `$0000` | `?` |
| `$0001` | `?` |
| `$0002` | `?` |
| ... | ... |
| `$7FFF` | `?` |
| `$8000` | `?` |
| ... | ... |
| `$FFFF` | `?` |

A byte is the basic unit of storage on the Z80. One byte holds a value from 0 to
255. Two adjacent bytes can be treated together as a 16-bit value called a
**word**, which holds a value from 0 to 65535.

When you write assembly language, you are constantly moving between these two
views:

- single bytes at particular addresses
- 16-bit words formed from two neighbouring bytes

This is why addresses, registers, and instruction operands are so often written
in hexadecimal. Hexadecimal matches the machine neatly: two hex digits describe
one byte, and four hex digits describe one word.

---

## RAM and ROM are both memory, but they do different jobs

The Z80 itself does not care whether a particular address belongs to RAM or ROM.
It simply places an address on the bus and tries to read or write there. The
hardware connected to the CPU decides what happens.

For programming purposes, the distinction is straightforward:

- **RAM** is where values can be changed while the program runs
- **ROM** is where values are fixed in advance and normally cannot be changed by
  the running program

On many Z80 systems, ROM contains monitor code, a boot routine, or built-in
subroutines. RAM contains working data, the stack, and often the program being
loaded and tested.

You do not need a platform-specific memory map yet. What matters for now is that
assembly language always works against real addresses. If you write to RAM, the
stored byte changes. If you jump into a region of code, the CPU begins executing
there. If you call a built-in routine in ROM, you are transferring control to a
fixed address supplied by the machine.

---

## Registers are the CPU's working storage

Memory is large, but it is not where most instructions do their immediate work.
The CPU has a small set of built-in storage locations called **registers**.

The Z80's main byte registers are:

- `A`
- `B`
- `C`
- `D`
- `E`
- `H`
- `L`

Some of them can be paired to form 16-bit register pairs:

- `BC`
- `DE`
- `HL`

There are also special 16-bit registers such as:

- `SP` — the stack pointer
- `PC` — the program counter
- `IX`, `IY` — index registers

You do not need all of them in detail yet. The important mental step is this:

- memory is where data and code live
- registers are where the CPU works right now

A very large amount of assembly language is just this cycle repeated over and
over:

1. load a value from memory into a register
2. do something with it
3. store the result back to memory
4. move on to the next address or the next instruction

That is why learning the register set matters so much. It is not trivia. It is
how the CPU thinks.

---

## Machine code is what the CPU really executes

A processor does not execute source code. It executes bytes.

Each instruction in the Z80 instruction set has a machine-code representation.
Sometimes that representation is one byte. Sometimes it is several bytes. The
first byte usually identifies the operation, and later bytes supply extra
information such as an immediate value or an address.

For example, the idea "load the value 66 into register A" can be written in
assembly language as:

```zax
ld a, 66
```

The CPU does not see the letters `l` and `d`. It sees the machine-code bytes
that mean "load an immediate byte into A" followed by the actual value `66`.

That is why assembly language exists.

Writing raw byte values by hand is possible, but it is not a sensible way to
program. A source file written as bare numbers gives you almost no help in
reading, editing, or debugging. Assembly language replaces those numeric opcode
values with short names called **mnemonics**, and it lets you use labels and
constant names instead of memorising every address.

So the job of the assembler is very concrete:

- read the source text
- resolve names such as labels and constants
- turn each instruction into the correct bytes
- produce output the machine can load and run

ZAX is the assembler you are using in this course.

---

## A running program is just the CPU stepping through memory

When a Z80 program runs, the CPU does not read the whole file and "understand"
it as a complete piece of work. It proceeds one instruction at a time.

The register that controls this process is the **program counter** or `PC`.
`PC` holds the address of the next instruction byte to fetch.

A simplified picture looks like this:

1. `PC` points at some address
2. the CPU reads the byte there
3. it interprets that byte as the start of an instruction
4. if the instruction needs more bytes, the CPU reads them too
5. it performs the instruction
6. it updates `PC` to the next instruction, unless the instruction changed the
   flow of control by jumping, calling, or returning

This is the basis of all control flow.

A straight-line program just keeps advancing through memory. A jump changes `PC`
to a new address. A call saves a return address and then changes `PC` to the
subroutine. A return restores the saved address and continues from there.

That is why addresses matter so much in assembly language. They are not an
implementation detail. Control flow is literally the act of choosing the next
address to execute.

---

## Code and data both live in memory

One of the first things worth understanding is that the CPU does not have one
kind of memory for code and another for data. Code bytes and data bytes both
live in memory.

What makes a byte "an instruction" is not the byte itself. What matters is that
`PC` reaches that byte and the CPU fetches it as part of execution.

What makes a byte "data" is that the program reads or writes it as a value.

This distinction is simple but important:

- if the CPU fetches a byte through `PC`, it is treated as instruction stream
- if the program reads or writes the byte through some other address reference,
  it is treated as data

Good programs keep those roles clear. They place code in code areas, data in
data areas, and they use names so the source makes that layout understandable.

---

## What an assembler adds beyond raw machine code

An assembler does more than just translate mnemonics.

It also gives you naming.

That sounds modest, but it is one of the main reasons assembly language is
usable at all. In machine code, an address is just a number. In assembly, that
number can have a name.

For example, if you want to store one byte at address `$8000`, machine code only
knows the numeric address. In assembly, you can give that location a name such
as `result`. From then on, the source can refer to `result` instead of forcing
you to remember `$8000` everywhere.

The same is true for constants. If a value should always be `$42`, you can name
it `StoredValue` and use the name everywhere in the source. The assembler
replaces the name with the correct numeric value when it builds the program.

This is a practical distinction between machine code and assembly language:

| Machine code | Assembly language |
|--------------|-------------------|
| raw bytes | mnemonics and names |
| raw addresses | labels and constants |
| hard to read | written to be read and edited by humans |

ZAX keeps that basic assembler role, but gives you a clearer source language to
work in.

---

## Reading the first ZAX example

Now look at the first example file:

`/Users/johnhardy/.codex/worktrees/7e4e/ZAX/learning/part1/examples/00_first_program.zax`

```zax
const StoredValue = $42          ; the value we will store

section data vars at $8000
  result: byte = 0               ; one byte of RAM, initialized to zero
end

export func main(): void
  ld a, StoredValue              ; A = $42
  ld (result), a                 ; write A to the byte named 'result'
  ; No explicit ret needed: ZAX emits the epilogue and ret automatically at end.
end
```

This file is small, but it already contains the main pieces you need to learn to
recognise.

### 1. A constant

```zax
const StoredValue = $42
```

This gives the name `StoredValue` to the numeric value `$42`.

The processor never sees the name. During assembly, ZAX replaces the name with
its value wherever the name is used.

### 2. A data section

```zax
section data vars at $8000
  result: byte = 0
end
```

This reserves one byte of storage at address `$8000` and gives that byte the
name `result`.

That means:

- `result` is a name in the source
- `$8000` is the address in memory
- the initial value stored there is `0`

This is already enough to introduce a basic but important idea: a variable in
assembly language is just a named memory location.

High-level languages tend to hide the address. Assembly language does not. The
name is there to save you from writing the numeric address all over the source,
but the underlying reality is still a particular byte in memory.

### 3. A function body containing raw Z80 instructions

```zax
export func main(): void
  ld a, StoredValue
  ld (result), a
end
```

Ignore the outer words `export func main(): void` for a moment and look at the
two instructions inside:

```zax
ld a, StoredValue
ld (result), a
```

Read them in plain English like this:

- put the value `$42` into register `A`
- store the value currently in `A` into the memory byte named `result`

That is a complete program action. After it runs, the byte at address `$8000`
contains `$42`.

This is exactly the kind of mental model you want from the start. A program is
not "doing something mysterious". It is changing machine state.

In this case the state change is simple:

| Before | After |
|--------|-------|
| `A` unknown | `A = $42` |
| `($8000) = 0` | `($8000) = $42` |

That is enough to count as real low-level programming.

---

## What the assembler does with this file

When ZAX assembles the file, it does not preserve the text. It produces output
for the machine.

At a high level, the assembler performs jobs like these:

1. record that `StoredValue` means `$42`
2. record that `result` refers to address `$8000`
3. reserve and initialise the data byte for `result`
4. translate each instruction into machine-code bytes
5. lay out the final output in memory order

The important point for a beginner is not memorising the exact emitted bytes.
The important point is understanding that assembly is still a translation step.
You write readable source, but the machine ultimately receives byte values at
specific addresses.

Later chapters will spend more time inspecting generated output. For now, it is
enough to be clear about the direction of travel:

- source text in
- named values resolved
- machine-code bytes out

---

## What assembly language programming is really about

At this stage it is worth saying plainly what you are learning to do.

Assembly language programming is the work of controlling a processor at the
level of registers, addresses, instructions, and byte values.

That usually means one or more of these tasks:

- moving data between memory and registers
- changing data with arithmetic or logic instructions
- choosing the next instruction address with jumps and calls
- reading from or writing to hardware ports
- arranging memory so code and data live in the right places

That is why the subject can feel demanding at first. The machine does not infer
very much. It does exactly what the instructions say.

That is also why an assembler matters. Nobody wants to write programs directly as
opcode bytes and raw addresses. You need names, structure, and readable source.
ZAX gives you that source language while still letting you work directly with the
Z80 model underneath.

---

## What to keep in mind before moving on

If this chapter has done its job, you should now have a simple but solid picture
in mind:

- the computer has a CPU, memory, and input/output hardware
- memory is a set of addressed byte locations
- the CPU works through registers and reads instructions from memory
- machine code is the byte form the CPU executes
- assembly language is a readable way to describe those same operations
- an assembler translates source text into the bytes the machine actually uses

That is enough foundation for the next step.

The next chapter turns from memory to the CPU itself: registers, register pairs,
and the number systems you need in order to read and write Z80 code comfortably.

## What This Chapter Teaches

- A Z80 computer can be understood, at first, as a CPU connected to RAM, ROM,
  and I/O hardware.
- Memory is a flat space of 65536 addressed byte locations.
- A byte holds 8 bits; a word is 16 bits stored as two adjacent bytes.
- Registers are the CPU's working storage.
- Machine code is the byte sequence the CPU executes.
- Assembly language replaces raw opcode numbers and raw addresses with
  mnemonics and names.
- A ZAX source file describes constants, data, and instructions that the
  assembler turns into machine output.
- A simple program can be understood as a change in machine state: register
  values and memory contents before and after execution.

## What Comes Next

Chapter 01 introduces the register set of the Z80 and the number formats used to
reason about it.

That chapter matters because almost every later example depends on being able to
answer simple questions such as: which registers hold one byte, which ones hold
a word, and what value does `$7F` or `$0100` actually represent?

---

[Part 1](README.md) | [Numbers and Registers →](01-numbers-and-registers.md)

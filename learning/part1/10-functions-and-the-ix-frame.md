[← A Complete Program](09-a-phase-a-program.md) | [Part 1](README.md) | [Structured Control Flow →](11-structured-control-flow.md)

# Chapter 10 — Functions and the IX Frame

Chapter 7 showed that `call` is just a `push` of the return address followed by a `jp`, and `ret` is just a `pop` of that address back into PC. You passed arguments in registers, documented the convention in a comment, and hoped every caller got the convention right. This works. It works right up to the point where you run out of registers, or forget which register carries what, or change a function's inputs and miss one of the twelve callers.

This chapter introduces ZAX functions — the first feature in this book that is not raw Z80 assembly. A ZAX function declares its parameters and locals by name. The compiler builds a **stack frame** using IX as a base pointer, and you access every parameter and local through standard Z80 `ld` instructions with IX-relative offsets. No new syntax inside the function body. Just `ld a, (ix+name+0)` — the same displaced addressing you learned in Chapter 6.

---

## Why register passing runs out

Consider a subroutine that scans a byte table and returns the largest value. Chapter 7's version passed the table pointer in HL and the count in B:

```zax
; find_max: scan a byte table, return largest value.
; Inputs:  HL = pointer to first byte, B = count
; Outputs: A = maximum
```

Two parameters, two registers. Now add a third parameter — a threshold value:

```zax
; count_above: count bytes strictly above a threshold.
; Inputs:  HL = pointer, B = count, C = threshold
; Outputs: A = count
```

Three parameters, three registers. And inside `count_above`, the running count has to live somewhere too — that was D. Four values, four registers. You are already running low, and neither function does anything complicated.

The problem compounds when functions call other functions. If `main` calls `find_max` and then `count_above`, it has to reload HL before the second call because `find_max` walked HL to the end of the table. The only way to know this is to read `find_max`'s body — the function signature says nothing about side effects.

Raw register passing does not scale. It works for small programs where the programmer holds the entire register map in their head. Beyond that, you need a systematic way to pass values.

---

## The stack frame

The solution is the same one that nearly every CPU architecture uses: dedicate a register as a **base pointer** into the stack, and place parameters and local variables at known offsets from that pointer.

On the Z80, that register is IX. When a ZAX function with parameters or locals is called, the compiler emits a three-instruction prologue:

```asm
push ix          ; save the caller's IX
ld   ix, 0
add  ix, sp      ; IX = current stack pointer
```

After the prologue, IX points to the base of the frame. Parameters — which the caller pushed onto the stack before the `call` — sit at positive offsets from IX. Local variables sit at negative offsets. The compiler knows the exact offset of every named value.

At function exit, the compiler emits the matching epilogue:

```asm
ld  sp, ix       ; discard locals
pop ix           ; restore caller's IX
ret
```

Six instructions of overhead — three in, three out — plus any register saves. A raw `call` and `ret` are two instructions with no frame at all. The frame is not free. For a tight inner loop calling a tiny helper, the overhead may matter. For a function called a handful of times from a larger program, the cost is small relative to what the function actually does, and the gain in clarity is real.

---

## Declaring a function with parameters

Here is the `find_max` subroutine rewritten as a ZAX function with typed parameters:

```zax
func find_max_f(tbl: addr, len: byte): AF
  var
    running_max: byte = 0
  end

  ; load parameters into registers using raw IX access
  ld l, (ix+tbl+0)              ; low byte of tbl
  ld h, (ix+tbl+1)              ; high byte of tbl
  ld b, (ix+len+0)              ; len is a byte — just one load

find_max_loop:
  ld a, (hl)
  cp (ix+running_max+0)
  jr c, find_max_skip
  ld (ix+running_max+0), a      ; new maximum
find_max_skip:
  inc hl
  djnz find_max_loop

  ld a, (ix+running_max+0)      ; return result in A
end
```

Look at what happened. The comment block is gone — the parameter names `tbl` and `len` say what the function expects. The local `running_max` says what it holds. And every access is a standard Z80 `ld` instruction with an IX-relative offset. The compiler resolves `(ix+tbl+0)` to the correct numeric displacement. You never count stack slots by hand.

`tbl: addr` is a 16-bit address parameter — it occupies a two-byte frame slot. To load it into HL you need two byte-wide loads: `(ix+tbl+0)` for the low byte into L, `(ix+tbl+1)` for the high byte into H.

`len: byte` is a one-byte parameter. It still occupies a 16-bit slot on the stack (everything is pushed as a word), but only the low byte matters: `(ix+len+0)` is all you need.

`running_max: byte = 0` is a local variable initialized to zero. It sits at a negative offset from IX. You read it with `ld a, (ix+running_max+0)` and write it with `ld (ix+running_max+0), a`.

The `+0` and `+1` suffixes select which byte of a slot you want. For a byte-sized value, `+0` is the only one you use. For a word-sized value, `+0` is the low byte and `+1` is the high byte — little-endian, as always on the Z80.

---

## Calling a function

The caller names the arguments directly:

```zax
find_max_f values, TableLen
```

The compiler emits the pushes for `values` and `TableLen`, the `call`, and the stack cleanup after return. You do not load HL or B yourself. The compiler matches each argument to its parameter, checks types, and generates the call sequence.

After the call returns, you read the result from whichever register the function declared:

```zax
find_max_f values, TableLen
ld (max_val), a                  ; result is in A (declared : AF)
```

No register pre-loading. No comments explaining which register holds what.

---

## The return clause

The return clause controls which registers carry the result and which ones the compiler saves and restores:

| Declaration | Meaning | Compiler preserves |
|-------------|---------|-------------------|
| `func f()` | No return value | AF, BC, DE, HL all saved/restored |
| `func f(): AF` | A carries the result | BC, DE, HL saved; AF is not |
| `func f(): HL` | Typed return in HL (byte in L, H = 0) | AF, BC, DE saved; HL is not |

`: AF` does **not** deliver A through a typed mechanism. It simply removes AF from the save/restore set, so whatever value A holds at function exit survives into the caller. This is the same convention from Chapter 7 — caller and callee agree that A carries the result. The declaration tells the compiler not to clobber it with a `pop AF` in the epilogue.

`: HL` is the typed return: byte values go in L (H zeroed), word values fill all of HL.

Omitting the return clause when the function leaves a meaningful value in A is a bug. The compiler's `pop AF` in the epilogue will overwrite A before the caller sees it. Declare `: AF` to prevent this.

---

## Raw access vs the `:=` operator

Everything in this chapter uses raw Z80 instructions to access frame slots. You write `ld a, (ix+running_max+0)` and the compiler resolves the name to an offset. This is deliberate: you already know IX-relative addressing from Chapter 6. The frame is just a structured use of what you already learned.

ZAX also provides a typed assignment operator — `:=` — that handles frame access at a higher level. It picks the right registers, handles word-sized slots that need multi-instruction sequences, and checks types. Chapter 12 covers `:=` in full. By the time you get there, you will understand exactly what it generates, because you will have written the raw version by hand.

---

## A second function: count_above

```zax
func count_above_f(tbl: addr, len: byte, threshold: byte): AF
  var
    cnt: byte = 0
  end

  ld l, (ix+tbl+0)
  ld h, (ix+tbl+1)
  ld b, (ix+len+0)

count_loop:
  ld a, (hl)
  cp (ix+threshold+0)
  jr c, count_skip               ; A < threshold: skip
  jr z, count_skip               ; A = threshold: skip (strictly above)
  ld a, (ix+cnt+0)
  inc a
  ld (ix+cnt+0), a               ; cnt = cnt + 1
count_skip:
  inc hl
  djnz count_loop

  ld a, (ix+cnt+0)               ; return count in A
end
```

Three parameters and one local — four named values, each at its own IX-relative offset. In raw Z80, this function needed four registers (HL, B, C, D) and a `push bc / ld d, 0 / pop bc` dance just to initialize the counter without disturbing the inputs. Here, `cnt` has its own frame slot. No juggling.

Notice that `cp (ix+threshold+0)` compares A directly against the frame slot. You do not have to load the threshold into a register first — `cp` accepts `(IX+d)` as its operand. This frees C, which the raw version had tied up holding the threshold.

---

## IXH, IXL, and the frame conflict

Chapter 3 introduced the half-index registers IXH, IXL, IYH, and IYL. Inside a function that has parameters or locals, the compiler owns IX as the base pointer. That means IXH and IXL are off limits — using them would corrupt the frame pointer. IYH and IYL remain free unless IY is also in use.

In frameless functions — those with no parameters and no locals, like `func main()` in all the earlier examples — IX is unclaimed, and all four halves are available as extra byte-sized scratch registers.

---

## Frameless vs framed

Not every function pays the frame cost. A function with no parameters and no `var` block is **frameless**. The compiler emits no prologue and no epilogue — just the instructions you wrote, with a `ret` at the end. Every function before this chapter was frameless.

The frame exists only to support named parameters and locals. If you do not need them — because the function is short enough that register passing works fine — skip the declaration and write a raw subroutine. The frame is a tool, not a tax.

---

## Summary

- A ZAX `func` with parameters or locals gets a stack frame. IX is the base pointer.
- The compiler emits a three-instruction prologue and epilogue. Frameless functions (no params, no locals) have none of this overhead.
- Parameters sit at positive IX offsets; locals sit at negative offsets.
- You access both with standard Z80 instructions: `ld a, (ix+name+0)` for a byte, `(ix+name+0)` / `(ix+name+1)` for the low/high bytes of a word.
- The `+0` / `+1` suffix selects the byte lane within a slot.
- The caller names arguments in the call; the compiler emits the pushes and cleanup.
- The return clause (`: AF`, `: HL`, or omitted) controls which registers survive and which the compiler preserves.
- IXH/IXL are unavailable inside framed functions. IYH/IYL remain free.
- Chapter 12 introduces `:=`, which automates the frame access you wrote by hand here. By then you will know what it generates.

---

[← A Complete Program](09-a-phase-a-program.md) | [Part 1](README.md) | [Structured Control Flow →](11-structured-control-flow.md)

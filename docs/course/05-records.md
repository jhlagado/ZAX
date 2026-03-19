# Chapter 05 — Records

The Chapter 05 examples introduce typed aggregate state. Up to this point, every
algorithm has worked with scalars — individual bytes and words. A record collects
multiple named fields into a single compound value, and an array of records brings
both structured access and interesting layout questions together.

The Chapter 05 example corpus is a single file: `ring_buffer.zax`. It is compact, but
it covers a lot of ground. It defines a record type, declares an array of that
record type at a non-power-of-two size, stores and retrieves field values through
typed paths, and implements a bounded FIFO queue with a modular index.

---

## Record Types and Field Access

A `type` declaration in ZAX defines a named record with fields in order:

```zax
type Entry
  value: byte
  stamp: word
end
```

`sizeof(Entry)` is 3 — one byte for `value`, two bytes for `stamp`. There is no
padding. Field offsets are computed from declaration order using exact sizes:
`offsetof(Entry, value) = 0`, `offsetof(Entry, stamp) = 1`.

An array of records is declared like any other typed array, with the element type
naming the record:

```zax
section data vars at $8000
  entries: Entry[5]
end
```

`sizeof(Entry[5]) = 15`. Because 3 is not a power of two, the compiler cannot
lower the index scale to a pure shift chain — it emits a shift-and-add sequence
for the stride multiplication. You do not write that sequence; the compiler
handles it. The indexing syntax is the same as for any array:

```zax
  b := tail_slot
  a := entry_value
  entries[B].value := a
  entries[B].stamp := entry_stamp
```

(From `examples/course/unit5/ring_buffer.zax`, lines 40–43.)

`entries[B].value` is a typed path expression: take the `B`-th element of the
`entries` array, then access its `value` field. On the left side of `:=`, it is
a store — the compiler emits the address calculation for `entries + B * 3 + 0`
and a `ld` instruction to write A there. On the right side, it would be a load.
The same path notation works for both read and write.

This is one of the clearest ZAX benefits in the Chapter 05 example: the field access
reads as `entries[B].value` rather than as a hand-computed offset load. When the
`Entry` type definition changes, the offsets update automatically.

---

## The Ring Buffer Pattern

A ring buffer is a fixed-capacity queue that wraps its write and read positions
around a circular index. The state consists of:

- `entries`: the backing array of `Entry` records
- `head_slot`: the index of the oldest entry (next to be dequeued)
- `tail_slot`: the index of the next free slot (next to be enqueued)
- `used_slots`: the count of entries currently in the buffer

Both `head_slot` and `tail_slot` advance modularly: when they reach the capacity
limit, they wrap back to zero. The `next_slot` helper in `ring_buffer.zax`
encapsulates that wrap:

```zax
func next_slot(slot_index: byte): HL
  a := slot_index
  inc a
  cp Capacity
  if C
    ld h, 0
    ld l, a
    ret
  end
  ld hl, 0
end
```

(From `examples/course/unit5/ring_buffer.zax`, lines 20–31.)

`inc a` advances the slot index. `cp Capacity` tests whether the incremented value
has reached the capacity bound: if carry is set, the incremented value is strictly
less than `Capacity` and is returned as-is. If carry is clear, the index has
reached or passed the end of the array, and zero is returned as the wrapped value.
For a capacity of 5, this produces the sequence 0, 1, 2, 3, 4, 0, 1, 2, ...

This helper is called after every enqueue and dequeue:

```zax
  next_slot tail_slot
  ld a, l
  tail_slot := a
```

The result comes back in HL (per the `: HL` return declaration). The caller
extracts the byte value from L with `ld a, l` and stores it into `tail_slot`.
The `ld a, l` is raw Z80; `tail_slot := a` is the typed store.

---

## Enqueue and Dequeue

`enqueue` pushes an entry onto the tail of the queue. It first checks whether the
buffer is full (`used_slots >= Capacity`) and returns early if so. Then it writes
both fields to the tail slot, advances the tail, and increments the used count:

```zax
func enqueue(entry_value: byte, entry_stamp: word)
  a := used_slots
  cp Capacity
  if NC
    ret
  end

  b := tail_slot
  a := entry_value
  entries[B].value := a
  entries[B].stamp := entry_stamp

  next_slot tail_slot
  ld a, l
  tail_slot := a

  succ used_slots
end
```

(From `examples/course/unit5/ring_buffer.zax`, lines 33–50.)

`succ used_slots` increments the module-level `used_slots` byte directly. `succ`
and `pred` work on any typed scalar storage path — not only on frame-local `var`
slots, but also on module-level variables declared in named `data` sections. Here,
`used_slots` lives in the module's `vars` section and `succ` increments it in
place.

`dequeue` removes and returns the entry at the head. It checks for empty (`used_slots`
is zero), reads the value from the head slot, advances the head, and decrements the
used count:

```zax
func dequeue(): HL
  ...
  l := head_slot
  a := entries[L].value
  removed_value := a

  next_slot head_slot
  ld a, l
  head_slot := a

  pred used_slots
  ...
end
```

(From `examples/course/unit5/ring_buffer.zax`, lines 52–77, condensed.)

The read side uses L as the index register — `l := head_slot` loads the slot
index into L, then `entries[L].value` reads the `value` field of that element.
This mirrors the write in `enqueue`, which used B. Either register works; the
choice is driven by what is already live and convenient at that point in the
function.

---

## Typed Paths vs Raw Loads

It is worth pausing to compare what field access looks like with and without the
ZAX path syntax. In raw Z80 assembly, reading `entries[b].value` for the current
record at index B with a non-power-of-two stride would require:

1. Computing `B * 3` using a shift-add sequence
2. Adding the base address of `entries`
3. Loading with `ld a, (hl)`

In ZAX, `entries[B].value` on the right side of `:=` emits exactly that sequence
— but the code reads as a field access on a named type. When the `Entry` type
changes (say, `stamp` becomes a `byte` instead of a `word`), the stride and the
field offset both update automatically throughout the program.

The field path notation does not hide the machine. The `.asm` output will show
the multiply-add sequence for the stride and the resulting memory load. But the
source code expresses intent — "the value field of the B-th entry" — rather than
the mechanics.

---

## What This Chapter Teaches

- A `type` declaration groups named fields. `sizeof` and `offsetof` compute layout
  automatically using exact field sizes. There is no padding.
- Array element access and field access compose: `entries[B].value` is a single
  typed path expression that the compiler lowers to the correct address calculation
  and load or store.
- Non-power-of-two element sizes are fully supported. The compiler emits a shift-
  and-add stride sequence rather than a pure shift chain.
- `succ` and `pred` work on module-level variables, not only on frame locals. Any
  typed scalar storage path is a valid operand.
- The `next_slot` modular-index helper is the idiomatic way to wrap an index
  without an explicit division: increment, compare against the capacity bound,
  return zero on overflow.

---

## Examples in This Chapter

- `examples/course/unit5/ring_buffer.zax` — FIFO queue over an `Entry[5]` array
  with modular index advance

---

## What Comes Next

Chapter 06 takes up recursion. Recursive functions in ZAX use the same `func`
and `var` block syntax as everything else — no special forms — but the call
stack becomes the active data structure. Reading the Towers of Hanoi and
recursive array examples requires tracking the IX frame stack mentally, which
is the natural next step after the structured record layout in this chapter.

---

## Exercises

1. `ring_buffer.zax` stores both a `value` and a `stamp` in each `Entry`. If you
   removed the `stamp` field, `sizeof(Entry)` would become 1 — a power of two.
   Would the indexing code in `enqueue` and `dequeue` look different? Check the
   `.asm` output for both versions and compare the stride calculation.

2. The `next_slot` function returns 0 when the incremented index reaches
   `Capacity`. What happens if `Capacity` is 0? Is this a case worth guarding
   against in the function, or does the calling code make it impossible?

3. `enqueue` takes `entry_stamp: word` as its second parameter. But
   `entries[B].stamp := entry_stamp` writes directly from the typed parameter to
   the typed field. Trace through what the compiler must emit for this store,
   given that `stamp` is at offset 1 within `Entry` and `B` is the index register.

4. The buffer uses a separate `used_slots` counter to track occupancy. An
   alternative is to derive occupancy from `head_slot` and `tail_slot` directly:
   the buffer is empty when they are equal and full when
   `(tail_slot + 1) % Capacity == head_slot`. Would removing `used_slots` simplify
   or complicate the code? What would you trade away?

[← Composition](07-composition.md) | [Part 2](README.md) | [Gaps and Futures →](09-gaps-and-futures.md)

# Chapter 8 — Pointer Structures

The Chapter 08 examples work with data that is not laid out as a flat array. A
linked list is a chain of individually addressable nodes, each holding a value
and the address of the next node in the chain. A binary search tree is a
hierarchy of nodes where each node holds a value and the addresses of its left
and right children. Both structures share a common requirement: to move from one
node to the next, you must follow a stored address — a pointer — rather than
increment an index. That act of following a pointer is the defining operation
in this chapter.

ZAX has two ways to express a typed pointer. A field declared as `@TreeNode`
stores a 2-byte address and tells the compiler which record layout to use when
you access `.value`, `.left`, or `.right` — no cast required at the use site. A
local or parameter declared the same way (`cur: @ListNode`, `node: @TreeNode`)
works identically: the slot holds an address, and `.field` dereferences through
it automatically. The explicit cast form `<Type>base.field` remains available
when the base is a register (`HL`, `DE`) or an untyped `addr` — cases where no
declaration carries the type.

---

## Typed Reinterpretation: `<Type>local.field`

The syntax is `<Type>local.field`, where `local` holds an address and
`Type` is the record type you want to interpret it as. The compiler resolves
`field` against `Type`'s declaration and emits the appropriate load or store
through that address.

Consider the `ListNode` record from `linked_list.zax`:

```zax
type ListNode
  value: byte
  next:  @ListNode
end
```

The `next` field is declared as `@ListNode` — a 2-byte address that points to
another `ListNode`. Given a local `current_ptr: @ListNode`, you read the value
and advance with:

```zax
a := current_ptr.value
current_ptr := current_ptr.next
```

No cast is needed. The compiler knows from the declaration that `current_ptr`
holds a pointer to a `ListNode`, and that `next` in turn holds a pointer to
another `ListNode`. These two lines are the core of the traversal. Everything
else — the null check, the accumulation — is the supporting work around them.

When the base is a register or an untyped `addr`, the explicit cast form is
still used: `<ListNode>hl.value` reads the `value` field through HL.

---

## Linked List Traversal

### `linked_list.zax`

The linked list example builds a three-node chain and sums the values. The nodes
`node_a`, `node_b`, and `node_c` are declared as static module-level `ListNode`
records, with `list_head` holding the address of the first node. This is a
fixed-pool layout: the nodes are statically allocated, their addresses are
known at compile time, and `init_list` wires them together by writing the
`@node_b` and `@node_c` address constants into the `next` fields.

The `@symbol` form takes the address of a named module symbol. `node_a.next :=
@node_b` writes the compile-time address of `node_b` into the `next` field of
`node_a`. This is the static equivalent of a dynamic allocation: instead of
calling an allocator, you name the nodes and connect them by address.

The traversal in `list_sum` has this shape:

```zax
  current_ptr := list_head

  ld a, 1
  or a
  while NZ
    hl := current_ptr
    ld a, h
    or l
    if Z
      hl := total_value
      ret
    end

    a := current_ptr.value
    ld e, a
    ld d, 0
    hl := total_value
    add hl, de
    total_value := hl

    current_ptr := current_ptr.next

    ld a, 1
    or a
  end
```

(From `learning/part2/examples/unit8/linked_list.zax`, lines 42–66.)

The null check — `hl := current_ptr` / `ld a, h` / `or l` / `if Z` — loads the
current pointer into HL and tests whether both bytes are zero. Zero is the
null sentinel: a stored `addr` of zero means "no next node." The test uses the
`or l` trick seen throughout the course: `or` with L sets the Z flag if both H
and L are zero, without using a compare instruction. When the pointer is null,
the function returns `total_value` in HL.

When the pointer is non-null, the field access reads the `value` byte
into A. The byte is zero-extended into DE — `ld e, a` / `ld d, 0` — and added
to the running total in HL. Then `current_ptr` is updated from its own `next`
field, and the loop continues.

The null check at the top of the loop is the standard pattern for sentinel
termination in ZAX pointer code. The list may be empty (if `list_head` is
zero), and the same check covers that case without special handling before the
loop.

See `learning/part2/examples/unit8/linked_list.zax`.

---

## Binary Search Tree Traversal

### `bst.zax`

The binary search tree example builds a four-node tree and searches it for a
target value. The node record is:

```zax
type TreeNode
  value: byte
  left:  @TreeNode
  right: @TreeNode
end
```

Each node has a value and two child pointers. The `left` and `right` fields are
declared as `@TreeNode` — each stores a 2-byte address pointing to another
`TreeNode`, or zero for a missing child. The search function `bst_contains` is
recursive. It takes a typed node pointer and a target value, and returns 1 in HL
if the target is in the subtree rooted at that node, 0 otherwise.

The null check is the base case — if the address is zero, the target is not
present:

```zax
func bst_contains(node_ptr: @TreeNode, target_value: byte): HL
  hl := node_ptr
  ld a, h
  or l
  if Z
    ld hl, 0
    ret
  end
```

(From `learning/part2/examples/unit8/bst.zax`, lines 50–57.)

After the null check, the value at the current node is read and compared to
the target:

```zax
  a := node_ptr.value
  b := target_value
  cp b
  if Z
    ld hl, 1
    ret
  end
  if C
    hl := node_ptr.right
    bst_contains hl, target_value
    ret
  end

  hl := node_ptr.left
  bst_contains hl, target_value
```

(From `learning/part2/examples/unit8/bst.zax`, lines 59–74.)

`cp b` subtracts B from A and sets flags without storing a result. `if Z` catches
the equal case. `if C` catches the case where A < B — that is, where the current
node's value is less than the target, meaning the target must be in the right
subtree. If neither condition holds (A > B), the search continues into the left
subtree.

The child pointer is retrieved with `node_ptr.right` or `node_ptr.left`.
Because `node_ptr` is declared as `@TreeNode`, the compiler dereferences through
the stored address automatically. The result is loaded into HL and passed
directly as the first argument to the recursive call. Each recursive invocation
handles its own null check, so the pattern is uniform at every level of the tree.

Compare this with the linked list traversal: the list uses a `while` loop
because the structure is linear — there is always at most one next step. The
BST uses recursion because the structure is branching — at each node, the
algorithm commits to one of two subtrees, and the choice depends on a
comparison. Recursion maps onto that shape directly: the call stack mirrors the path from
root to target node.

See `learning/part2/examples/unit8/bst.zax`.

---

## Unions: Named Field Overlay

Sometimes you need to read the same bytes in two different ways. You have a
16-bit word and you want just the low byte. You could mask with `AND $FF`, but
that only works in A and loses the high byte. You could store the word to memory
and read back one byte — but then you are managing the address yourself and
hoping you got the offset right. A **union** lets you declare the overlay once
and access each view by name.

Here is the `RegPair` union from `reg_pair.zax`:

```zax
union RegPair
  full_word: word
  lo_byte: byte
end
```

Both fields start at byte offset 0. `sizeof(RegPair)` is 2 — the size of the
largest field. When you write through `full_word`, you store two bytes. When you
read through `lo_byte`, you read the first of those two bytes.

This is where the Z80's little-endian layout does the work for you. Writing
`$0134` through `full_word` puts `$34` at offset 0 and `$01` at offset 1.
Reading `lo_byte` reads offset 0 — `$34`, the low byte:

```zax
section data vars at $8000
  scratch: RegPair
end

func lo_byte_of(input_word: word): HL
  scratch.full_word := input_word
  a := scratch.lo_byte
  ld l, a
  ld h, 0
end
```

(From `learning/part2/examples/unit8/reg_pair.zax`, lines 13–27.)

You don't need to give `scratch` an initializer — it starts at zero.
`scratch.full_word := input_word` stores the two-byte argument at `$8000`.
`a := scratch.lo_byte` loads the single byte at `$8000` — the low byte. You
then zero-extend into HL before returning.

This is the part that catches people if you are used to records: `full_word`
and `lo_byte` look like they should live at different addresses, but they don't.
Every field in a union starts at offset 0. They overlap completely — that is the
point.

You can only declare a union at module scope, not inside a function.

There are no tags and no runtime safety checks. You choose which field to read
at each access site, and the compiler does not verify that you read through the
same field you wrote. The overlay is entirely your responsibility — just like
every other memory interpretation on the Z80.

See `learning/part2/examples/unit8/reg_pair.zax`.

---

## Typed Pointers: `@TypeName`

Both examples in this chapter use the `@TypeName` form to declare typed pointer
fields and parameters. A field declared as `@TreeNode` stores a 2-byte address
and carries the type through to every field access — no cast is needed at the use
site. The same form works for locals and parameters:

```zax
var cur: @ListNode       ; local: addr-sized slot, typed as pointing to ListNode
func f(node: @TreeNode)  ; parameter: addr-sized slot, typed as pointing to TreeNode
```

Declare the pointer once with its type; use `.field` everywhere without repeating
the cast. Reserve `<Type>base.field` for the cases where the base is a register
(`HL`, `DE`, `BC`) or an untyped `addr` value — situations where no declaration
carries the type.

One limitation remains: `next: @ListNode` declares that `next` holds a pointer
to a `ListNode`, but `addr` itself carries no element type. Chaining through
multiple hops in a single expression — `a.b.c` where each step follows a pointer
— is not yet supported. Each hop needs its own intermediate assignment to HL.
Chapter 09 records this alongside other open design questions.

---

## Summary

- `type RecordName` / `field: type` / `end` defines a record. Fields have
  explicit types; the compiler tracks offsets.
- A field declared as `@TypeName` stores a 2-byte address and carries the type:
  `left: @TreeNode` means "a pointer to a TreeNode." Field access on that field
  dereferences through the stored address automatically. The same form works for
  locals (`var cur: @ListNode`) and parameters (`func f(node: @TreeNode)`).
- `<Type>base.field` casts at the access site when the base is a register (`HL`,
  `DE`) or an untyped `addr`. Prefer the `@TypeName` declaration form wherever
  the pointer has a fixed type — it removes the cast from every use site.
- The null sentinel is stored address zero. The test is `ld a, h` / `or l` /
  `if Z` — the same `or` trick used throughout the course to test a 16-bit
  value for zero without a compare.
- Static linked structures are built with `@symbol` address constants. Nodes
  are named module-level records; `next` and `left`/`right` fields are
  initialised with the compile-time addresses of the target nodes.
- Linked traversal uses a `while` loop; tree traversal uses recursion. The
  control-flow shape follows the data structure's shape.
- `union TypeName` / `field: type` / `end` declares an overlay type. All
  fields start at offset 0; `sizeof(union)` is the largest field size. Writing
  through one field and reading through another reinterprets the same bytes
  without arithmetic.

---

## Examples in This Chapter

- `learning/part2/examples/unit8/linked_list.zax` — singly-linked list sum using
  pointer traversal and null-sentinel termination
- `learning/part2/examples/unit8/bst.zax` — binary search tree search using recursive
  typed-pointer traversal
- `learning/part2/examples/unit8/reg_pair.zax` — union overlay: write a 16-bit word,
  read the low byte without arithmetic

---

## What Comes Next

Chapter 09 closes the course with the eight-queens problem — a backtracking
search that puts maximum pressure on the loop-escape surface. It also functions
as a design review: after nine chapters of examples, the chapter maps which
language gaps remain, which have been addressed, and what the current design
work is targeting.

---

## Exercises

1. `list_sum` initialises `total_value` to zero and accumulates into it.
   Rewrite the traversal as a recursive function in the style of
   `array_sum_recursive.zax` from Chapter 06. How does the call depth relate to the
   list length?

2. The null check `ld a, h` / `or l` / `if Z` tests whether HL is zero. What
   does this test actually check, and could it give a false positive? Under what
   addressing convention is it safe to use zero as a null sentinel?

3. `bst_contains` uses `if C` (carry set) to detect that the current node's
   value is less than the target. Trace the comparison for `target_value = 6`
   starting from `root_node.value = 8`. Which branches are taken at each level?

4. `bst.zax` initialises null child pointers with `ld hl, 0` followed by the
   field assignment, rather than with `@someNode`. In `init_tree`, the
   right child of `left_node` is set to `@left_right_node`. What would the
   traversal do if that field were mistakenly left as zero?

5. `reg_pair.zax` reads `lo_byte` (offset 0) to get the low byte of
   `full_word`. How would you read the high byte — the byte at offset 1 —
   using only ZAX structured code? What raw Z80 register sequence would you
   use after loading `full_word` into HL?

---

[← Composition](07-composition.md) | [Part 2](README.md) | [Gaps and Futures →](09-gaps-and-futures.md)

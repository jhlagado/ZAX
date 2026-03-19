# Chapter 08 — Pointer Structures

The Chapter 08 examples work with data that is not laid out as a flat array. A
linked list is a chain of individually addressable nodes, each holding a value
and the address of the next node in the chain. A binary search tree is a
hierarchy of nodes where each node holds a value and the addresses of its left
and right children. Both structures share a common requirement: to move from one
node to the next, you must follow a stored address — a pointer — rather than
increment an index. That act of following a pointer is the defining operation
in this chapter.

The ZAX syntax for following a pointer to a named field is
`<Type>local.field`, where `local` holds an address and `Type` names the
record the compiler should interpret it as. You still load the address into HL
and work with raw Z80 registers, but the field access names the field rather
than hard-coding a byte offset. The next section shows the syntax directly.

---

## Typed Reinterpretation: `<Type>local.field`

The core idiom is `<Type>local.field`, where `local` holds an address and
`Type` is the record type you want to interpret it as. The compiler resolves
`field` against `Type`'s declaration and emits the appropriate IX-relative load
or constant-offset dereference.

Consider the `ListNode` record from `linked_list.zax`:

```zax
type ListNode
  value: byte
  next: addr
end
```

Each node has a one-byte value and a two-byte address pointing to the next node.
Given a local `current_ptr: addr` that holds the address of the current node in
the list, you read the value with:

```zax
a := <ListNode>current_ptr.value
```

And you advance to the next node with:

```zax
current_ptr := <ListNode>current_ptr.next
```

These two lines are the core of the traversal. Everything else — the null check,
the accumulation — is bookkeeping around them.

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

    a := <ListNode>current_ptr.value
    ld e, a
    ld d, 0
    hl := total_value
    add hl, de
    total_value := hl

    current_ptr := <ListNode>current_ptr.next

    ld a, 1
    or a
  end
```

(From `examples/course/unit8/linked_list.zax`, lines 42–66.)

The null check — `hl := current_ptr` / `ld a, h` / `or l` / `if Z` — loads the
current pointer into HL and tests whether both bytes are zero. Zero is the
null sentinel: a stored `addr` of zero means "no next node." The test uses the
`or l` trick seen throughout the course: `or` with L sets the Z flag if both H
and L are zero, without using a compare instruction. When the pointer is null,
the function returns `total_value` in HL.

When the pointer is non-null, the typed reinterpretation reads the `value` byte
into A. The byte is zero-extended into DE — `ld e, a` / `ld d, 0` — and added
to the running total in HL. Then `current_ptr` is updated from its own `next`
field, and the loop continues.

The null check at the top of the loop is the standard pattern for sentinel
termination in ZAX pointer code. The list may be empty (if `list_head` is
zero), and the same check covers that case without special handling before the
loop.

See `examples/course/unit8/linked_list.zax`.

---

## Binary Search Tree Traversal

### `bst.zax`

The binary search tree example builds a four-node tree and searches it for a
target value. The node record is:

```zax
type TreeNode
  value: byte
  left: addr
  right: addr
end
```

Each node has a value and two child addresses. The search function
`bst_contains` is recursive. It takes a node address and a target value, and
returns 1 in HL if the target is in the subtree rooted at that node, 0
otherwise.

The null check is the base case — if the address is zero, the target is not
present:

```zax
func bst_contains(node_ptr: addr, target_value: byte): HL
  hl := node_ptr
  ld a, h
  or l
  if Z
    ld hl, 0
    ret
  end
```

(From `examples/course/unit8/bst.zax`, lines 50–57.)

After the null check, the value at the current node is read and compared to
the target:

```zax
  a := <TreeNode>node_ptr.value
  b := target_value
  cp b
  if Z
    ld hl, 1
    ret
  end
  if C
    hl := <TreeNode>node_ptr.right
    bst_contains hl, target_value
    ret
  end

  hl := <TreeNode>node_ptr.left
  bst_contains hl, target_value
```

(From `examples/course/unit8/bst.zax`, lines 59–74.)

`cp b` subtracts B from A and sets flags without storing a result. `if Z` catches
the equal case. `if C` catches the case where A < B — that is, where the current
node's value is less than the target, meaning the target must be in the right
subtree. If neither condition holds (A > B), the search continues into the left
subtree.

The child address is retrieved with `<TreeNode>node_ptr.right` or `<TreeNode>
node_ptr.left`, loaded into HL, and then passed directly as the first argument
to the recursive call. Each recursive invocation handles its own null check, so
the pattern is uniform at every level of the tree.

Compare this with the linked list traversal: the list uses a `while` loop
because the structure is linear — there is always at most one next step. The
BST uses recursion because the structure is branching — at each node, the
algorithm commits to one of two subtrees, and the choice depends on a
comparison. Recursion maps onto that shape directly: the call stack mirrors the path from
root to target node.

See `examples/course/unit8/bst.zax`.

---

## Unions: Named Field Overlay

The `<Type>local.field` syntax reinterprets a stored address at the use site.
A union does something structurally different: it declares that the same fixed
storage can be read or written as any of several named fields, where every field
starts at offset 0. The overlay is in the type declaration, not at the use site.

The `RegPair` union from `reg_pair.zax` has two fields:

```zax
union RegPair
  full_word: word
  lo_byte: byte
end
```

`sizeof(RegPair)` is 2 — the size of the largest field. `full_word` and
`lo_byte` both start at byte offset 0. Writing through `full_word` stores two
bytes; reading through `lo_byte` reads the first of those two bytes.

This is useful when you need to access the low byte of a 16-bit value without
arithmetic. Z80 stores words little-endian: the low byte is at the lower
address, which is offset 0. Writing `$0134` through `full_word` puts `$34` at
offset 0 and `$01` at offset 1. Reading `lo_byte` reads offset 0 — `$34`:

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

(From `examples/course/unit8/reg_pair.zax`, lines 13–27.)

The union variable is declared without an initializer; it is zero-initialized by
default. `scratch.full_word := input_word` stores the two-byte argument at
`$8000`. `a := scratch.lo_byte` loads the single byte at `$8000` — the low
byte. The result is zero-extended into HL before returning.

Union declarations are module-scope. Every union field starts at offset 0;
there is no padding between fields, because they all overlap. Unions have no
tags and no runtime checks — the programmer chooses which field to use at each
access site. The compiler does not enforce that you read through the same field
you wrote.

See `examples/course/unit8/reg_pair.zax`.

---

## The Verbosity of Pointer Traversal

Both examples follow the same pattern at every pointer access site: load the
address into HL, apply the typed cast, name the field. For a structure with
several pointer hops, this becomes a repeating sequence:

```zax
current_ptr := <ListNode>current_ptr.next
```

Each step is one line. But if a data structure required following a chain of
fields — loading a node, reading one of its pointer fields, treating that as a
node, reading another field — each hop would need its own address-load and cast.
The current language has no way to express a pointer dereference path in a single
step. `ptr` fields carry no type information: `next: addr` says that `next`
holds an address, but not that it is the address of another `ListNode`. That
annotation must be written at the use site, every time, as `<ListNode>`.

This is a real ergonomic cost. You always know exactly what the machine is
doing — but for deeply linked structures, the repeated type annotation adds
noise that obscures the algorithm's shape. This is the pointer-typing
ergonomics gap grounded in the evidence from `linked_list.zax` and `bst.zax`,
and it is an open design issue. Chapter 09 records it alongside the other
open gaps from the course.

---

## What This Chapter Teaches

- `type RecordName` / `field: type` / `end` defines a record. Fields have
  explicit types; the compiler tracks offsets.
- `<Type>local.field` applies a type cast at the access site to read or write
  a field through a stored address. This is the ZAX expression for pointer
  dereference.
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

- `examples/course/unit8/linked_list.zax` — singly-linked list sum using
  pointer traversal and null-sentinel termination
- `examples/course/unit8/bst.zax` — binary search tree search using recursive
  typed-pointer traversal
- `examples/course/unit8/reg_pair.zax` — union overlay: write a 16-bit word,
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

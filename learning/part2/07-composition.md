[← Recursion](06-recursion.md) | [Part 2](README.md) | [Pointer Structures →](08-pointer-structures.md)

# Chapter 07 — Composition

The Chapter 07 example is an RPN calculator. It is the first program in this course
that is built from more than one source file. `rpn_calculator.zax` is the
lesson. `word_stack.zax` is a support module that the calculator imports — it
provides a push and a pop operation over a typed word array, and the calculator
uses these without caring about their implementation. This separation is small
but representative: it shows how ZAX `import` works, how a module-qualified
call is written, and how a well-chosen interface lets a higher-level algorithm
stay focused on what it is actually computing.

---

## The RPN Stack Machine

Reverse Polish notation evaluates an expression written as a sequence of tokens
where operators follow their operands. The expression `7 3 + 2 *` means "push 7,
push 3, add the top two values (giving 10), push 2, multiply the top two values
(giving 20)." There is no operator precedence to track, no parentheses, and no
ambiguity: the stack is the only state.

This makes RPN a natural fit for a software-stack implementation. The evaluator
scans tokens left to right, maintaining a stack of pending word values. Number
tokens push their value. Operator tokens pop two operands, apply the operation,
and push the result. When the token stream is exhausted, the stack holds exactly
one value: the answer.

`rpn_calculator.zax` implements this evaluation loop directly. The token stream
is two parallel arrays — `token_kinds` and `token_values` — both declared at
module scope. The software stack is a `word[8]` array named `value_stack`, also
at module scope, with a separate `stack_depth` byte tracking how many valid
elements it contains. This is a deliberate design: the stack storage is module
state, not function-local, because it needs to persist across the helper calls
that `push_word` and `pop_word` make. The calculator function manages the depth
counter itself; the helper functions read and write through it.

---

## The `import` Mechanism

The first line of `rpn_calculator.zax` is:

```zax
import "word_stack.zax"
```

This makes the exported functions from `word_stack.zax` available under the
module qualifier `word_stack`. A call to `push_word` from the calculator is
written as:

```zax
word_stack.push_word value_stack, stack_depth, hl
stack_depth := a
```

The qualifier makes the call site explicit about where the operation comes from.
`push_word` returns in A: it yields the new depth count. The `stack_depth := a`
that follows every stack operation captures that return value into the module
variable. No hidden state, no mutable counter inside the support module — just
two functions that accept the storage and the current depth as arguments and
return the updated depth.

---

## Token Kinds and Enums

The calculator recognises three token kinds: a number to push, an addition
operator, and a multiplication operator. In the source, these are declared as an
enum:

```zax
enum TokenKind Number, Add, Multiply
```

An enum assigns sequential integer values starting at zero. `TokenKind.Number`
is 0, `TokenKind.Add` is 1, `TokenKind.Multiply` is 2. Enum members must be
referenced with the qualified form `EnumType.Member` — bare `Number` or `Add`
is a compile error. The compiler resolves `TokenKind.Add` to the integer `1` at
compile time; there is no runtime enum object.

The token kind array uses these names directly in its initializer:

```zax
token_kinds: byte[5] = { TokenKind.Number, TokenKind.Number, TokenKind.Add, TokenKind.Number, TokenKind.Multiply }
```

This is the same initializer position as a literal integer — `TokenKind.Add`
and `1` are identical to the compiler, but `TokenKind.Add` tells the reader
what the value means. The same names appear in the `case` labels of the dispatch
below, so the connection between the stored kind and the dispatch arm is visible
without needing to count integer values.

---

## The Evaluation Loop and Operator Dispatch

The main evaluation function is `rpn_demo`. Its shape is a `while` loop over
`token_index`, advancing with `succ token_index` at the bottom of each
iteration. When `token_index` reaches `TokenCount`, the loop pops the final
result and returns it in HL.

Inside the loop, operator dispatch uses `select`:

```zax
    select A
      case TokenKind.Number
        l := token_index
        hl := token_values[L]
        word_stack.push_word value_stack, stack_depth, hl
        stack_depth := a
      case TokenKind.Add
        word_stack.pop_word value_stack, stack_depth
        stack_depth := a
        right_value := hl
        word_stack.pop_word value_stack, stack_depth
        stack_depth := a
        left_value := hl
        hl := left_value
        de := right_value
        add hl, de
        word_stack.push_word value_stack, stack_depth, hl
        stack_depth := a
      case TokenKind.Multiply
        ...
    end
```

(From `learning/part2/examples/unit7/rpn_calculator.zax`, lines 77–105.)

`select A` tests the value currently in A against each `case` constant. When
`current_kind` has been loaded into A at the top of the loop body, `select`
routes to the right arm directly. This is cleaner than a chain of `if`
comparisons for a dispatch-by-value pattern; the intent — "pick a case based on
the kind of this token" — reads directly in the code.

The operator arms follow the same structure: pop right operand, pop left operand
(order matters for non-commutative operations), apply, push result. Each pop/push
pair is bracketed by `stack_depth := a` to capture the updated depth. The typed
locals `right_value` and `left_value` hold the popped words across the two pop
calls, because HL is overwritten by the second pop before the operation can
proceed. Saving intermediate results into locals before the next call — the same
pattern seen in the recursion chapter — is the right approach here.

---

## A Note on `word_stack.zax`

`push_word` and `pop_word` are short. Here is the push:

```zax
export func push_word(stack_slots: word[], depth_count: byte, value_word: word): AF
  a := depth_count
  ld l, a
  de := value_word
  stack_slots[L] := de
  a := depth_count
  inc a
end
```

(From `learning/part2/examples/unit7/word_stack.zax`, lines 6–14.)

`word_stack.zax` loads the depth count into L with `ld l, a` — L is the index token for the `arr[L]` path expression — while DE carries the word value via `de := value_word`. `stack_slots[L] := de` then stores it cleanly. The pattern — index in L, value in DE — is how ZAX does word-array access with an 8-bit index.

The full source of `word_stack.zax` is short enough to read in one sitting — see `learning/part2/examples/unit7/word_stack.zax`.

---

## Typed Paths Through the Evaluation Loop

The evaluation loop in `rpn_demo` is built on typed locals: `token_index`,
`current_kind`, `right_value`, `left_value`. These names carry the
algorithm's intent across what would otherwise be a tangle of register
assignments. Without them, the code would require careful tracking of which
register holds which intermediate value at each point in the dispatch arms — the
same bookkeeping that raw assembly requires and that ZAX structured storage
eliminates.

The typed paths do not hide anything. `right_value := hl` emits a frame store;
`de := right_value` emits a frame load. The compiler handles the IX-relative
mechanics. What you read is the algorithm: the right operand is saved, the left
operand is popped, the operation is applied.

---

## Summary

- `import "module.zax"` makes exported functions available under the module
  name. Calls are qualified: `word_stack.push_word`.
- `enum TypeName Member, Member, ...` assigns sequential integers starting at 0.
  Members must be referenced as `TypeName.Member`; bare member names are compile
  errors. Enum members are compile-time immediates — the same as `const` values,
  but grouped under a type name that makes their relationship explicit.
- `select A` / `case TokenKind.Member` dispatches on the value in A. It is the
  natural form for token-kind dispatch, replacing a chain of `if` comparisons
  where the distinguishing value is already in a register.
- A software stack over a typed word array requires explicit depth management.
  Every push and pop returns a new depth in A, and the caller must store it.
- DE-as-value, L-as-index is the right register choice for word-array push/pop
  when HL is needed for the store address. This is visible in `word_stack.zax`
  and worth understanding.
- Store intermediate results into typed locals before the next call overwrites
  HL. This is the same pattern as the recursion chapter, applied here to a
  software-stack evaluator.

---

## Examples in This Chapter

- `learning/part2/examples/unit7/rpn_calculator.zax` — the lesson: RPN evaluation loop
  with operator dispatch and software-stack management
- `learning/part2/examples/unit7/word_stack.zax` — support module: `push_word` and
  `pop_word` over a caller-managed word array

---

## What Comes Next

Chapter 08 works with pointer fields and typed reinterpretation. The linked
list and binary search tree examples require following stored addresses rather
than advancing an index — a structurally different traversal from the software
stack here, but using the same typed-path and null-sentinel approach.

---

## Exercises

1. The `TokenKind.Multiply` case calls the helper `mul_u16`. `mul_u16` uses a
   `while` loop with a `pred` on the repeat count. What is the time complexity
   of this multiplication, and what would happen for large operands? How would
   you extend `rpn_calculator.zax` to add a `TokenKind.Subtract` case?

2. `stack_depth` is a module-level variable, not a local. What would happen if
   two calls to `rpn_demo` ran in sequence? Is the initial `ld a, 0` /
   `stack_depth := a` at the top of `rpn_demo` necessary for correct behaviour
   on the first call? On subsequent calls?

3. The `select` dispatch is on `current_kind`, loaded into A before the
   `select A`. What would happen if a token kind not covered by any `case`
   appeared in the stream? What defensive measure would you add?

4. `pop_word` returns its result in HL and the new depth in A simultaneously
   (`HL, AF` return declaration). After each pop in the calculator, `stack_depth
:= a` captures the new depth. What would happen if this assignment were
   omitted for the second of the two pops in the `TokenKind.Add` arm?

---

[← Recursion](06-recursion.md) | [Part 2](README.md) | [Pointer Structures →](08-pointer-structures.md)

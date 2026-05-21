---
layout: default
title: "Chapter 4 — A Running Example"
parent: "Part I — Orientation"
grand_parent: "Understanding the ZAX Compiler"
nav_order: 4
---
[← The Compilation Pipeline](03-the-compilation-pipeline.md) | [Part I](index.md) | [Entry Points →](../part2/05-entry-points.md)

# Chapter 4 — A Running Example

To make the tour concrete, we will follow this small ZAX program through the compiler. It defines a helper function and an exported `main`:

```zax
; File: example.zax

func inc_one(input_word: word): HL
  var
    temp_word: word = $22
  end

  de := input_word
  inc de
  temp_word := de
  de := temp_word
  ex de, hl
end

export func main()
  var
    result_word: word = $11
  end

  inc_one $44
  result_word := hl
end
```

By the end of the tour you will be able to trace exactly what every line of this source does to every data structure in the compiler.

---

Throughout the remaining chapters this program is used as the concrete thread. When a chapter describes a data structure or transformation, refer back here to see which part of this source triggers it.

---

[← The Compilation Pipeline](03-the-compilation-pipeline.md) | [Part I](index.md) | [Entry Points →](../part2/05-entry-points.md)

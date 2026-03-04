# v0.5 Migration Cheatsheet

## Legacy to v0.5 Mapping

### 1) `globals ... end` -> named `data` section

Old:

```zax
globals
  count: byte
  table: byte[3]
```

New:

```zax
section data state at $8000
  count: byte
  table: byte[3]
end
```

### 2) top-level legacy `data ... end` -> named `data` section

Old:

```zax
data
  msg: byte[5] = "HELLO"
```

New:

```zax
section data assets at $8100
  msg: byte[5] = "HELLO"
end
```

### 3) active-counter `section code/data at ...` -> named sections

Old:

```zax
section code at $0100
func main()
  ret
end
```

New:

```zax
section code app at $0100
  func main()
    ret
  end
end
```

### 4) `section var ...` -> removed

Use named `data` sections for storage.

### 5) explicit zero boilerplate -> omitted initializer

Old habit:

```zax
x: byte[3] = {0,0,0}
```

Preferred v0.5:

```zax
x: byte[3]
```

## Current Data Rules

- Variables belong in `section data <name> ... end`.
- Variable declarations in `code` sections are compile errors.
- `name: Type` is valid and means zero-initialized storage.
- `name: Type = init` is valid and means explicit initialization.
- Missing anchor for a contributed section key is an error.
- Duplicate anchor for a section key is an error.

## Team Migration Workflow

1. Stop writing legacy forms immediately:
   - no `globals`
   - no top-level legacy `data`
   - no active-counter `section code/data/var ...`

2. Use named section blocks everywhere:
   - `section code <name> ... end`
   - `section data <name> ... end`

3. Root program owns placement:
   - define anchors (`at ...`) in root for every contributed key

4. Prefer omitted initializers for zero storage:
   - use `x: T` unless a non-zero initial value is required

5. Keep section names stable across modules:
   - use canonical names (`app`, `state`, `assets`, etc.)

6. Update tests/examples in the same PR when syntax changes.

7. Do not merge if migration leaves shared suites red.

## PR Review Checklist

- File uses named sections only
- Data declarations appear only in `data` sections
- Every contributed section key has exactly one root anchor
- Uninitialized declarations are not padded with redundant explicit zero initializers unless needed for clarity

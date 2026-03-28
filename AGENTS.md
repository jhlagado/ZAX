# AGENTS.md

## Cursor Cloud specific instructions

ZAX is a standalone TypeScript CLI compiler for Z80 assembly. It has zero runtime dependencies — all packages in `package.json` are devDependencies.

### Key commands

See `package.json` `"scripts"` for the full list. The most common ones:

| Task | Command |
|---|---|
| Install deps | `npm install` |
| Build (TypeScript → `dist/`) | `npm run build` |
| Type-check only | `npm run typecheck` |
| Lint (ESLint) | `npm run lint` |
| Tests (Vitest) | `npm test` |
| Compile a `.zax` file | `npm run zax -- <file.zax>` (builds first) or `node dist/src/cli.js <file.zax>` (after build) |

### Non-obvious notes

- **No external services required.** No databases, Docker, or network dependencies. Everything runs locally with Node.js.
- **`npm run zax`** rebuilds TypeScript before running the compiler. For repeated runs after an initial build, use `node dist/src/cli.js <file.zax>` directly for faster iteration.
- **`examples/hello.zax`** has a known compile error (`ZAX300: Unresolved symbol`). Use files from `test/language-tour/` or `test/fixtures/` for reliable end-to-end compiler testing.
- **Prettier `format:check`** reports pre-existing style drift in ~274 files. This is baseline state; do not attempt to fix unless in a dedicated formatting PR.
- **CI test split:** Core tests run with parallelism; CLI tests (`test/cli_*.test.ts`, `test/cli/**`) run single-threaded with extended timeouts via `npm run test:ci:slow-reliability`.
- **Node.js 20+** is required (see `engines` in `package.json`).

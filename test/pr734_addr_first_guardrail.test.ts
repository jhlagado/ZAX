import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const addrFirstSources = [
  join(__dirname, '..', 'examples', 'language-tour', '00_call_with_arg_and_local_baseline.zax'),
  join(__dirname, '..', 'examples', 'language-tour', '01_args_locals_basics.zax'),
  join(__dirname, '..', 'examples', 'language-tour', '02_fibonacci_args_locals.zax'),
  join(__dirname, '..', 'examples', 'language-tour', '14_ops_and_calls.zax'),
  join(__dirname, '..', 'examples', 'language-tour', '32_scalar_word_glob.zax'),
  join(__dirname, '..', 'examples', 'language-tour', '60_word_glob_const.zax'),
  join(__dirname, '..', 'examples', 'language-tour', '61_word_glob_reg8.zax'),
  join(__dirname, '..', 'examples', 'language-tour', '63_word_fvar_const.zax'),
  join(__dirname, '..', 'examples', 'language-tour', '66_word_glob_fvar.zax'),
  join(__dirname, '..', 'examples', 'language-tour', '68_word_fvar_glob.zax'),
  join(__dirname, '..', 'examples', 'language-tour', '69_word_glob_glob.zax'),
  join(__dirname, '..', 'examples', 'codegen-corpus', '32_scalar_word_glob.zax'),
  join(__dirname, '..', 'examples', 'codegen-corpus', 'advanced_typed_calls.zax'),
  join(__dirname, '..', 'examples', 'codegen-corpus', 'pr276_typed_call_preservation_matrix.zax'),
  join(__dirname, 'fixtures', 'pr256_value_semantics_scalar_ld.zax'),
  join(__dirname, 'fixtures', 'pr276_typed_call_preservation_matrix.zax'),
  join(__dirname, 'fixtures', 'pr278_nested_runtime_store_matrix.zax'),
  join(__dirname, 'fixtures', 'pr364_call_with_arg_and_local.zax'),
  join(__dirname, 'fixtures', 'pr365_args_locals_basics.zax'),
] as const;

const unsupportedTypedEaStoreFromHl = /^\s*ld\s+(?!\()(?!bc\b)(?!de\b)(?!sp\b)([^,]+),\s*hl\b/im;

describe('PR734: addr-first source guardrail', () => {
  it('keeps unsupported transitional `ld ea, hl` out of positive examples and fixtures', async () => {
    for (const path of addrFirstSources) {
      const text = await readFile(path, 'utf8');
      expect(text, path).not.toMatch(unsupportedTypedEaStoreFromHl);
    }
  });
});

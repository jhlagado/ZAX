import type { FormatWriters } from './types.js';
import { writeBin } from './writeBin.js';
import { writeD8m } from './writeD8m.js';
import { writeHex } from './writeHex.js';

export const defaultFormatWriters: FormatWriters = {
  writeHex,
  writeBin,
  writeD8m,
};

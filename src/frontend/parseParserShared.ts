const RESERVED_TOP_LEVEL_KEYWORDS = new Set([
  'func',
  'const',
  'enum',
  'data',
  'import',
  'type',
  'union',
  'globals',
  'var',
  'extern',
  'bin',
  'hex',
  'op',
  'section',
  'align',
]);

export function isReservedTopLevelDeclName(name: string): boolean {
  return RESERVED_TOP_LEVEL_KEYWORDS.has(name.toLowerCase());
}

export function stripLineComment(line: string): string {
  const semi = line.indexOf(';');
  return semi >= 0 ? line.slice(0, semi) : line;
}

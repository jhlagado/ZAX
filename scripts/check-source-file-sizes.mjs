#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = new URL('../src/', import.meta.url);
const SOFT_LIMIT = 750;
const HARD_LIMIT = 1000;

async function collectTsFiles(dirUrl) {
  const entries = await readdir(dirUrl, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const childUrl = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, dirUrl);
    if (entry.isDirectory()) {
      files.push(...(await collectTsFiles(childUrl)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(childUrl);
    }
  }

  return files;
}

async function countLines(fileUrl) {
  const text = await readFile(fileUrl, 'utf8');
  if (text.length === 0) return 0;
  return text.split('\n').length;
}

function toWorkspaceRelative(fileUrl) {
  const fsPath = fileUrl.pathname;
  const cwd = process.cwd();
  const rel = path.relative(cwd, fsPath);
  return rel || path.basename(fsPath);
}

async function main() {
  const enforceHardCap = process.argv.includes('--enforce-hard-cap');
  const files = await collectTsFiles(ROOT);
  const rows = [];

  for (const fileUrl of files) {
    rows.push({
      path: toWorkspaceRelative(fileUrl),
      lines: await countLines(fileUrl),
    });
  }

  rows.sort((a, b) => b.lines - a.lines || a.path.localeCompare(b.path));

  const hardBreaches = rows.filter((row) => row.lines > HARD_LIMIT);
  const softBreaches = rows.filter((row) => row.lines > SOFT_LIMIT && row.lines <= HARD_LIMIT);

  if (hardBreaches.length === 0 && softBreaches.length === 0) {
    console.log(`source-file-size-guard: ok (soft ${SOFT_LIMIT}, hard ${HARD_LIMIT})`);
    process.exit(0);
  }

  console.log(`source-file-size-guard: soft>${SOFT_LIMIT}, hard>${HARD_LIMIT}`);

  if (hardBreaches.length > 0) {
    console.log('hard-cap breaches:');
    for (const row of hardBreaches) {
      console.log(`- ${row.path}: ${row.lines}`);
    }
  }

  if (softBreaches.length > 0) {
    console.log('soft-limit warnings:');
    for (const row of softBreaches) {
      console.log(`- ${row.path}: ${row.lines}`);
    }
  }

  process.exit(enforceHardCap && hardBreaches.length > 0 ? 1 : 0);
}

await main();

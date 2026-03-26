import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..', '..');
const cliPath = resolve(repoRoot, 'dist', 'src', 'cli.js');
const buildTmpDir = resolve(repoRoot, '.tmp');
const buildLockPath = resolve(buildTmpDir, 'cli-build.lock');
const buildStampPath = resolve(buildTmpDir, 'cli-build.stamp');
const lockWaitSliceMs = 250;
const lockWaitMaxMs = 90_000;
const lockStaleMs = 5 * 60_000;
const lockAcquireTimeoutMs = 10 * 60_000;

let buildPromise: Promise<void> | undefined;
let buildPromiseKey: string | undefined;

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

type LockMeta = { pid?: number; createdAt?: number };

function parsePid(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
    return undefined;
  }
  return value > 0 ? value : undefined;
}

function parseCreatedAt(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
    return undefined;
  }
  return value >= 0 ? value : undefined;
}

function parseLockMeta(raw: string): LockMeta | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  try {
    const parsedUnknown = JSON.parse(trimmed) as unknown;
    const parsedNumber = parseCreatedAt(parsedUnknown);
    if (parsedNumber !== undefined) {
      return { createdAt: parsedNumber };
    }
    if (parsedUnknown === null || typeof parsedUnknown !== 'object') {
      return undefined;
    }
    const parsed = parsedUnknown as { pid?: unknown; createdAt?: unknown };
    const pid = parsePid(parsed.pid);
    const createdAt = parseCreatedAt(parsed.createdAt);
    if (pid === undefined && createdAt === undefined) return undefined;
    const lockMeta: LockMeta = {};
    if (pid !== undefined) lockMeta.pid = pid;
    if (createdAt !== undefined) lockMeta.createdAt = createdAt;
    return lockMeta;
  } catch {
    const numeric = parseCreatedAt(Number(trimmed));
    return numeric === undefined ? undefined : { createdAt: numeric };
  }
}

function isProcessAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  if (pid === process.pid) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    return e.code === 'EPERM';
  }
}

function computeWaitDeadline(
  nowMs: number,
  acquireDeadlineMs: number,
  waitWindowMs: number,
): number {
  return Math.min(nowMs + waitWindowMs, acquireDeadlineMs);
}

function hasLockAcquireTimedOut(nowMs: number, acquireDeadlineMs: number): boolean {
  return nowMs >= acquireDeadlineMs;
}

function shouldEvictLock(
  lockMeta: LockMeta | undefined,
  options: { nowMs: number; staleMs: number; isOwnerAlive: (pid: number) => boolean },
): boolean {
  if (lockMeta === undefined) return false;

  const ownerAlive = lockMeta.pid !== undefined ? options.isOwnerAlive(lockMeta.pid) : undefined;
  if (ownerAlive === false) return true;

  if (lockMeta.createdAt === undefined) return false;
  if (options.nowMs - lockMeta.createdAt < options.staleMs) return false;
  if (ownerAlive === true) return false;

  return true;
}

async function clearStaleLockIfNeeded(): Promise<void> {
  const lockText = await readFile(buildLockPath, 'utf8').catch(() => '');
  const lockMeta = parseLockMeta(lockText);
  const evict = shouldEvictLock(lockMeta, {
    nowMs: Date.now(),
    staleMs: lockStaleMs,
    isOwnerAlive: isProcessAlive,
  });
  if (!evict) return;

  await rm(buildLockPath, { force: true });
}

async function listBuildInputFiles(rootPath: string): Promise<string[]> {
  const info = await stat(rootPath);
  if (!info.isDirectory()) return [rootPath];

  const entries = await readdir(rootPath, { withFileTypes: true });
  const paths = await Promise.all(
    entries
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(async (entry) => {
        const entryPath = resolve(rootPath, entry.name);
        if (entry.isDirectory()) return listBuildInputFiles(entryPath);
        return [entryPath];
      }),
  );
  return paths.flat();
}

async function computeCliBuildKey(): Promise<string> {
  const hash = createHash('sha1');
  const roots = [
    resolve(repoRoot, 'package.json'),
    resolve(repoRoot, 'package-lock.json'),
    resolve(repoRoot, 'tsconfig.json'),
    resolve(repoRoot, 'src'),
  ];
  for (const root of roots) {
    for (const file of await listBuildInputFiles(root)) {
      const fileInfo = await stat(file);
      hash.update(file);
      hash.update(':');
      hash.update(String(fileInfo.size));
      hash.update(':');
      hash.update(String(fileInfo.mtimeMs));
      hash.update('\n');
    }
  }
  return hash.digest('hex');
}

async function isCliBuildFresh(buildKey: string): Promise<boolean> {
  if (!(await pathExists(cliPath))) return false;
  const stamp = await readFile(buildStampPath, 'utf8').catch(() => '');
  return stamp.trim() === buildKey;
}

async function buildCliWithLock(buildKey: string): Promise<void> {
  if (await isCliBuildFresh(buildKey)) return;
  await mkdir(buildTmpDir, { recursive: true });
  const acquireDeadlineMs = Date.now() + lockAcquireTimeoutMs;

  const timeoutError = (): Error =>
    new Error(
      `Timed out waiting ${Math.floor(lockAcquireTimeoutMs / 1000)}s for CLI build lock at ${buildLockPath}`,
    );

  while (true) {
    if (hasLockAcquireTimedOut(Date.now(), acquireDeadlineMs)) {
      throw timeoutError();
    }

    try {
      await writeFile(buildLockPath, JSON.stringify({ pid: process.pid, createdAt: Date.now() }), {
        flag: 'wx',
      });
      try {
        if (await isCliBuildFresh(buildKey)) return;
        await execFileAsync('npm', ['run', 'build'], {
          encoding: 'utf8',
          shell: process.platform === 'win32',
        });
        await writeFile(buildStampPath, `${buildKey}\n`, 'utf8');
      } finally {
        await rm(buildLockPath, { force: true });
      }
      return;
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code && e.code !== 'EEXIST') throw err;
      if (hasLockAcquireTimedOut(Date.now(), acquireDeadlineMs)) {
        throw timeoutError();
      }
      const waitDeadlineMs = computeWaitDeadline(Date.now(), acquireDeadlineMs, lockWaitMaxMs);
      while (Date.now() < waitDeadlineMs) {
        if (!(await pathExists(buildLockPath))) break;
        await clearStaleLockIfNeeded();
        if (!(await pathExists(buildLockPath))) break;
        await sleep(lockWaitSliceMs);
      }
      await clearStaleLockIfNeeded();
    }
  }
}

export async function ensureCliBuilt(): Promise<void> {
  const buildKey = await computeCliBuildKey();
  if (await isCliBuildFresh(buildKey)) return;

  if (!buildPromise || buildPromiseKey !== buildKey) {
    buildPromiseKey = buildKey;
    buildPromise = buildCliWithLock(buildKey).catch((err) => {
      buildPromise = undefined;
      buildPromiseKey = undefined;
      throw err;
    });
  }
  return buildPromise;
}

export async function runCli(
  args: string[],
  cwd?: string,
): Promise<{ code: number; stdout: string; stderr: string }> {
  const node = process.execPath;
  try {
    const { stdout, stderr } = await execFileAsync(node, [cliPath, ...args], {
      encoding: 'utf8',
      cwd,
    });
    return { code: 0, stdout, stderr };
  } catch (err) {
    const e = err as { code?: number; stdout?: string; stderr?: string };
    return { code: e.code ?? 1, stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
  }
}

export async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function readArtifactSet(base: string): Promise<{
  bin: string;
  hex: string;
  d8m: string;
  lst: string;
}> {
  const bin = await readFile(`${base}.bin`);
  const hex = await readFile(`${base}.hex`, 'utf8');
  const d8m = await readFile(`${base}.d8dbg.json`, 'utf8');
  const lst = await readFile(`${base}.lst`, 'utf8');
  return {
    bin: bin.toString('hex'),
    hex,
    d8m,
    lst,
  };
}

function stripExtendedWindowsPrefix(path: string): string {
  if (path.startsWith('\\\\?\\UNC\\')) return `\\\\${path.slice(8)}`;
  if (path.startsWith('\\\\?\\')) return path.slice(4);
  return path;
}

export function normalizePathForCompare(path: string): string {
  const stripped = stripExtendedWindowsPrefix(path);
  const normalized = stripped.replace(/\\/g, '/');
  const normalizedDarwin =
    process.platform === 'darwin' ? normalized.replace(/^\/private\//, '/') : normalized;
  return process.platform === 'win32' ? normalizedDarwin.toLowerCase() : normalizedDarwin;
}

export const __cliBuildLockInternals = {
  computeCliBuildKey,
  computeWaitDeadline,
  hasLockAcquireTimedOut,
  isCliBuildFresh,
  parseLockMeta,
  shouldEvictLock,
};

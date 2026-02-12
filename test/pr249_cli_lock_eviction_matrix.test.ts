import { describe, expect, it } from 'vitest';

import { __cliBuildLockInternals } from './helpers/cli.js';

describe('PR249 CLI build-lock eviction matrix', () => {
  const { parseLockMeta, shouldEvictLock } = __cliBuildLockInternals;
  const nowMs = 1_000_000;
  const staleMs = 300_000;

  it('parses lock metadata from json and legacy numeric formats', () => {
    expect(parseLockMeta('')).toBeUndefined();
    expect(parseLockMeta('not-json')).toBeUndefined();
    expect(parseLockMeta('{}')).toBeUndefined();
    expect(parseLockMeta('{"pid": 1234}')).toEqual({ pid: 1234 });
    expect(parseLockMeta('{"createdAt": 42}')).toEqual({ createdAt: 42 });
    expect(parseLockMeta('{"pid": 1234, "createdAt": 42}')).toEqual({
      pid: 1234,
      createdAt: 42,
    });
    expect(parseLockMeta('123')).toEqual({ createdAt: 123 });
  });

  it('never evicts unknown or malformed lock metadata', () => {
    const isOwnerAlive = () => true;
    expect(
      shouldEvictLock(undefined, {
        nowMs,
        staleMs,
        isOwnerAlive,
      }),
    ).toBe(false);
    expect(
      shouldEvictLock(parseLockMeta(''), {
        nowMs,
        staleMs,
        isOwnerAlive,
      }),
    ).toBe(false);
    expect(
      shouldEvictLock(parseLockMeta('not-json'), {
        nowMs,
        staleMs,
        isOwnerAlive,
      }),
    ).toBe(false);
  });

  it('evicts dead owners immediately, even without createdAt', () => {
    const meta = { pid: 99999 };
    expect(
      shouldEvictLock(meta, {
        nowMs,
        staleMs,
        isOwnerAlive: () => false,
      }),
    ).toBe(true);
  });

  it('keeps live owners even when lock age is stale', () => {
    const meta = { pid: 1234, createdAt: nowMs - staleMs - 1 };
    expect(
      shouldEvictLock(meta, {
        nowMs,
        staleMs,
        isOwnerAlive: () => true,
      }),
    ).toBe(false);
  });

  it('evicts stale lock with no pid owner signal', () => {
    const meta = { createdAt: nowMs - staleMs - 1 };
    expect(
      shouldEvictLock(meta, {
        nowMs,
        staleMs,
        isOwnerAlive: () => true,
      }),
    ).toBe(true);
  });

  it('keeps fresh lock with no pid owner signal', () => {
    const meta = { createdAt: nowMs - staleMs + 1 };
    expect(
      shouldEvictLock(meta, {
        nowMs,
        staleMs,
        isOwnerAlive: () => true,
      }),
    ).toBe(false);
  });
});

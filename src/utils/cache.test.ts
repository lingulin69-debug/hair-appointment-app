import { beforeEach, describe, expect, it } from 'vitest';
import {
  loadCachedValue,
  saveCachedValue,
  removeCachedValue,
} from './cache';

describe('cache utilities', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('stores and restores versioned payloads', () => {
    saveCachedValue('store-items', [{ id: '1', name: 'Cut' }], 2);

    expect(loadCachedValue<{ id: string; name: string }[]>('store-items', 2)).toEqual([
      { id: '1', name: 'Cut' },
    ]);
  });

  it('returns null when the version does not match', () => {
    saveCachedValue('appointments:2026-03', [{ id: 'a' }], 1);

    expect(loadCachedValue<{ id: string }[]>('appointments:2026-03', 2)).toBeNull();
  });

  it('removes cached values cleanly', () => {
    saveCachedValue('store-items', [{ id: '1' }], 1);
    removeCachedValue('store-items');

    expect(loadCachedValue('store-items', 1)).toBeNull();
  });
});

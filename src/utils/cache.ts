type CacheEnvelope<T> = {
  version: number;
  savedAt: string;
  data: T;
};

const CACHE_PREFIX = 'hair-salon:';

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function buildKey(key: string): string {
  return `${CACHE_PREFIX}${key}`;
}

export function loadCachedValue<T>(key: string, version: number): T | null {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  try {
    const rawValue = storage.getItem(buildKey(key));
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as CacheEnvelope<T>;
    if (!parsed || parsed.version !== version) {
      return null;
    }

    return parsed.data ?? null;
  } catch {
    return null;
  }
}

export function saveCachedValue<T>(key: string, data: T, version: number): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    const payload: CacheEnvelope<T> = {
      version,
      savedAt: new Date().toISOString(),
      data,
    };

    storage.setItem(buildKey(key), JSON.stringify(payload));
  } catch {
    // Ignore storage failures.
  }
}

export function removeCachedValue(key: string): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(buildKey(key));
  } catch {
    // Ignore storage failures.
  }
}

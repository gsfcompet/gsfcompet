type CacheEntry<T> = {
  value: T;
  expires: number;
};

const memoryCache = new Map<string, CacheEntry<any>>();

function lsGet(key: string) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() > parsed.expires) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
}

function lsSet(key: string, value: any, ttlMs: number) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        value,
        expires: Date.now() + ttlMs,
      })
    );
  } catch {}
}

export function cacheGet<T>(key: string): T | null {
  const mem = memoryCache.get(key);
  if (mem && Date.now() < mem.expires) return mem.value;

  const ls = lsGet(key);
  if (ls) {
    memoryCache.set(key, { value: ls, expires: Date.now() + 5000 });
    return ls;
  }

  return null;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number) {
  memoryCache.set(key, { value, expires: Date.now() + ttlMs });
  lsSet(key, value, ttlMs);
}

export function cacheInvalidate(prefix: string) {
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) memoryCache.delete(key);
  }
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith(prefix)) localStorage.removeItem(key);
  });
}

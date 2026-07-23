/**
 * Shared browser cache for Assets → Karten / Sealed so navigating
 * between pages (and Dashboard/Portfolio) reuses fresh data.
 */

export type CollectionCachePayload = {
  items: unknown[];
  metrics: unknown | null;
};

export type SealedCachePayload = {
  items: unknown[];
  metrics?: unknown | null;
};

const TTL_MS = 45_000;

type Entry<T> = { at: number; data: T };

let collectionEntry: Entry<CollectionCachePayload> | null = null;
let sealedEntry: Entry<SealedCachePayload> | null = null;
let collectionInflight: Promise<CollectionCachePayload | null> | null = null;
let sealedInflight: Promise<SealedCachePayload | null> | null = null;

function fresh<T>(entry: Entry<T> | null): entry is Entry<T> {
  return Boolean(entry && Date.now() - entry.at < TTL_MS);
}

export function peekCollectionCache(): CollectionCachePayload | null {
  return fresh(collectionEntry) ? collectionEntry.data : null;
}

export function peekSealedCache(): SealedCachePayload | null {
  return fresh(sealedEntry) ? sealedEntry.data : null;
}

export function setCollectionCache(data: CollectionCachePayload): void {
  collectionEntry = { at: Date.now(), data };
}

/** Patch one item in the cached collection list (keeps TTL fresh). */
export function patchCollectionCacheItem(
  id: string,
  item: unknown,
  metrics?: unknown | null,
): void {
  const base = collectionEntry?.data;
  if (!base || !Array.isArray(base.items)) {
    setCollectionCache({
      items: [item],
      metrics: metrics ?? null,
    });
    return;
  }
  const items = base.items.map((row) =>
    row && typeof row === "object" && (row as { id?: string }).id === id
      ? item
      : row,
  );
  // If id not found, append
  const has = items.some(
    (row) =>
      row && typeof row === "object" && (row as { id?: string }).id === id,
  );
  setCollectionCache({
    items: has ? items : [...items, item],
    metrics: metrics !== undefined ? metrics : base.metrics,
  });
}

export function setSealedCache(data: SealedCachePayload): void {
  sealedEntry = { at: Date.now(), data };
}

export function invalidateCollectionCache(): void {
  collectionEntry = null;
  collectionInflight = null;
}

export function invalidateSealedCache(): void {
  sealedEntry = null;
  sealedInflight = null;
}

export function invalidateAllAssetsCache(): void {
  invalidateCollectionCache();
  invalidateSealedCache();
}

/** Fetch collection with dedupe + memory cache. */
export async function fetchCollectionCached(
  force = false,
): Promise<CollectionCachePayload | null> {
  if (!force && fresh(collectionEntry)) return collectionEntry.data;
  if (!force && collectionInflight) return collectionInflight;

  const run = (async () => {
    try {
      const res = await fetch("/api/collection");
      if (!res.ok) return null;
      const data = await res.json();
      const payload: CollectionCachePayload = {
        items: data.items ?? [],
        metrics: data.metrics ?? null,
      };
      setCollectionCache(payload);
      return payload;
    } catch {
      return null;
    } finally {
      collectionInflight = null;
    }
  })();

  collectionInflight = run;
  return run;
}

/** Fetch sealed with dedupe + memory cache. */
export async function fetchSealedCached(
  force = false,
): Promise<SealedCachePayload | null> {
  if (!force && fresh(sealedEntry)) return sealedEntry.data;
  if (!force && sealedInflight) return sealedInflight;

  const run = (async () => {
    try {
      const res = await fetch("/api/sealed");
      if (!res.ok) return null;
      const data = await res.json();
      const payload: SealedCachePayload = {
        items: data.items ?? [],
        metrics: data.metrics ?? null,
      };
      setSealedCache(payload);
      return payload;
    } catch {
      return null;
    } finally {
      sealedInflight = null;
    }
  })();

  sealedInflight = run;
  return run;
}

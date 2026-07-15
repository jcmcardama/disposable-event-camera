// Caches one object URL per photo, keyed by localId (stable for a
// photo's whole lifetime) rather than by Blob reference (which changes
// on every IndexedDB read, even when the image bytes haven't). This is
// what actually fixes the "broken image on status change" bug: a
// photo's URL is now created exactly once and reused, instead of being
// revoked and recreated every time an unrelated field (like status)
// changes and triggers a fresh read.
const cache = new Map<string, string>();

export function getOrCreateObjectUrl(localId: string, blob: Blob): string {
  const existing = cache.get(localId);
  if (existing) return existing;

  const url = URL.createObjectURL(blob);
  cache.set(localId, url);
  return url;
}

// Called only when a photo is genuinely gone (deleted), never on a
// routine status update - that's the whole point of this cache.
export function revokeObjectUrl(localId: string) {
  const url = cache.get(localId);
  if (url) {
    URL.revokeObjectURL(url);
    cache.delete(localId);
  }
}
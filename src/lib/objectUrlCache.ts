// Caches one object URL per photo, keyed by localId. Safe now that
// photoStore.ts guarantees a photo's Blob reference is set exactly
// once, at capture, and never replaced by an unrelated status update -
// so a URL created here stays valid for the photo's entire session and
// only ever needs revoking when the photo is actually deleted.
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

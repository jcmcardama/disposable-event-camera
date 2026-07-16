// Converts a Blob to a base64 data URL, cached by localId. We moved
// away from blob: URLs entirely after repeated flakiness specifically
// on iOS Safari - a known category of WebKit bug where Blobs read back
// out of IndexedDB can intermittently fail to resolve as object URLs.
// A data URL is a self-contained string once created: no separate
// revoke lifecycle, no browser-managed resource, no dependency on
// Safari's IndexedDB Blob handling at display time.

const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function getPhotoDataUrl(localId: string, blob: Blob): Promise<string> {
  const existing = cache.get(localId);
  if (existing) return existing;

  const inFlight = pending.get(localId);
  if (inFlight) return inFlight;

  const promise = blobToDataUrl(blob).then((dataUrl) => {
    cache.set(localId, dataUrl);
    pending.delete(localId);
    return dataUrl;
  });
  pending.set(localId, promise);
  return promise;
}

export function getCachedPhotoDataUrl(localId: string): string | null {
  return cache.get(localId) ?? null;
}

export function forgetPhotoDataUrl(localId: string) {
  cache.delete(localId);
  pending.delete(localId);
}
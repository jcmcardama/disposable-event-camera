'use client';

import { getOrCreateObjectUrl } from './objectUrlCache';

// A pure cached lookup - no useState/useEffect needed, since the cache
// itself already guarantees the same localId always returns the same
// URL without recreating it.
export function getPhotoUrl(localId: string, blob: Blob): string {
  return getOrCreateObjectUrl(localId, blob);
}
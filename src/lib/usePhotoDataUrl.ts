'use client';

import { useEffect, useState } from 'react';
import { getPhotoDataUrl, getCachedPhotoDataUrl } from './dataUrlCache';

export function usePhotoDataUrl(localId: string | null, blob: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(() =>
    localId ? getCachedPhotoDataUrl(localId) : null
  );

  useEffect(() => {
    if (!localId || !blob) {
      // clearing the URL is a genuine reaction to the input becoming unavailable
      // (e.g. no photos yet), not a value derivable at render time.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUrl(null);
      return;
    }

    let cancelled = false;
    getPhotoDataUrl(localId, blob).then((dataUrl) => {
      if (!cancelled) setUrl(dataUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [localId, blob]);

  return url;
}
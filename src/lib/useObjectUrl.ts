// Creates an object URL for a Blob, and properly revokes it when the
// blob changes or the component unmounts - fixes a leak where every
// re-render was creating a new, never-revoked object URL. WebKit in
// particular has a low limit on live un-revoked blob URLs; exceeding
// it can make blob URLs fail to resolve, showing as broken images.

'use client';

import { useEffect, useState } from 'react';

export function useObjectUrl(blob: Blob | null | undefined): string | null {
  // 1. Hooks are declared at the very top, unconditionally
  const [prevBlob, setPrevBlob] = useState<Blob | null | undefined>(null);
  const [url, setUrl] = useState<string | null>(null);

  // 2. Sync state during the render phase (fully supported by React for prop-syncing)
  if (blob !== prevBlob) {
    setPrevBlob(blob);
    
    // Revoke the old URL immediately to prevent memory leaks
    if (url) {
      URL.revokeObjectURL(url);
    }
    
    // Generate the new URL or reset to null
    setUrl(blob ? URL.createObjectURL(blob) : null);
  }

  // 3. Handle cleanup when the hook finally unmounts
  useEffect(() => {
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [url]);

  return url;
}
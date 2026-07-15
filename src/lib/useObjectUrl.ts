// Creates an object URL for a Blob, and properly revokes it when the
// blob changes or the component unmounts - fixes a leak where every
// re-render was creating a new, never-revoked object URL. WebKit in
// particular has a low limit on live un-revoked blob URLs; exceeding
// it can make blob URLs fail to resolve, showing as broken images.

'use client';

import { useEffect, useMemo } from 'react';

export function useObjectUrl(blob: Blob | null | undefined): string | null {
  // Derived directly during render - the URL is purely a function of
  // the blob, so no setState is needed to "store" it.
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);

  useEffect(() => {
    // The effect here only handles cleanup (revoking the previous URL
    // when blob changes, or on unmount) - it never calls setState.
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  return url;
}
// Creates an object URL for a Blob, and properly revokes it when the
// blob changes or the component unmounts - fixes a leak where every
// re-render was creating a new, never-revoked object URL. WebKit in
// particular has a low limit on live un-revoked blob URLs; exceeding
// it can make blob URLs fail to resolve, showing as broken images.

'use client';

import { useEffect, useState } from 'react';

export function useObjectUrl(blob: Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      // this mirrors the same justification as the create
      // branch, just for the "no blob" case.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(blob);

    // an object URL is a genuine side effect (it allocates a browser
    // resource that needs a matching revoke), not a value derivable
    // from props - this is exactly the "synchronize with an external
    // system" case effects exist for. useMemo was tried first and is
    // wrong here: it doesn't re-run in lockstep with Strict Mode's
    // double effect invocation, which caused stale/revoked URLs.
    setUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [blob]);

  return url;
}
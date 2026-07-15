// Catches any unhandled error anywhere in the app and shows a friendly
// screen instead of a raw stack trace or Next.js's default error page.
// This is the last line of defense - everything else in the app already
// handles its own specific failure modes explicitly.

'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Logged for our own debugging - guests never see this, just the
    // friendly message below.
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <div className="flex h-dvh flex-col items-center justify-center bg-black px-6 text-center text-white">
      <p className="text-lg">Something went wrong.</p>
      <p className="mt-2 text-sm text-gray-400">
        Don&apos;t worry — any photos you&apos;ve already taken are safely saved
        on your device.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-white px-6 py-3 font-medium text-black"
      >
        Try again
      </button>
    </div>
  );
}
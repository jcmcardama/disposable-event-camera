'use client';

import { useEffect } from 'react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin dashboard error:', error);
  }, [error]);

  return (
    <div className="flex h-dvh flex-col items-center justify-center bg-gray-950 px-6 text-center text-white">
      <p className="text-lg">Something went wrong loading the admin dashboard.</p>
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-white px-6 py-3 font-medium text-black"
      >
        Try again
      </button>
    </div>
  );
}
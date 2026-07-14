// The gallery-open button, styled as a live thumbnail of the most
// recently captured photo rather than a plain icon - makes it visually
// obvious there are photos to view, and doubles as a subtle preview.

'use client';

import { useEffect, useState } from 'react';
import { getAllPhotos } from '@/lib/indexeddb';

interface GalleryButtonProps {
  onClick: () => void;
  refreshKey: number; // same signal CameraScreen already uses to tell the gallery to reload
}

export function GalleryButton({ onClick, refreshKey }: GalleryButtonProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;

    async function loadThumbnail() {
      const photos = await getAllPhotos();
      if (photos.length === 0) {
        setThumbnailUrl(null);
        return;
      }
      // getAllPhotos returns photos sorted by shotNumber ascending, so
      // the last item is the most recently taken shot.
      const mostRecent = photos[photos.length - 1];
      objectUrl = URL.createObjectURL(mostRecent.blob);
      setThumbnailUrl(objectUrl);
    }

    loadThumbnail();

    // Revoke the object URL when a newer one replaces it (or on unmount),
    // so we're not leaking memory as the user keeps capturing.
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [refreshKey]);

  return (
    <button
      onClick={onClick}
      className="relative h-10 w-10 overflow-hidden rounded-full border border-gray-600 bg-gray-800 disabled:opacity-50"
      aria-label="Open gallery"
    >
      {thumbnailUrl && (
        // for a locally captured photo; see note in GalleryBottomSheet.
        // eslint-disable-next-line @next/next/no-img-element -- blob: URL
        <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
      )}
    </button>
  );
}
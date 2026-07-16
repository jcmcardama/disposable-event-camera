// The gallery-open button, styled as a live thumbnail of the most
// recently captured photo rather than a plain icon - makes it visually
// obvious there are photos to view, and doubles as a subtle preview.

'use client';

import { usePhotos } from '@/lib/photoStore';
import { getOrCreateObjectUrl } from '@/lib/objectUrlCache';

interface GalleryButtonProps {
  onClick: () => void;
}

export function GalleryButton({ onClick }: GalleryButtonProps) {
  const photos = usePhotos();
  const latestPhoto = photos.length > 0 ? photos[photos.length - 1] : null;
  const thumbnailUrl = latestPhoto ? getOrCreateObjectUrl(latestPhoto.localId, latestPhoto.blob) : null;

  return (
    <button onClick={onClick} className="relative h-10 w-10 overflow-hidden rounded-full border border-gray-600 bg-gray-800" aria-label="Open gallery">
      {thumbnailUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- blob: URL, see objectUrlCache.ts
        <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
      )}
    </button>
  );
}

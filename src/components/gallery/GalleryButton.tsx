// The gallery-open button, styled as a live thumbnail of the most
// recently captured photo rather than a plain icon - makes it visually
// obvious there are photos to view, and doubles as a subtle preview.

'use client';

import { useEffect, useState } from 'react';
import { getAllPhotos } from '@/lib/indexeddb';
import { getPhotoUrl } from '@/lib/getPhotoUrl';

type LocalPhoto = Awaited<ReturnType<typeof getAllPhotos>>[number];

interface GalleryButtonProps {
  onClick: () => void;
  refreshKey: number; // same signal CameraScreen already uses to tell the gallery to reload
}

export function GalleryButton({ onClick, refreshKey }: GalleryButtonProps) {
  const [latestPhoto, setLatestPhoto] = useState<LocalPhoto | null>(null);
  const thumbnailUrl = latestPhoto ? getPhotoUrl(latestPhoto.localId, latestPhoto.blob) : null;
  
  useEffect(() => {
    getAllPhotos().then((photos) => {
      setLatestPhoto(photos.length > 0 ? photos[photos.length - 1] : null);
    });
  }, [refreshKey]);

  return (
    <button
      onClick={onClick}
      className="relative h-10 w-10 overflow-hidden rounded-full border border-gray-600 bg-gray-800"
      aria-label="Open gallery"
    >
      {thumbnailUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- blob: URL, see earlier note
        <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
      )}
    </button>
  );
}
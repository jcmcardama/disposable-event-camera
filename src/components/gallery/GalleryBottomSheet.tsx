'use client';

import { useEffect, useState } from 'react';
import { getAllPhotos } from '@/lib/indexeddb';
import { PhotoPreview } from './PhotoPreview';

type LocalPhoto = Awaited<ReturnType<typeof getAllPhotos>>[number];

interface GalleryBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  refreshKey: number; // parent bumps this after every capture/delete/upload change to trigger a reload
  onPhotosChanged: () => void; // tells the parent to refresh anything derived from photos (e.g. the gallery button's thumbnail)
}

// Small colored dot overlay indicating upload status - kept intentionally
// minimal per the spec ("small overlay icons"), not a full badge/label.
function StatusDot({ status }: { status: LocalPhoto['status'] }) {
  const color =
    status === 'uploaded'
      ? 'bg-green-500'
      : status === 'failed'
        ? 'bg-red-500'
        : 'bg-yellow-500'; // pending or uploading

  return <span className={`absolute right-1 top-1 h-2.5 w-2.5 rounded-full ${color}`} />;
}

export function GalleryBottomSheet({ isOpen, onClose, refreshKey, onPhotosChanged }: GalleryBottomSheetProps) {
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  // Reload photos whenever the sheet opens or the parent signals a change
  // (new capture, delete, or upload status update).
  useEffect(() => {
    if (isOpen) {
      getAllPhotos().then(setPhotos);
    }
  }, [isOpen, refreshKey]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-gray-900 pb-6 pt-4">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-600" />

        {photos.length === 0 ? (
          <p className="px-4 text-center text-sm text-gray-400">No photos yet.</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto px-4">
            {photos.map((photo, index) => (
              <button
                key={photo.localId}
                onClick={() => setPreviewIndex(index)}
                className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-800"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL, see earlier note */}
                <img
                  src={URL.createObjectURL(photo.blob)}
                  alt={photo.fileName}
                  className="h-full w-full object-cover"
                />
                <StatusDot status={photo.status} />
              </button>
            ))}
          </div>
        )}
      </div>

      {previewIndex !== null && photos[previewIndex] && (
        <PhotoPreview
          photo={photos[previewIndex]}
          currentIndex={previewIndex}
          totalPhotos={photos.length}
          hasNext={previewIndex < photos.length - 1}
          hasPrevious={previewIndex > 0}
          onNext={() => setPreviewIndex((i) => (i !== null ? i + 1 : null))}
          onPrevious={() => setPreviewIndex((i) => (i !== null ? i - 1 : null))}
          onClose={() => setPreviewIndex(null)}
          onDeleted={() => {
            setPreviewIndex(null);
            getAllPhotos().then(setPhotos);
            onPhotosChanged();
          }}
        />
      )}
    </>
  );
}
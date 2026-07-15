// Fullscreen preview of a single photo, shown when a gallery thumbnail
// is tapped. Offers download, delete, close, and - for failed uploads -
// manual retry, per the spec.

'use client';

import { useRef, useState } from 'react';
import { deletePhotoLocal, getAllPhotos } from '@/lib/indexeddb';
import { processUploadQueue } from '@/lib/uploadQueue';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { getPhotoUrl } from '@/lib/getPhotoUrl';
import { revokeObjectUrl } from '@/lib/objectUrlCache';

type LocalPhoto = Awaited<ReturnType<typeof getAllPhotos>>[number];

interface PhotoPreviewProps {
  photo: LocalPhoto;
  currentIndex: number;
  totalPhotos: number;
  hasNext: boolean;
  hasPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
  onDeleted: () => void;
}

const STATUS_LABEL: Record<LocalPhoto['status'], string> = {
  pending: 'Waiting to upload...',
  uploading: 'Uploading...',
  uploaded: 'Uploaded',
  failed: 'Upload failed',
};

// Minimum horizontal drag distance (px) to count as a deliberate swipe,
// rather than an accidental small movement while tapping.
const SWIPE_THRESHOLD = 50;

export function PhotoPreview({
  photo, currentIndex, totalPhotos, hasNext, hasPrevious, onNext, onPrevious, onClose, onDeleted,
}: PhotoPreviewProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const imageUrl = getPhotoUrl(photo.localId, photo.blob);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;

    if (deltaX > SWIPE_THRESHOLD && hasPrevious) {
      onPrevious(); // swiped right - go to previous photo
    } else if (deltaX < -SWIPE_THRESHOLD && hasNext) {
      onNext(); // swiped left - go to next photo
    }
  }

  async function performDelete() {
    setIsConfirmingDelete(false);
    setIsDeleting(true);
    // Per the spec: deleting only removes the photo locally and from
    // storage bookkeeping - it never frees up a shot. We intentionally
    // do NOT decrement any counter here.
    await deletePhotoLocal(photo.localId);
    revokeObjectUrl(photo.localId); // only revoke when the photo is actually gone
    onDeleted();
  }

  function handleDownload() {
    const url = URL.createObjectURL(photo.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = photo.fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleRetry() {
    setIsRetrying(true);
    // processUploadQueue re-reads from IndexedDB and picks up anything
    // 'pending' | 'failed' | 'uploading' (per the Milestone 6 fix) -
    // this photo's 'failed' status makes it eligible automatically.
    await processUploadQueue();
    setIsRetrying(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm text-gray-400">{STATUS_LABEL[photo.status]}</span>
        <button onClick={onClose} className="text-2xl leading-none" aria-label="Close">
          ×
        </button>
      </div>

      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- blob: URL, see earlier note
          <img src={imageUrl} alt={photo.fileName} className="max-h-full max-w-full object-contain" />
        )}

        {hasPrevious && (
          <button
            onClick={onPrevious}
            className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-2xl text-white"
            aria-label="Previous photo"
          >
            ‹
          </button>
        )}

        {hasNext && (
          <button
            onClick={onNext}
            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-2xl text-white"
            aria-label="Next photo"
          >
            ›
          </button>
        )}

        {totalPhotos >= 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {Array.from({ length: totalPhotos }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${i === currentIndex ? 'bg-white' : 'bg-white/40'}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 px-6 py-6">
        <button onClick={handleDownload} className="rounded-lg bg-gray-800 px-5 py-3 text-white">
          Download
        </button>

        {photo.status === 'failed' && (
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="rounded-lg bg-blue-600 px-5 py-3 text-white disabled:opacity-50"
          >
            {isRetrying ? 'Retrying...' : 'Retry upload'}
          </button>
        )}

        <button
          onClick={() => setIsConfirmingDelete(true)}
          disabled={isDeleting}
          className="rounded-lg bg-red-900 px-5 py-3 text-white disabled:opacity-50"
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>

      {isConfirmingDelete && (
        <ConfirmDialog
          title="Delete this photo?"
          message="This shot will not be added back to your remaining count. This can't be undone."
          confirmLabel="Delete"
          onConfirm={performDelete}
          onCancel={() => setIsConfirmingDelete(false)}
        />
      )}
    </div>
  );
}
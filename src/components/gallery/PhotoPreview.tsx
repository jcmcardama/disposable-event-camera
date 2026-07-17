// Fullscreen preview of a single photo, shown when a gallery thumbnail
// is tapped. Offers download, delete, close, and - for failed uploads -
// manual retry, per the spec.

'use client';

import { useRef, useState } from 'react';
import { removePhoto } from '@/lib/photoStore';
import { getOrCreateObjectUrl, revokeObjectUrl } from '@/lib/objectUrlCache';
import { processUploadQueue } from '@/lib/uploadQueue';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ArrowPathRoundedSquareIcon, FolderArrowDownIcon, TrashIcon } from '@heroicons/react/24/solid';

interface LocalPhoto {
  localId: string;
  fileName: string;
  blob: Blob;
  status: 'pending' | 'uploading' | 'uploaded' | 'failed';
}

interface PhotoPreviewProps {
  photo: LocalPhoto;
  currentIndex: number;
  totalPhotos: number;
  hasNext: boolean;
  hasPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
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

export function PhotoPreview({ photo, currentIndex, totalPhotos, hasNext, hasPrevious, onNext, onPrevious, onClose }: PhotoPreviewProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const imageUrl = getOrCreateObjectUrl(photo.localId, photo.blob);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (deltaX > SWIPE_THRESHOLD && hasPrevious) onPrevious();
    else if (deltaX < -SWIPE_THRESHOLD && hasNext) onNext();
  }

  async function performDelete() {
    setIsConfirmingDelete(false);
    setIsDeleting(true);
    await removePhoto(photo.localId);
    revokeObjectUrl(photo.localId);
    onClose();
  }

  function handleDownload() {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = photo.fileName;
    link.click();
  }

  async function handleRetry() {
    setIsRetrying(true);
    await processUploadQueue();
    setIsRetrying(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm text-gray-400">{STATUS_LABEL[photo.status]}</span>
        <button onClick={onClose} className="text-2xl leading-none" aria-label="Close">×</button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden touch-pan-y" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL, see objectUrlCache.ts */}
        <img src={imageUrl} alt={photo.fileName} className="max-h-full max-w-full object-contain" />

        {hasPrevious && <button onClick={onPrevious} className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-2xl text-white" aria-label="Previous photo">‹</button>}
        {hasNext && <button onClick={onNext} className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-2xl text-white" aria-label="Next photo">›</button>}

        {totalPhotos > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {Array.from({ length: totalPhotos }).map((_, i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === currentIndex ? 'bg-white' : 'bg-white/40'}`} />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 px-6 py-6">
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 rounded-lg bg-gray-800 px-5 py-3 text-white"
        >
          Download <FolderArrowDownIcon className="h-6 w-6" />
        </button>
        {photo.status === 'failed' && (
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-white disabled:opacity-50"
          >
            {isRetrying ? 'Retrying...' : <>Retry<ArrowPathRoundedSquareIcon className="h-6 w-6" /></>}
          </button>
        )}
        <button
          onClick={() => setIsConfirmingDelete(true)}
          disabled={isDeleting}
          className="flex items-center gap-2 rounded-lg bg-red-900 px-5 py-3 text-white disabled:opacity-50"
        >
          {isDeleting ? 'Deleting...' : <>Delete <TrashIcon className="h-6 w-6" /></>}
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
// Fullscreen preview of a single photo, shown when a gallery thumbnail
// is tapped. Offers download, delete, close, and - for failed uploads -
// manual retry, per the spec.

'use client';

import { useState } from 'react';
import { deletePhotoLocal, getAllPhotos } from '@/lib/indexeddb';
import { processUploadQueue } from '@/lib/uploadQueue';

type LocalPhoto = Awaited<ReturnType<typeof getAllPhotos>>[number];

interface PhotoPreviewProps {
  photo: LocalPhoto;
  onClose: () => void;
  onDeleted: () => void;
}

const STATUS_LABEL: Record<LocalPhoto['status'], string> = {
  pending: 'Waiting to upload...',
  uploading: 'Uploading...',
  uploaded: 'Uploaded',
  failed: 'Upload failed',
};

export function PhotoPreview({ photo, onClose, onDeleted }: PhotoPreviewProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    // Per the spec: deleting only removes the photo locally and from
    // storage bookkeeping - it never frees up a shot. We intentionally
    // do NOT decrement any counter here.
    await deletePhotoLocal(photo.localId);
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
    onClose(); // close preview - user can reopen gallery to see updated status
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm text-gray-400">{STATUS_LABEL[photo.status]}</span>
        <button onClick={onClose} className="text-2xl leading-none" aria-label="Close">
          ×
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL for a
            locally captured photo; next/image's optimizer can't fetch blob URLs,
            so this rule's suggestion doesn't apply here. */}
        <img
          src={URL.createObjectURL(photo.blob)}
          alt={photo.fileName}
          className="max-h-full max-w-full object-contain"
        />
      </div>

      <div className="flex items-center justify-center gap-4 px-6 py-6">
        <button
          onClick={handleDownload}
          className="rounded-lg bg-gray-800 px-5 py-3 text-white"
        >
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
          onClick={handleDelete}
          disabled={isDeleting}
          className="rounded-lg bg-red-900 px-5 py-3 text-white disabled:opacity-50"
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { useCamera } from '@/lib/useCamera';
import { compressImage } from '@/lib/compressImage';
import { usePhotos, addPhoto } from '@/lib/photoStore';
import { processUploadQueue } from '@/lib/uploadQueue';
import { useOnlineStatus } from '@/lib/useOnlineStatus';
import { GalleryBottomSheet } from '@/components/gallery/GalleryBottomSheet';
import { GalleryButton } from '@/components/gallery/GalleryButton';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface CameraScreenProps {
  deviceId: string;
  displayName: string;
  shotLimit: number; // now comes from event_settings via page.tsx, not hardcoded
}

export function CameraScreen({ deviceId, displayName, shotLimit }: CameraScreenProps) {
  const { videoRef, status, switchCamera, capturePhoto } = useCamera();
  const photos = usePhotos(); // gallery contents only - display/filenames, not the limit
  const [isCapturing, setIsCapturing] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const isOnline = useOnlineStatus();

  // Authoritative from the server, fetched once on mount. Only ever
  // incremented locally on capture afterward - never touched by
  // delete, matching the server's own shots_used behavior.
  const [shotsUsed, setShotsUsed] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/device-status?deviceId=${deviceId}`)
      .then((r) => r.json())
      .then((data) => setShotsUsed(data.shotsUsed))
      .catch(() => setShotsUsed(0));
  }, [deviceId]);

  const shotsRemaining = shotsUsed === null ? null : shotLimit - shotsUsed;
  const limitReached = shotsRemaining !== null && shotsRemaining <= 0;

  async function handleCapture() {
    if (limitReached || shotsUsed === null || isCapturing) return;

    setIsCapturing(true);
    try {
      const rawBlob = await capturePhoto();
      if (!rawBlob) {
        console.error('Capture failed - no blob returned');
        return;
      }

      const compressedBlob = await compressImage(rawBlob);
      const shotNumber = photos.length + 1; // cosmetic only - real shot number comes from the server on upload
      const fileName = `${displayName}-${String(shotNumber).padStart(3, '0')}.jpg`;

      await addPhoto({
        localId: crypto.randomUUID(),
        deviceId,
        shotNumber,
        fileName,
        blob: compressedBlob,
        status: 'pending',
        capturedAt: Date.now(),
      });

      setShotsUsed((prev) => (prev ?? 0) + 1);
      processUploadQueue();
    } finally {
      setIsCapturing(false);
    }
  }

  return (
    <div className="relative flex h-dvh flex-col bg-black text-white">
      <div className="flex items-center justify-between px-4 py-3 text-sm">
        <span>{displayName}</span>
        <span className="text-gray-400">
          {shotsRemaining === null ? '—' : `${shotsRemaining} shots left`}
        </span>
      </div>

      {!isOnline && (
        <div className="bg-yellow-600 px-4 py-2 text-center text-sm text-black">
          You&apos;re offline. Photos will keep saving and upload automatically once you&apos;re back online.
        </div>
      )}

      <div className="relative flex-1 overflow-hidden bg-gray-900 touch-none">
        <video ref={videoRef} autoPlay playsInline muted className={`h-full w-full object-cover ${status === 'ready' ? '' : 'hidden'}`} />
        {status === 'loading' && <div className="flex h-full items-center justify-center text-gray-400">Starting camera...</div>}
        {status === 'permission-denied' && <div className="flex h-full items-center justify-center px-6 text-center text-gray-400">Camera access was denied. Please allow camera access in your browser settings and reload the page.</div>}
        {status === 'no-camera' && <div className="flex h-full items-center justify-center px-6 text-center text-gray-400">No camera was found on this device.</div>}
        {status === 'error' && <div className="flex h-full items-center justify-center px-6 text-center text-gray-400">Something went wrong starting the camera. Please reload the page.</div>}
        {limitReached && status === 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 px-6 text-center">
            You&apos;ve used all {shotLimit} of your shots.
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-8 py-6">
        <GalleryButton onClick={() => setIsGalleryOpen(true)} />
        <button
          onClick={handleCapture}
          disabled={status !== 'ready' || limitReached || isCapturing || shotsUsed === null}
          className="flex items-center justify-center h-16 w-16 rounded-full border-4 border-white bg-white/20 disabled:opacity-30"
          aria-label="Capture photo"
        />
        <button
          onClick={switchCamera}
          disabled={status !== 'ready'}
          className="flex items-center justify-center h-10 w-10 rounded-full bg-gray-800 text-xl disabled:opacity-30"
          aria-label="Switch camera"
        >
          <ArrowPathIcon className="h-6 w-6" />
        </button>
      </div>

      <GalleryBottomSheet isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} />
    </div>
  );
}

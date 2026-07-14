'use client';

import { useEffect, useState } from 'react';
import { useCamera } from '@/lib/useCamera';
import { compressImage } from '@/lib/compressImage';
import { savePhoto, getAllPhotos } from '@/lib/indexeddb';
import { processUploadQueue } from '@/lib/uploadQueue';
import { GalleryBottomSheet } from '@/components/gallery/GalleryBottomSheet';
import { GalleryButton } from '../gallery/GalleryButton';

const SHOT_LIMIT = 5;

interface CameraScreenProps {
  deviceId: string;
  displayName: string;
}

export function CameraScreen({ deviceId, displayName }: CameraScreenProps) {
  const { videoRef, status, switchCamera, capturePhoto } = useCamera();
  const [photoCount, setPhotoCount] = useState<number | null>(null); // null = still loading from IndexedDB
  const [isCapturing, setIsCapturing] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // bumped to signal gallery should reload

  // Load however many photos this device already has, on mount -
  // covers the case where the user reloads mid-session.
  useEffect(() => {
    getAllPhotos().then((photos) => setPhotoCount(photos.length));
  }, []);

  const shotsRemaining = photoCount === null ? null : SHOT_LIMIT - photoCount;
  const limitReached = shotsRemaining !== null && shotsRemaining <= 0;

  async function handleCapture() {
    if (limitReached || photoCount === null || isCapturing) return;

    setIsCapturing(true);
    try {
      const rawBlob = await capturePhoto();
      if (!rawBlob) {
        console.error('Capture failed - no blob returned');
        return;
      }

      const compressedBlob = await compressImage(rawBlob);
      const shotNumber = photoCount + 1;
      const fileName = `${displayName}-${String(shotNumber).padStart(3, '0')}.jpg`;

      // Save locally FIRST, before anything else happens. This is the
      // moment the photo becomes "safe" per the spec's reliability
      // requirement - upload (Milestone 6) is a separate, later step.
      await savePhoto({
        localId: crypto.randomUUID(),
        deviceId,
        shotNumber,
        fileName,
        blob: compressedBlob,
        status: 'pending',
        capturedAt: Date.now(),
      });

      setPhotoCount(shotNumber);
      setRefreshKey((k) => k + 1); // let an open gallery pick up the new photo immediately

      processUploadQueue().then(() => setRefreshKey((k) => k + 1)); // refresh again once upload settles
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

      <div className="relative flex-1 overflow-hidden bg-gray-900">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`h-full w-full object-cover ${status === 'ready' ? '' : 'hidden'}`}
        />

        {status === 'loading' && (
          <div className="flex h-full items-center justify-center text-gray-400">
            Starting camera...
          </div>
        )}
        {status === 'permission-denied' && (
          <div className="flex h-full items-center justify-center px-6 text-center text-gray-400">
            Camera access was denied. Please allow camera access in your
            browser settings and reload the page.
          </div>
        )}
        {status === 'no-camera' && (
          <div className="flex h-full items-center justify-center px-6 text-center text-gray-400">
            No camera was found on this device.
          </div>
        )}
        {status === 'error' && (
          <div className="flex h-full items-center justify-center px-6 text-center text-gray-400">
            Something went wrong starting the camera. Please reload the page.
          </div>
        )}

        {limitReached && status === 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 px-6 text-center">
            You&apos;ve used all {SHOT_LIMIT} of your shots.
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-8 py-6">
        <GalleryButton
          onClick={() => setIsGalleryOpen(true)}
          refreshKey={refreshKey}
        />

        <button
          onClick={handleCapture}
          disabled={status !== 'ready' || limitReached || isCapturing}
          className="h-16 w-16 rounded-full border-4 border-white bg-white/20 disabled:opacity-30"
          aria-label="Capture photo"
        />

        <button
          onClick={switchCamera}
          disabled={status !== 'ready'}
          className="h-10 w-10 rounded-full bg-gray-800 text-xl disabled:opacity-30"
          aria-label="Switch camera"
        >
          ↺
        </button>
      </div>

      <GalleryBottomSheet
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        refreshKey={refreshKey}
        onPhotosChanged={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
'use client';

import { useState } from 'react';
import { useCamera } from '@/lib/useCamera';
import { compressImage } from '@/lib/compressImage';
import { usePhotos, addPhoto } from '@/lib/photoStore';
import { processUploadQueue } from '@/lib/uploadQueue';
import { useOnlineStatus } from '@/lib/useOnlineStatus';
import { GalleryBottomSheet } from '@/components/gallery/GalleryBottomSheet';
import { GalleryButton } from '@/components/gallery/GalleryButton';

interface CameraScreenProps {
  deviceId: string;
  displayName: string;
  shotLimit: number; // now comes from event_settings via page.tsx, not hardcoded
}

export function CameraScreen({ deviceId, displayName, shotLimit }: CameraScreenProps) {
  const { videoRef, status, switchCamera, capturePhoto } = useCamera();
  const photos = usePhotos();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const isOnline = useOnlineStatus();

  const photoCount = photos.length;
  const shotsRemaining = shotLimit - photoCount;
  const limitReached = shotsRemaining <= 0;

  async function handleCapture() {
    if (limitReached || isCapturing) return;

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

      await addPhoto({
        localId: crypto.randomUUID(),
        deviceId,
        shotNumber,
        fileName,
        blob: compressedBlob,
        status: 'pending',
        capturedAt: Date.now(),
      });

      processUploadQueue();
    } finally {
      setIsCapturing(false);
    }
  }

  return (
    <div className="relative flex h-dvh flex-col bg-black text-white">
      <div className="flex items-center justify-between px-4 py-3 text-sm">
        <span>{displayName}</span>
        <span className="text-gray-400">{shotsRemaining} shots left</span>
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
        <button onClick={handleCapture} disabled={status !== 'ready' || limitReached || isCapturing} className="h-16 w-16 rounded-full border-4 border-white bg-white/20 disabled:opacity-30" aria-label="Capture photo" />
        <button onClick={switchCamera} disabled={status !== 'ready'} className="h-10 w-10 rounded-full bg-gray-800 text-xl disabled:opacity-30" aria-label="Switch camera">↺</button>
      </div>

      <GalleryBottomSheet isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} />
    </div>
  );
}
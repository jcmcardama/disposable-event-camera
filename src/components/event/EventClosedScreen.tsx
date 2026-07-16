// Shown instead of the camera when the event isn't currently open -
// covers all three closed states from the spec: not yet enabled by
// admin, before the start time, and after the end time.

'use client';

import { useState } from 'react';
import { Spinner } from '@/components/shared/Spinner';
import { GalleryBottomSheet } from '@/components/gallery/GalleryBottomSheet';

interface EventClosedScreenProps {
  reason: 'disabled' | 'before-start' | 'after-end';
  eventStart: string;
}

const MESSAGES: Record<EventClosedScreenProps['reason'], string> = {
  disabled: "This event hasn't started yet. Check back soon!",
  'before-start': "The event hasn't started yet.",
  'after-end': 'This event has ended. Thanks for being part of it!',
};

export function EventClosedScreen({ reason, eventStart }: EventClosedScreenProps) {
  const isWaiting = reason === 'disabled' || reason === 'before-start';

  // Self-contained gallery state, separate from CameraScreen's - this
  // screen has no capturing/event-open logic to coordinate with, so it
  // doesn't need to share anything beyond what GalleryBottomSheet
  // itself already requires.
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white">
      {isWaiting && <Spinner />}
      <p className="text-lg">{MESSAGES[reason]}</p>
      {reason === 'before-start' && (
        <p className="text-sm text-gray-400">
          Starts at {new Date(eventStart).toLocaleTimeString()}
        </p>
      )}

      {reason === 'after-end' && (
        <button
          onClick={() => setIsGalleryOpen(true)}
          className="mt-2 rounded-lg bg-white px-6 py-3 font-medium text-black"
        >
          View my photos
        </button>
      )}

      {reason === 'after-end' && (
        <GalleryBottomSheet
          isOpen={isGalleryOpen}
          onClose={() => setIsGalleryOpen(false)}
        />
      )}
    </div>
  );
}

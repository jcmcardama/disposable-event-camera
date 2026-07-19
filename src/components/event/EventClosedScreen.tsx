// Shown instead of the camera when the event isn't currently open -
// covers all three closed states from the spec: not yet enabled by
// admin, before the start time, and after the end time.

'use client';

import { useState } from 'react';
import { Spinner } from '@/components/shared/Spinner';
import { GalleryBottomSheet } from '@/components/gallery/GalleryBottomSheet';
import { Footer } from '../shared/Footer';

interface EventClosedScreenProps {
  reason: 'disabled' | 'before-start' | 'after-end';
  eventStart: string;
}

const MESSAGES: Record<EventClosedScreenProps['reason'], string> = {
  disabled: "This event hasn't started yet. Check back soon!",
  'before-start': "The event hasn't started yet.",
  'after-end': 'This event has ended.\nThanks for being part of it!',
};

export function EventClosedScreen({ reason, eventStart }: EventClosedScreenProps) {
  const isWaiting = reason === 'disabled' || reason === 'before-start';

  // Self-contained gallery state, separate from CameraScreen's - this
  // screen has no capturing/event-open logic to coordinate with, so it
  // doesn't need to share anything beyond what GalleryBottomSheet
  // itself already requires.
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-black text-white">
      <div
        className="absolute inset-0 bg-contain bg-center blur-md"
        style={{ backgroundImage: "url('/event-background.jpg')" }}
      />
      <div className="absolute inset-0 bg-black/30" />

      {/* Single foreground stacking context - content and Footer are now
          siblings inside the SAME z-10 context, so GalleryBottomSheet's
          z-50 correctly out-ranks Footer instead of being trapped in a
          separate context that Footer's own z-10 wrapper could paint over. */}
      <div className="relative z-10 flex h-full flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          {isWaiting && <Spinner />}
          <p className="text-lg whitespace-pre-line">{MESSAGES[reason]}</p>
          {reason === 'before-start' && (
            <p className="text-sm text-gray-400">
              Starts at {new Date(eventStart).toLocaleTimeString()}
            </p>
          )}
          {reason === 'after-end' && (
            <button onClick={() => setIsGalleryOpen(true)} className="mt-2 rounded-lg bg-white px-6 py-3 font-medium text-black">
              View my photos
            </button>
          )}
          {reason === 'after-end' && (
            <GalleryBottomSheet isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} />
          )}
        </div>

        <Footer />
      </div>
    </div>
  );
}

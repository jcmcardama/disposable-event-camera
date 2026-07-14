// The main single-screen camera UI: live preview, capture button, and
// front/rear switch. No scrolling, fills the viewport, portrait layout -
// matches the spec's "feels like a native phone camera" goal.

'use client';

import { useCamera } from '@/lib/useCamera';

interface CameraScreenProps {
  displayName: string;
}

export function CameraScreen({ displayName }: CameraScreenProps) {
  const { videoRef, status, switchCamera, capturePhoto } = useCamera();

  async function handleCapture() {
    const photoBlob = await capturePhoto();
    if (!photoBlob) {
      console.error('Capture failed - no blob returned');
      return;
    }
    // Milestone 5 will compress this and save it to IndexedDB.
    // For now, just confirm the pipeline works end to end.
    console.log('Captured photo:', photoBlob.size, 'bytes');
  }

  return (
    <div className="relative flex h-dvh flex-col bg-black text-white">
      {/* Top bar: name + remaining shots (shot count wired up in Milestone 5) */}
      <div className="flex items-center justify-between px-4 py-3 text-sm">
        <span>{displayName}</span>
        <span className="text-gray-400">5 shots left</span>
      </div>

      {/* Middle: camera preview, fills remaining space */}
      <div className="relative flex-1 overflow-hidden bg-gray-900">
       {/* Video is always rendered so videoRef is available as soon as the
        stream is ready to attach - visibility is controlled with CSS
        instead of conditional mounting, avoiding a race between
        "stream attached" and "element exists in the DOM". */}
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
      </div>

      {/* Bottom: gallery button (Milestone 7) / capture / switch camera */}
      <div className="flex items-center justify-between px-8 py-6">
        <button
          disabled
          className="h-10 w-10 rounded-full bg-gray-800 opacity-50"
          aria-label="Gallery (coming in Milestone 7)"
        />

        <button
          onClick={handleCapture}
          disabled={status !== 'ready'}
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
    </div>
  );
}
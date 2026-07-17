// Manages everything related to the browser Camera API: requesting
// permission, starting/stopping the video stream, and switching between
// front and rear cameras. Isolated into a hook so the UI component only
// has to react to state, not deal with getUserMedia directly.

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getCameraPreference, saveCameraPreference } from './indexeddb';

type CameraStatus = 'loading' | 'ready' | 'permission-denied' | 'no-camera' | 'error';

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<CameraStatus>('loading');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  // Stops whatever stream is currently running. Always called before
  // starting a new one, so switching cameras doesn't leave the old
  // camera's light on / stream running in the background.
  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  // Requests the camera and attaches it to the <video> element.
  const startStream = useCallback(async (mode: 'user' | 'environment') => {
    stopStream();
    setStatus('loading');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          // Request a high-resolution stream explicitly - without this, the
          // browser can default to a much lower resolution regardless of the
          // camera's actual capability, which is almost certainly the real
          // source of the blurriness (no compression setting can add back
          // detail that was never in the captured frame to begin with).
          // 'ideal' is a hint, not a hard requirement, so it still degrades
          // gracefully on devices/cameras that can't hit this resolution.
          width: { ideal: 2560 },
          height: { ideal: 1440 },
        },
        audio: true,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStatus('ready');
    } catch (err) {
      // getUserMedia throws different error names for different failures -
      // we map the ones the spec explicitly calls out to friendly statuses.
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setStatus('permission-denied');
        } else if (err.name === 'NotFoundError') {
          setStatus('no-camera');
        } else {
          setStatus('error');
        }
      } else {
        setStatus('error');
      }
    }
  }, [stopStream]);

  // On mount: load the user's last camera preference (if any) and start
  // the stream. Runs once.
  useEffect(() => {
    async function init() {
      const savedMode = await getCameraPreference();
      const initialMode = savedMode ?? 'environment'; // default to rear camera
      setFacingMode(initialMode);
      await startStream(initialMode);
    }

    init();

    // Cleanup: stop the camera when this component unmounts, so we're
    // not leaving the user's camera light on after they navigate away.
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switches between front and rear camera, and remembers the choice.
  const switchCamera = useCallback(async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    await saveCameraPreference(newMode);
    await startStream(newMode);
  }, [facingMode, startStream]);

  // Captures the current video frame as a Blob (JPEG) and returns it. The caller can then
  // take this Blob and compress it before saving to IndexedDB.
  const capturePhoto = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video = videoRef.current;
      if (!video) {
        resolve(null);
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.drawImage(video, 0, 0);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95);
    });
  }, []);

  return { videoRef, status, facingMode, switchCamera, capturePhoto };
}
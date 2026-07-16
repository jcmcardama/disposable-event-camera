// Handles uploading locally-saved photos to the server, with automatic
// retry using exponential backoff on failure. Processes one photo at a
// time (not in parallel) - this keeps shot-number claiming naturally
// ordered and avoids overwhelming event WiFi with concurrent uploads.

import { getDeviceInfo } from './indexeddb';
import { getPhotosSnapshot, setPhotoStatus, setPhotoServerInfo } from './photoStore';

const RETRY_DELAY_MS = 4000; // one quick retry, then fail - see note in processUploadQueue

let isProcessing = false;
let rerunQueued = false;

async function uploadWithRetry(photo: Awaited<ReturnType<typeof getPhotosSnapshot>>[number]) {
  await setPhotoStatus(photo.localId, 'uploading');

  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      const formData = new FormData();
      formData.append('deviceId', photo.deviceId);
      formData.append('file', photo.blob, photo.fileName);
      if (photo.serverShotNumber) {
        formData.append('shotNumber', String(photo.serverShotNumber));
      }

      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      const result = await response.json();

      if (response.ok) {
        await setPhotoServerInfo(photo.localId, {
          status: 'uploaded',
          serverShotNumber: result.shotNumber,
          fileName: result.fileName,
        });
        return;
      }

      if (result.shotNumber) {
        await setPhotoServerInfo(photo.localId, { serverShotNumber: result.shotNumber });
      }

      if (response.status === 403) {
        await setPhotoStatus(photo.localId, 'failed');
        return;
      }

      if (response.status === 404 && result.error === 'Unknown device') {
        const localInfo = await getDeviceInfo();
        if (localInfo && localInfo.deviceId === photo.deviceId) {
          try {
            const reRegisterResponse = await fetch('/api/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ deviceId: photo.deviceId, displayName: localInfo.displayName }),
            });
            if (reRegisterResponse.ok) continue;
          } catch {
            // fall through to retry/fail below
          }
        }
      }
    } catch {
      // network error - fall through to retry/fail below
    }

    if (attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }

  await setPhotoStatus(photo.localId, 'failed');
}

export async function processUploadQueue() {
  if (isProcessing) {
    rerunQueued = true;
    return;
  }

  isProcessing = true;
  try {
    do {
      rerunQueued = false;
      const needsUpload = (await getPhotosSnapshot()).filter(
        (p) => p.status === 'pending' || p.status === 'failed' || p.status === 'uploading'
      );
      await Promise.allSettled(needsUpload.map((photo) => uploadWithRetry(photo)));
    } while (rerunQueued);
  } finally {
    isProcessing = false;
  }
}
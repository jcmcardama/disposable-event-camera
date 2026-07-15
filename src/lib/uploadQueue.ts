// Handles uploading locally-saved photos to the server, with automatic
// retry using exponential backoff on failure. Processes one photo at a
// time (not in parallel) - this keeps shot-number claiming naturally
// ordered and avoids overwhelming event WiFi with concurrent uploads.

import { getAllPhotos, updatePhotoStatus, updatePhotoServerInfo, getDeviceInfo } from './indexeddb';

const BACKOFF_DELAYS_MS = [5000, 15000, 30000, 60000];

let isProcessing = false;

// Attempts to re-register this device using its cached local identity.
// Used when the server reports "Unknown device" - meaning the device
// row was deleted (testing, or an admin reset) but this browser still
// thinks it's registered. Re-registering recreates the row so upload
// can succeed; per the schema, this naturally starts shots_used fresh
// at 0, which matches what "the device was reset" is supposed to mean.
async function tryReRegisterDevice(deviceId: string): Promise<boolean> {
  const localInfo = await getDeviceInfo();
  if (!localInfo || localInfo.deviceId !== deviceId) return false;

  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, displayName: localInfo.displayName }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function uploadWithRetry(photo: Awaited<ReturnType<typeof getAllPhotos>>[number]) {
  await updatePhotoStatus(photo.localId, 'uploading');
  let hasAttemptedReRegister = false;

  for (let attempt = 0; attempt <= BACKOFF_DELAYS_MS.length; attempt++) {
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
        await updatePhotoServerInfo(photo.localId, {
          status: 'uploaded',
          serverShotNumber: result.shotNumber,
          fileName: result.fileName,
        });
        return;
      }

      if (result.shotNumber) {
        await updatePhotoServerInfo(photo.localId, { serverShotNumber: result.shotNumber });
      }

      if (response.status === 403) {
        // Shot limit reached - retrying can never help, terminal failure.
        await updatePhotoStatus(photo.localId, 'failed');
        return;
      }

      if (response.status === 404 && result.error === 'Unknown device' && !hasAttemptedReRegister) {
        // One-shot recovery attempt: re-register, then immediately retry
        // this same iteration's upload rather than waiting out a full
        // backoff delay for an error that backoff can't fix on its own.
        hasAttemptedReRegister = true;
        const reRegistered = await tryReRegisterDevice(photo.deviceId);
        if (reRegistered) {
          continue; // retry immediately, same attempt count, no delay
        }
        // Re-registration itself failed (e.g. still offline) - fall
        // through to normal backoff and try again later.
      }
    } catch {
      // Network error - fall through to retry below.
    }

    if (attempt < BACKOFF_DELAYS_MS.length) {
      await new Promise((resolve) => setTimeout(resolve, BACKOFF_DELAYS_MS[attempt]));
    }
  }

  await updatePhotoStatus(photo.localId, 'failed');
}

export async function processUploadQueue() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const photos = await getAllPhotos();
    const needsUpload = photos.filter(
      (p) => p.status === 'pending' || p.status === 'failed' || p.status === 'uploading'
    );

    for (const photo of needsUpload) {
      await uploadWithRetry(photo);
    }
  } finally {
    isProcessing = false;
  }
}
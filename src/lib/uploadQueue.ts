// Handles uploading locally-saved photos to the server, with automatic
// retry using exponential backoff on failure. Processes one photo at a
// time (not in parallel) - this keeps shot-number claiming naturally
// ordered and avoids overwhelming event WiFi with concurrent uploads.

import { getAllPhotos, updatePhotoStatus, updatePhotoServerInfo } from './indexeddb';

const BACKOFF_DELAYS_MS = [5000, 15000, 30000, 60000]; // 5s, 15s, 30s, 60s per spec

let isProcessing = false;

// Uploads a single photo, retrying with backoff on failure.
// Runs until it succeeds or exhausts the backoff schedule (after which
// the photo is left as 'failed' for manual retry, per the spec).
async function uploadWithRetry(photo: Awaited<ReturnType<typeof getAllPhotos>>[number]) {
  await updatePhotoStatus(photo.localId, 'uploading');

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
        return; // success - stop retrying
      }

      // Even on failure, the server may have returned a claimed
      // shotNumber - save it so the next retry reuses it instead of
      // claiming a new one.
      if (result.shotNumber) {
        await updatePhotoServerInfo(photo.localId, { serverShotNumber: result.shotNumber });
      }

      if (response.status === 403) {
        // Shot limit reached server-side - retrying won't help, this
        // is a real terminal failure, not a transient one.
        await updatePhotoStatus(photo.localId, 'failed');
        return;
      }
    } catch {
      // Network error (offline, etc.) - fall through to retry below.
    }

    if (attempt < BACKOFF_DELAYS_MS.length) {
      await new Promise((resolve) => setTimeout(resolve, BACKOFF_DELAYS_MS[attempt]));
    }
  }

  // Exhausted all retries - mark failed, spec calls for manual retry
  // to be available from here (wired up in the Milestone 7 gallery).
  await updatePhotoStatus(photo.localId, 'failed');
}

// Processes every pending or failed photo, one at a time, in shot
// order. Safe to call multiple times - if already running, subsequent
// calls are ignored (the running pass will naturally pick up anything
// new since it re-reads from IndexedDB each time it starts).
export async function processUploadQueue() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const photos = await getAllPhotos();
    // 'uploading' is included here too - if a photo is in this state when
    // processUploadQueue starts, it means a previous attempt was
    // interrupted (page reload/crash) before it could resolve to
    // 'uploaded' or 'failed'. Since isProcessing prevents this function
    // from running twice concurrently, it's always safe to treat a
    // leftover 'uploading' status as needing a fresh retry.
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
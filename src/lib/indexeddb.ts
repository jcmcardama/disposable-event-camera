// Small wrapper around IndexedDB for storing this device's local identity.
// We use IndexedDB (not localStorage) because later milestones will also
// store actual photo files here, and localStorage can't hold binary data
// or handle the storage sizes photos need. Keeping all local storage in
// one IndexedDB database now means we don't have two systems to manage later.

import { openDB, type DBSchema } from 'idb';

// Describes the shape of our IndexedDB database so TypeScript can check
// our usage of it. We'll add an "photos" store here in Milestone 5.
interface CameraDB extends DBSchema {
  device: {
    key: string; // always the literal string "info" - single record store
    value: {
      deviceId: string;
      displayName: string;
    };
  };
}

// (Add 'cameraFacing' to the CameraDB interface, alongside 'device')
interface CameraDB extends DBSchema {
  device: {
    key: string;
    value: {
      deviceId: string;
      displayName: string;
    };
  };
  preferences: {
    key: string; // always "camera"
    value: {
      facingMode: 'user' | 'environment'; // 'user' = front, 'environment' = rear
    };
  };
}

interface CameraDB extends DBSchema {
  device: {
    key: string;
    value: {
      deviceId: string;
      displayName: string;
    };
  };
  preferences: {
    key: string;
    value: {
      facingMode: 'user' | 'environment';
    };
  };
  photos: {
    key: string; // localId (uuid) - separate from any server-assigned id,
                 // since a photo exists locally before the server knows about it
    value: {
      localId: string;
      deviceId: string;
      shotNumber: number; // 1-5, determines the filename
      fileName: string; // e.g. "Carlo-001.jpg"
      blob: Blob; // the compressed image data itself
      status: 'pending' | 'uploading' | 'uploaded' | 'failed'; // 'pending' = not yet attempted (Milestone 6 starts using the rest)
      capturedAt: number; // Date.now(), used to keep gallery order stable
    };
  };
}

type LocalPhoto = CameraDB['photos']['value'];

const DB_NAME = 'disposable-event-camera';
const DB_VERSION = 3;

// Opens (or creates, on first call) the IndexedDB database.
// We call this fresh each time rather than caching the connection,
// since idb's openDB is cheap to call repeatedly and this keeps the
// code simple - no need to worry about stale connections.
function getDB() {
  return openDB<CameraDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('device');
      }
      if (oldVersion < 2) {
        db.createObjectStore('preferences');
      }
      if (oldVersion < 3) {
        db.createObjectStore('photos', { keyPath: 'localId' });
      }
    },
  });
}

// Reads this device's stored identity, if it has registered before.
// Returns undefined if this is a brand new device.
export async function getDeviceInfo() {
  const db = await getDB();
  return db.get('device', 'info');
}

// Saves this device's identity after successful registration.
// Called once, right after the server confirms registration succeeded.
export async function saveDeviceInfo(deviceId: string, displayName: string) {
  const db = await getDB();
  await db.put('device', { deviceId, displayName }, 'info');
}

// Reads the last camera the user selected (front/rear).
// Returns undefined if they've never switched cameras before.
export async function getCameraPreference() {
  const db = await getDB();
  const pref = await db.get('preferences', 'camera');
  return pref?.facingMode;
}

// Saves which camera (front/rear) the user last selected.
export async function saveCameraPreference(facingMode: 'user' | 'environment') {
  const db = await getDB();
  await db.put('preferences', { facingMode }, 'camera');
}

// Saves a newly captured photo. Called immediately after compression,
// before anything else - this is what makes the photo "safe" even if
// the app closes before upload starts.
export async function savePhoto(photo: LocalPhoto) {
  const db = await getDB();
  await db.put('photos', photo);
}

// Returns all locally stored photos, ordered by shot number.
// Used both to render the current session's photos and, later
// milestones, to find anything still needing upload.
export async function getAllPhotos(): Promise<LocalPhoto[]> {
  const db = await getDB();
  const all = await db.getAll('photos');
  return all.sort((a, b) => a.shotNumber - b.shotNumber);
}

// Updates just the status of an existing photo (e.g. once upload
// succeeds or fails). Milestone 6 will use this.
export async function updatePhotoStatus(localId: string, status: LocalPhoto['status']) {
  const db = await getDB();
  const photo = await db.get('photos', localId);
  if (photo) {
    photo.status = status;
    await db.put('photos', photo);
  }
}

// Removes a photo locally. Milestone 7's gallery delete button will use this -
// deleting never frees up a shot, since shotNumber assignment only looks at
// how many photos currently exist, and shot numbers are never reused within
// a session.
export async function deletePhotoLocal(localId: string) {
  const db = await getDB();
  await db.delete('photos', localId);
}

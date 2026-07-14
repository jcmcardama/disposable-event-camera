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

const DB_NAME = 'disposable-event-camera';
const DB_VERSION = 2;

// Opens (or creates, on first call) the IndexedDB database.
// We call this fresh each time rather than caching the connection,
// since idb's openDB is cheap to call repeatedly and this keeps the
// code simple - no need to worry about stale connections.
function getDB() {
  return openDB<CameraDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Runs once per version bump, on whichever version the device is
      // currently at. Each `if` only creates what's missing, so this
      // works whether a device is on version 0 (brand new) or 1
      // (registered before this milestone).
      if (oldVersion < 1) {
        db.createObjectStore('device');
      }
      if (oldVersion < 2) {
        db.createObjectStore('preferences');
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

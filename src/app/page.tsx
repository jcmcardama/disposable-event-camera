// The single-page app entry point. Right now it just decides: has this
// device registered before? If not, show the registration screen.
// If yes, skip straight to the camera - which is still a placeholder
// until Milestone 4.

'use client';

import { useEffect, useState } from 'react';
import { getDeviceInfo } from '@/lib/indexeddb';
import { RegistrationScreen } from '@/components/registration/RegistrationScreen';

export default function Home() {
  // null = still checking IndexedDB, undefined = checked, not registered,
  // string = checked, registered (holds the display name)
  const [displayName, setDisplayName] = useState<string | null | undefined>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    async function checkRegistration() {
      const existing = await getDeviceInfo();

      if (existing) {
        // Returning device - skip registration entirely.
        setDisplayName(existing.displayName);
      } else {
        // Brand new device - generate its permanent ID now.
        // crypto.randomUUID() is built into modern browsers, no library needed.
        setDeviceId(crypto.randomUUID());
        setDisplayName(undefined);
      }
    }

    checkRegistration();
  }, []);

  // Still checking IndexedDB - avoid flashing the registration screen
  // for returning users while this resolves (should only take milliseconds).
  if (displayName === null) {
    return <div className="h-dvh bg-black" />;
  }

  // Not registered yet - show the name entry screen.
  if (displayName === undefined && deviceId) {
    return (
      <RegistrationScreen deviceId={deviceId} onComplete={(name) => setDisplayName(name)} />
    );
  }

  // Registered - camera goes here starting Milestone 4.
  return (
    <div className="flex h-dvh flex-col items-center justify-center bg-black text-white">
      <p>Welcome back, {displayName}!</p>
      <p className="mt-2 text-sm text-gray-400">Camera coming in Milestone 4.</p>
    </div>
  );
}
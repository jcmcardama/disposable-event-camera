'use client';

import { useEffect, useState } from 'react';
import { getDeviceInfo } from '@/lib/indexeddb';
import { RegistrationScreen } from '@/components/registration/RegistrationScreen';
import { CameraScreen } from '@/components/camera/CameraScreen';

// A single state value with one of three exact shapes - eliminates any
// combination of variables that shouldn't be possible together.
type AppState =
  | { status: 'checking' }
  | { status: 'unregistered'; deviceId: string }
  | { status: 'registered'; displayName: string };

export default function Home() {
  const [appState, setAppState] = useState<AppState>({ status: 'checking' });

  useEffect(() => {
    async function checkRegistration() {
      const existing = await getDeviceInfo();

      if (existing) {
        setAppState({ status: 'registered', displayName: existing.displayName });
      } else {
        setAppState({ status: 'unregistered', deviceId: crypto.randomUUID() });
      }
    }

    checkRegistration();
  }, []);

  if (appState.status === 'checking') {
    return <div className="h-dvh bg-black" />;
  }

  if (appState.status === 'unregistered') {
    return (
      <RegistrationScreen
        deviceId={appState.deviceId}
        onComplete={(name) => setAppState({ status: 'registered', displayName: name })}
      />
    );
  }

  // TypeScript now knows appState.status is 'registered' here, so
  // appState.displayName is guaranteed to be a string — no ambiguity.
  return <CameraScreen displayName={appState.displayName} />;
}
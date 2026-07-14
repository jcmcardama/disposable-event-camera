'use client';

import { useEffect, useState } from 'react';
import { getDeviceInfo } from '@/lib/indexeddb';
import { RegistrationScreen } from '@/components/registration/RegistrationScreen';
import { CameraScreen } from '@/components/camera/CameraScreen';
import { processUploadQueue } from '@/lib/uploadQueue';

type AppState =
  | { status: 'checking' }
  | { status: 'unregistered'; deviceId: string }
  | { status: 'registered'; deviceId: string; displayName: string };

export default function Home() {
  const [appState, setAppState] = useState<AppState>({ status: 'checking' });

  useEffect(() => {
    async function checkRegistration() {
      const existing = await getDeviceInfo();

      if (existing) {
        setAppState({
          status: 'registered',
          deviceId: existing.deviceId,
          displayName: existing.displayName,
        });
      } else {
        setAppState({ status: 'unregistered', deviceId: crypto.randomUUID() });
      }
    }

    checkRegistration();
    processUploadQueue();
  }, []);

  if (appState.status === 'checking') {
    return <div className="h-dvh bg-black" />;
  }

  if (appState.status === 'unregistered') {
    return (
      <RegistrationScreen
        deviceId={appState.deviceId}
        onComplete={(name) =>
          setAppState({ status: 'registered', deviceId: appState.deviceId, displayName: name })
        }
      />
    );
  }

  return <CameraScreen deviceId={appState.deviceId} displayName={appState.displayName} />;
}
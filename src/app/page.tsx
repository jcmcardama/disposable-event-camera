'use client';

import { useEffect, useState } from 'react';
import { getDeviceInfo } from '@/lib/indexeddb';
import { RegistrationScreen } from '@/components/registration/RegistrationScreen';
import { CameraScreen } from '@/components/camera/CameraScreen';
import { EventClosedScreen } from '@/components/event/EventClosedScreen';
import { processUploadQueue } from '@/lib/uploadQueue';

type EventStatus =
| { isOpen: true; reason: 'open'; eventStart: string; eventEnd: string; shotLimit: number }
| {
    isOpen: false;
    reason: 'disabled' | 'before-start' | 'after-end';
    eventStart: string;
    eventEnd: string;
    shotLimit: number;
  };

type AppState =
  | { status: 'checking' }
  | { status: 'unregistered'; deviceId: string }
  | { status: 'registered'; deviceId: string; displayName: string };

export default function Home() {
  const [appState, setAppState] = useState<AppState>({ status: 'checking' });
  const [eventStatus, setEventStatus] = useState<EventStatus | null>(null);

  useEffect(() => {
    async function init() {
      const [existing, statusResponse] = await Promise.all([
        getDeviceInfo(),
        fetch('/api/event-status').then((r) => r.json()),
      ]);

      setEventStatus(statusResponse);

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

    init();
    processUploadQueue();
  }, []);

  if (appState.status === 'checking' || eventStatus === null) {
    return <div className="h-dvh bg-black" />;
  }

  // Registration is still allowed even if the event is closed - a guest
  // arriving early can register in advance and land straight in the
  // camera the moment the window opens, without needing to fill in
  // their name again.
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

  if (!eventStatus.isOpen) {
    return <EventClosedScreen reason={eventStatus.reason} eventStart={eventStatus.eventStart} />;
  }

  return (
    <CameraScreen
      deviceId={appState.deviceId}
      displayName={appState.displayName}
      shotLimit={eventStatus.shotLimit}
    />
  );
}
'use client';

import { useEffect, useState } from 'react';
import { getDeviceInfo } from '@/lib/indexeddb';
import { RegistrationScreen } from '@/components/registration/RegistrationScreen';
import { CameraScreen } from '@/components/camera/CameraScreen';
import { EventClosedScreen } from '@/components/event/EventClosedScreen';
import { processUploadQueue } from '@/lib/uploadQueue';
import { Spinner } from '@/components/shared/Spinner';

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

  // Derived once per render - the effect below only reads this, never
  // eventStatus directly, so its dependency array can stay narrow
  // without triggering exhaustive-deps warnings.
  const isEventClosed = eventStatus !== null && !eventStatus.isOpen;

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

  useEffect(() => {
    if (!isEventClosed) return;

    // Re-check event status periodically while closed, so the app opens
    // itself automatically once the event window starts - no manual
    // reload needed. 30s is frequent enough to feel responsive without
    // hammering the endpoint.
    const interval = setInterval(async () => {
      const statusResponse = await fetch('/api/event-status').then((r) => r.json());
      setEventStatus(statusResponse);
    }, 30000);

    return () => clearInterval(interval);
  }, [isEventClosed]);

  useEffect(() => {
    // Two separate signals that the upload queue might need to resume:
    // 'online' fires on genuine reconnect; 'visibilitychange' fires when
    // the tab returns to foreground after being backgrounded (which can
    // pause in-flight backoff timers even without connectivity changing).
    // Merged into one effect since they're conceptually the same
    // response - "something changed, give the queue another chance" -
    // just triggered by two different browser events.
    function handleOnline() {
      processUploadQueue();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        processUploadQueue();
      }
    }

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  if (appState.status === 'checking' || eventStatus === null) {
    return (
      <div className="flex h-dvh items-center justify-center bg-black">
        <Spinner />
      </div>
    );
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

// Main admin dashboard: event controls, stats, health check, and reset
// actions. Fetches fresh data on mount; each control refetches relevant
// data after a successful action, keeping this simple rather than
// building a shared state/caching layer for a one-screen admin tool.

'use client';

import { useEffect, useState } from 'react';
import { Footer } from '../shared/Footer';

interface Settings {
  is_enabled: boolean;
  event_start: string;
  event_end: string;
  shot_limit: number;
}

interface Stats {
  totalDevices: number;
  totalPhotos: number;
  uploaded: number;
  failed: number;
  pending: number;
}

interface HealthStatus {
  healthy: boolean;
  checks: { database: boolean; storage: boolean; configuration: boolean };
}

export function AdminDashboard() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [resetDeviceId, setResetDeviceId] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function loadAll() {
    const [settingsRes, statsRes, healthRes] = await Promise.all([
      fetch('/api/admin/settings').then((r) => r.json()),
      fetch('/api/admin/stats').then((r) => r.json()),
      fetch('/api/health').then((r) => r.json()),
    ]);
    setSettings(settingsRes);
    setStats(statsRes);
    setHealth(healthRes);
  }

  useEffect(() => {
    // Effects that fetch data on mount should own their own async logic
    // rather than delegating to an outer function - this also lets us
    // add a `cancelled` guard, avoiding a setState call if the component
    // unmounts before the fetch resolves (e.g. navigating away quickly).
    let cancelled = false;

    async function loadInitial() {
        const [settingsRes, statsRes, healthRes] = await Promise.all([
        fetch('/api/admin/settings').then((r) => r.json()),
        fetch('/api/admin/stats').then((r) => r.json()),
        fetch('/api/health').then((r) => r.json()),
        ]);

        if (cancelled) return;
        setSettings(settingsRes);
        setStats(statsRes);
        setHealth(healthRes);
    }

    loadInitial();

    return () => {
        cancelled = true;
    };
  }, []);

  async function updateSettings(patch: Partial<Settings>) {
    setStatusMessage(null);
    const response = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (response.ok) {
      const updated = await response.json();
      setSettings(updated);
      setStatusMessage('Settings updated.');
    } else {
      setStatusMessage('Failed to update settings.');
    }
  }

  async function resetDevice() {
    if (!resetDeviceId.trim()) return;
    const response = await fetch('/api/admin/reset-device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: resetDeviceId.trim() }),
    });
    setStatusMessage(response.ok ? 'Device reset.' : 'Failed to reset device.');
    setResetDeviceId('');
    loadAll();
  }

  async function resetEvent() {
    if (!confirm('This deletes ALL devices and photos. Are you sure?')) return;
    const response = await fetch('/api/admin/reset-event', { method: 'POST' });
    setStatusMessage(response.ok ? 'Event reset.' : 'Failed to reset event.');
    loadAll();
  }

  if (!settings || !stats) {
    return <div className="p-6 text-white">Loading...</div>;
  }

  return (
    <div className="min-h-dvh space-y-8 bg-gray-950 p-6 text-white">
      <h1 className="text-xl font-semibold">Admin Dashboard</h1>

      {statusMessage && <p className="text-sm text-blue-400">{statusMessage}</p>}

      {/* Event Controls */}
      <section className="space-y-3 rounded-lg bg-gray-900 p-4">
        <h2 className="font-medium">Event Controls</h2>

        <div className="flex items-center justify-between">
          <span>Event enabled</span>
          <button
            onClick={() => updateSettings({ is_enabled: !settings.is_enabled })}
            className={`rounded-full px-4 py-1 text-sm ${settings.is_enabled ? 'bg-green-600' : 'bg-gray-700'}`}
          >
            {settings.is_enabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        <label className="block text-sm text-gray-400">
          Start time
          <div className="mt-1 rounded-md bg-gray-800 px-3 py-2">
            <input
              type="datetime-local"
              defaultValue={toLocalInputValue(settings.event_start)}
              onBlur={(e) => updateSettings({ event_start: new Date(e.target.value).toISOString() })}
              className="w-full text-white"
            />
          </div>
        </label>

        <label className="block text-sm text-gray-400">
          End time
          <div className="mt-1 rounded-md bg-gray-800 px-3 py-2">
            <input
              type="datetime-local"
              defaultValue={toLocalInputValue(settings.event_end)}
              onBlur={(e) => updateSettings({ event_end: new Date(e.target.value).toISOString() })}
              className="w-full text-white"
            />
          </div>
        </label>

        <label className="block text-sm text-gray-400">
          Shot limit
          <input
            type="number"
            min={1}
            defaultValue={settings.shot_limit}
            onBlur={(e) => updateSettings({ shot_limit: Number(e.target.value) })}
            className="mt-1 w-full rounded bg-gray-800 px-3 py-2 text-white"
          />
        </label>
      </section>

      {/* Stats */}
      <section className="rounded-lg bg-gray-900 p-4">
        <h2 className="mb-3 font-medium">Upload Statistics</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Stat label="Devices" value={stats.totalDevices} />
          <Stat label="Total Photos" value={stats.totalPhotos} />
          <Stat label="Uploaded" value={stats.uploaded} />
          <Stat label="Failed" value={stats.failed} />
          <Stat label="Pending" value={stats.pending} />
        </div>
      </section>

      {/* Health Check */}
      <section className="rounded-lg bg-gray-900 p-4">
        <h2 className="mb-3 font-medium">Health Check</h2>
        {health && (
          <div className="space-y-1 text-sm">
            <HealthRow label="Database" ok={health.checks.database} />
            <HealthRow label="Storage" ok={health.checks.storage} />
            <HealthRow label="Configuration" ok={health.checks.configuration} />
          </div>
        )}
        <button onClick={loadAll} className="mt-3 rounded bg-gray-800 px-3 py-2 text-sm">
          Refresh
        </button>
      </section>

      {/* Reset Actions */}
      <section className="space-y-3 rounded-lg bg-gray-900 p-4">
        <h2 className="font-medium">Reset</h2>

        <div className="flex gap-2">
          <input
            value={resetDeviceId}
            onChange={(e) => setResetDeviceId(e.target.value)}
            placeholder="Device UUID"
            className="flex-1 rounded bg-gray-800 px-3 py-2 text-sm text-white"
          />
          <button onClick={resetDevice} className="rounded bg-yellow-700 px-3 py-2 text-sm">
            Reset device
          </button>
        </div>

        <button onClick={resetEvent} className="w-full rounded bg-red-900 px-3 py-2 text-sm">
          Reset entire event (deletes all devices + photos)
        </button>
      </section>
      <Footer />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded bg-gray-800 p-3">
      <div className="text-gray-400">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function HealthRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className={ok ? 'text-green-400' : 'text-red-400'}>{ok ? 'OK' : 'Failed'}</span>
    </div>
  );
}

// Converts an ISO timestamp to the local-time string <input type="datetime-local">
// expects (YYYY-MM-DDTHH:mm), since the input doesn't understand ISO/UTC directly.
function toLocalInputValue(isoString: string): string {
  const date = new Date(isoString);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}
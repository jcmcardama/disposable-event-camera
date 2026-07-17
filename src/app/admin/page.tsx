'use client';

import { useEffect, useState } from 'react';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true); // avoids flashing the login form while cheking the session
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/admin/session')
      .then((r) => r.json())
      .then((data) => setIsAuthenticated(data.authenticated))
      .finally(() => setIsCheckingSession(false));
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        setError('Incorrect password.');
        return;
      }

      setIsAuthenticated(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isCheckingSession) {
    return <div className="h-dvh bg-gray-950" />;
  }

  if (isAuthenticated) {
    return <AdminDashboard />;
  }

  return (
    <div className="flex h-dvh flex-col items-center justify-center bg-gray-950 px-6 text-white">
      <h1 className="mb-6 text-xl font-semibold">Admin Login</h1>
      <form onSubmit={handleLogin} className="w-full max-w-xs">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          disabled={isSubmitting}
          className="w-full rounded-lg bg-gray-800 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-white"
        />
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-4 w-full rounded-lg bg-white py-3 font-medium text-black disabled:opacity-50"
        >
          {isSubmitting ? 'Checking...' : 'Log in'}
        </button>
      </form>
    </div>
  );
}
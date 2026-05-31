'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RegisterClubForm() {
  const [clubName, setClubName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clubName, adminName, phone, password }),
      });
      if (res.ok) {
        router.push('/matches');
        router.refresh();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Could not register club');
    } catch {
      setError('Network error. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-neutral-500">
          Club name
        </span>
        <input
          type="text"
          value={clubName}
          onChange={(e) => setClubName(e.target.value)}
          className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base outline-none transition focus:border-neutral-950"
          required
          autoComplete="organization"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-neutral-500">
          Admin name
        </span>
        <input
          type="text"
          value={adminName}
          onChange={(e) => setAdminName(e.target.value)}
          className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base outline-none transition focus:border-neutral-950"
          required
          autoComplete="name"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-neutral-500">
          Admin phone number
        </span>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base outline-none transition focus:border-neutral-950"
          required
          autoComplete="tel"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-neutral-500">
          Password
        </span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base outline-none transition focus:border-neutral-950"
          required
          autoComplete="new-password"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-neutral-950 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
      >
        {busy ? 'Creating...' : 'Create club'}
      </button>
    </form>
  );
}

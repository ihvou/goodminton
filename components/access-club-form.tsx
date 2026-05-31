'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AccessClubForm() {
  const [accessCode, setAccessCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function openClub(code: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode: code }),
      });
      if (res.ok) {
        router.push('/matches');
        router.refresh();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Club not found');
    } catch {
      setError('Network error. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm pt-12">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">Goodminton</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Enter the club admin phone number to view scores and stats.
        </p>
      </div>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void openClub(accessCode);
        }}
      >
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-neutral-500">
            Admin phone number
          </span>
          <input
            type="tel"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base outline-none transition focus:border-neutral-950"
            autoComplete="tel"
            required
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-neutral-950 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
        >
          {busy ? 'Opening...' : 'Open club'}
        </button>
      </form>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void openClub('demo')}
          className="rounded-xl border border-neutral-200 px-3 py-3 text-sm font-medium text-neutral-700 transition hover:border-neutral-950 hover:text-neutral-950 disabled:opacity-50"
        >
          Demo club
        </button>
        <Link
          href="/register"
          className="rounded-xl border border-neutral-200 px-3 py-3 text-center text-sm font-medium text-neutral-700 transition hover:border-neutral-950 hover:text-neutral-950"
        >
          Register new club
        </Link>
      </div>
    </div>
  );
}

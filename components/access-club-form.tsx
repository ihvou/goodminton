'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';
import { ClubIcon } from '@/components/club-icon';
import type { PublicClub } from '@/lib/queries';

type Mode = 'member' | 'admin';

export function AccessClubForm({ clubs }: { clubs: PublicClub[] }) {
  const [selectedClub, setSelectedClub] = useState<PublicClub | null>(null);
  const [mode, setMode] = useState<Mode>('member');
  const [accessCode, setAccessCode] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function selectClub(club: PublicClub) {
    setSelectedClub(club);
    setMode('member');
    setAccessCode('');
    setPhone('');
    setPassword('');
    setError(null);
  }

  async function openClub() {
    if (!selectedClub) return;
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubId: selectedClub.id,
          accessCode,
        }),
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

  async function loginAdmin() {
    if (!selectedClub) return;
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubId: selectedClub.id,
          phone,
          password,
        }),
      });
      if (res.ok) {
        router.push('/matches');
        router.refresh();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Wrong phone or password');
    } catch {
      setError('Network error. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const activeInputClass =
    'w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base outline-none transition focus:border-neutral-950';

  return (
    <div className="mx-auto max-w-md pt-10">
      <div className="mb-7">
        <h1 className="text-xl font-semibold tracking-tight">Goodminton</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Pick a club to view scores or sign in as its admin.
        </p>
      </div>

      {!selectedClub ? (
        <div className="space-y-3">
          {clubs.map((club) => (
            <button
              key={club.id}
              type="button"
              onClick={() => selectClub(club)}
              className="flex w-full items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-left transition hover:border-neutral-950 focus:border-neutral-950 focus:outline-none"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-white">
                <ClubIcon icon={club.icon} size={21} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-semibold">
                  {club.name}
                </span>
                {club.isDemo && (
                  <span className="mt-0.5 block text-xs font-medium text-neutral-500">
                    Demo
                  </span>
                )}
              </span>
            </button>
          ))}
          <Link
            href="/register"
            className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-neutral-300 bg-white p-4 text-left text-neutral-700 transition hover:border-neutral-950 hover:text-neutral-950"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-neutral-200">
              <Plus size={20} aria-hidden="true" />
            </span>
            <span className="text-base font-semibold">Register new club</span>
          </Link>
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => {
              setSelectedClub(null);
              setError(null);
            }}
            className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Clubs
          </button>

          <div className="mb-5 flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-white">
              <ClubIcon icon={selectedClub.icon} size={21} />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold tracking-tight">
                {selectedClub.name}
              </h2>
              <p className="text-sm text-neutral-500">
                {mode === 'member' ? 'Enter as member' : 'Enter as admin'}
              </p>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-2 rounded-xl bg-neutral-100 p-1">
            {(['member', 'admin'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setMode(option);
                  setError(null);
                }}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  mode === option
                    ? 'bg-white text-neutral-950 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-950'
                }`}
              >
                {option === 'member' ? 'Member' : 'Admin'}
              </button>
            ))}
          </div>

          {mode === 'member' ? (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void openClub();
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
                  className={activeInputClass}
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
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void loginAdmin();
              }}
            >
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-neutral-500">
                  Phone number
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={activeInputClass}
                  autoComplete="tel"
                  required
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
                  className={activeInputClass}
                  autoComplete="current-password"
                  required
                />
              </label>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-neutral-950 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
              >
                {busy ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

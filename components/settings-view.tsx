'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateClubSettings } from '@/lib/actions';
import {
  ROTATION_ALGORITHMS,
  WEEKDAY_OPTIONS,
  type ClubSettings,
  type RotationAlgorithm,
} from '@/lib/club-settings';
import { cn } from '@/lib/utils';

export function SettingsView({ settings }: { settings: ClubSettings }) {
  const router = useRouter();
  const [playWeekdays, setPlayWeekdays] = useState<number[]>(
    settings.playWeekdays,
  );
  const [rotationAlgorithm, setRotationAlgorithm] =
    useState<RotationAlgorithm>(settings.rotationAlgorithm);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleWeekday(day: number) {
    setMessage(null);
    setPlayWeekdays((current) => {
      if (current.includes(day)) {
        const next = current.filter((item) => item !== day);
        return next.length > 0 ? next : current;
      }
      return [...current, day];
    });
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      try {
        await updateClubSettings({ playWeekdays, rotationAlgorithm });
        setMessage('Saved');
        router.refresh();
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Could not save');
      }
    });
  }

  return (
    <div className="space-y-5 pt-4 pb-24">
      <div>
        <h1 className="text-base font-semibold tracking-tight">Configuration</h1>
        <p className="text-xs text-neutral-500">Club setup</p>
      </div>

      <section className="space-y-2">
        <h2 className="text-xs font-medium text-neutral-500">Match days</h2>
        <div className="grid grid-cols-7 gap-2">
          {WEEKDAY_OPTIONS.map((day) => {
            const selected = playWeekdays.includes(day.value);
            return (
              <button
                key={day.value}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleWeekday(day.value)}
                className={cn(
                  'aspect-square rounded-xl border text-xs font-semibold transition',
                  selected
                    ? 'border-neutral-950 bg-neutral-950 text-white'
                    : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-950 hover:text-neutral-950',
                )}
              >
                {day.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-medium text-neutral-500">Rotation</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {ROTATION_ALGORITHMS.map((algorithm) => {
            const selected = rotationAlgorithm === algorithm.value;
            return (
              <button
                key={algorithm.value}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setRotationAlgorithm(algorithm.value);
                  setMessage(null);
                }}
                className={cn(
                  'rounded-xl border px-3 py-3 text-sm font-semibold transition',
                  selected
                    ? 'border-neutral-950 bg-neutral-950 text-white'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-950 hover:text-neutral-950',
                )}
              >
                {algorithm.label}
              </button>
            );
          })}
        </div>
      </section>

      {message && (
        <p
          className={cn(
            'text-sm',
            message === 'Saved' ? 'text-emerald-600' : 'text-red-600',
          )}
        >
          {message}
        </p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="w-full rounded-xl bg-neutral-950 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
      >
        {pending ? 'Saving...' : 'Save settings'}
      </button>
    </div>
  );
}

'use client';

import { useCallback, useState } from 'react';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { DayMatch } from '@/lib/queries';
import type { Member } from '@/lib/members';
import { MemberPicker } from './member-picker';
import { MatchCard } from './match-card';
import { DraftMatchCard } from './draft-match-card';
import { DayStrip, type DayItem } from './day-strip';
import { formatLong, fromIsoDate } from '@/lib/dates';

type PickerState = {
  excludeIds: string[];
  selectedId: string | null;
  onPick: (m: Member) => void;
} | null;

export function MatchesView({
  selectedDate,
  dayList,
  matches,
  isAdmin,
}: {
  selectedDate: string;
  dayList: DayItem[];
  matches: DayMatch[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [picker, setPicker] = useState<PickerState>(null);
  const [drafts, setDrafts] = useState<string[]>([]);

  const openPicker = useCallback((args: NonNullable<PickerState>) => {
    setPicker(args);
  }, []);

  const closePicker = useCallback(() => {
    setPicker(null);
  }, []);

  function addDraft() {
    setDrafts((d) => [...d, crypto.randomUUID()]);
  }

  function removeDraft(id: string) {
    setDrafts((d) => d.filter((x) => x !== id));
    setPicker(null);
  }

  function onSelectDay(iso: string) {
    setPicker(null);
    setDrafts([]);
    if (iso === selectedDate) return;
    const params = new URLSearchParams();
    params.set('d', iso);
    router.push('/?' + params.toString());
  }

  const total = matches.length;

  return (
    <div className="pb-24">
      <DayStrip days={dayList} selected={selectedDate} onSelect={onSelectDay} />

      <div className="mt-4 flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-base font-semibold tracking-tight">
            {formatLong(fromIsoDate(selectedDate))}
          </div>
          <div className="text-xs text-neutral-500">
            {total === 0
              ? 'no matches yet'
              : total === 1
                ? '1 match'
                : `${total} matches`}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {matches.map((m) => (
          <MatchCard
            key={m.id}
            match={m}
            playDate={selectedDate}
            isAdmin={isAdmin}
            openPicker={openPicker}
            closePicker={closePicker}
          />
        ))}
        {drafts.map((draftId) => (
          <DraftMatchCard
            key={draftId}
            playDate={selectedDate}
            onCancel={() => removeDraft(draftId)}
            onSaved={() => removeDraft(draftId)}
            openPicker={openPicker}
            closePicker={closePicker}
          />
        ))}
      </div>

      {isAdmin && (
        <button
          type="button"
          onClick={addDraft}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-neutral-300 bg-white py-4 text-sm font-medium text-neutral-700 transition hover:border-neutral-950 hover:text-neutral-950"
        >
          <Plus size={16} />
          Add match
        </button>
      )}

      {!isAdmin && total === 0 && (
        <div className="mt-12 text-center text-sm text-neutral-400">
          No matches recorded for this day.
        </div>
      )}

      <MemberPicker
        open={picker !== null}
        excludeIds={picker?.excludeIds ?? []}
        selectedId={picker?.selectedId ?? null}
        onPick={(member) => picker?.onPick(member)}
        onClose={closePicker}
      />
    </div>
  );
}

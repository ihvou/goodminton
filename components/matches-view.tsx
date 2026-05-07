'use client';

import { useCallback, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { DayMatch, MatchWithDate } from '@/lib/queries';
import type { Member } from '@/lib/members';
import type { LineupLike } from '@/lib/auto-teams';
import { MemberPicker } from './member-picker';
import { MatchCard } from './match-card';
import { DraftMatchCard } from './draft-match-card';
import { DayStrip, type DayItem } from './day-strip';
import { formatLong, fromIsoDate } from '@/lib/dates';

type PickerState = {
  members: Member[];
  excludeIds: string[];
  selectedId: string | null;
  onPick: (m: Member) => void;
  onSuggest?: () => void;
  suggestDisabled?: boolean;
} | null;

type PickerArgs = Omit<NonNullable<PickerState>, 'members'> & {
  members?: Member[];
};

export function MatchesView({
  selectedDate,
  dayList,
  matches,
  allMatches,
  members,
  isAdmin,
}: {
  selectedDate: string;
  dayList: DayItem[];
  matches: DayMatch[];
  allMatches: MatchWithDate[];
  members: Member[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [picker, setPicker] = useState<PickerState>(null);
  const [drafts, setDrafts] = useState<string[]>([]);
  const [draftLineups, setDraftLineups] = useState<Record<string, LineupLike>>(
    {},
  );
  const playingMembers = useMemo(
    () => members.filter((member) => member.isPlaying),
    [members],
  );

  const openPicker = useCallback(
    (args: PickerArgs) => {
      const { members: pickerMembers, ...rest } = args;
      setPicker({ ...rest, members: pickerMembers ?? members });
    },
    [members],
  );

  const closePicker = useCallback(() => {
    setPicker(null);
  }, []);

  function addDraft() {
    setDrafts((d) => [...d, crypto.randomUUID()]);
  }

  function removeDraft(id: string) {
    setDrafts((d) => d.filter((x) => x !== id));
    setDraftLineups((lineups) => {
      const next = { ...lineups };
      delete next[id];
      return next;
    });
    setPicker(null);
  }

  function onSelectDay(iso: string) {
    setPicker(null);
    setDrafts([]);
    setDraftLineups({});
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
            members={members}
            isAdmin={isAdmin}
            openPicker={openPicker}
            closePicker={closePicker}
          />
        ))}
        {drafts.map((draftId) => (
          <DraftMatchCard
            key={draftId}
            playDate={selectedDate}
            members={playingMembers}
            dayMatches={matches}
            reservedLineups={Object.entries(draftLineups)
              .filter(([id]) => id !== draftId)
              .map(([, lineup]) => lineup)}
            allMatches={allMatches}
            onLineupChange={(lineup) => {
              setDraftLineups((lineups) => {
                if (!lineup) {
                  const next = { ...lineups };
                  delete next[draftId];
                  return next;
                }
                return { ...lineups, [draftId]: lineup };
              });
            }}
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
        members={picker?.members ?? []}
        excludeIds={picker?.excludeIds ?? []}
        selectedId={picker?.selectedId ?? null}
        onPick={(member) => picker?.onPick(member)}
        onSuggest={picker?.onSuggest}
        suggestDisabled={picker?.suggestDisabled}
        onClose={closePicker}
      />
    </div>
  );
}

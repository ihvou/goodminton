'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { X } from 'lucide-react';
import { getMemberOrFallback, type Member } from '@/lib/members';
import type { DayMatch, MatchWithDate } from '@/lib/queries';
import { suggestTeams } from '@/lib/auto-teams';
import { Avatar } from './avatar';
import { cn } from '@/lib/utils';
import { createMatch } from '@/lib/actions';

const SLOTS = ['teamAP1', 'teamAP2', 'teamBP1', 'teamBP2'] as const;
type Slot = (typeof SLOTS)[number];
type Field = Slot | 'scoreA' | 'scoreB';
const ORDER: Field[] = [
  'teamAP1',
  'teamAP2',
  'scoreA',
  'teamBP1',
  'teamBP2',
  'scoreB',
];

type Draft = {
  teamAP1: string | null;
  teamAP2: string | null;
  teamBP1: string | null;
  teamBP2: string | null;
  scoreA: string;
  scoreB: string;
};

const EMPTY: Draft = {
  teamAP1: null,
  teamAP2: null,
  teamBP1: null,
  teamBP2: null,
  scoreA: '',
  scoreB: '',
};

function nextEmpty(d: Draft): Field | null {
  for (const f of ORDER) {
    if (f === 'scoreA' || f === 'scoreB') {
      if (d[f] === '') return f;
    } else if (d[f] === null) return f;
  }
  return null;
}

function buildExclude(d: Draft, except: Slot): string[] {
  const out: string[] = [];
  for (const s of SLOTS) {
    if (s === except) continue;
    const id = d[s];
    if (id) out.push(id);
  }
  return out;
}

type PickerArgs = {
  members?: Member[];
  excludeIds: string[];
  selectedId: string | null;
  onPick: (m: Member) => void;
  onSuggest?: () => void;
  suggestDisabled?: boolean;
};

export function DraftMatchCard({
  playDate,
  members,
  dayMatches,
  allMatches,
  onCancel,
  onSaved,
  openPicker,
  closePicker,
}: {
  playDate: string;
  members: Member[];
  dayMatches: DayMatch[];
  allMatches: MatchWithDate[];
  onCancel: () => void;
  onSaved: () => void;
  openPicker: (args: PickerArgs) => void;
  closePicker: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [active, setActive] = useState<Field>('teamAP1');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const scoreARef = useRef<HTMLInputElement>(null);
  const scoreBRef = useRef<HTMLInputElement>(null);

  function focusScore(field: 'scoreA' | 'scoreB') {
    const ref = field === 'scoreA' ? scoreARef : scoreBRef;
    ref.current?.focus();
    ref.current?.select();
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.select();
    });
  }

  function openSlotPicker(slot: Slot, snapshot: Draft) {
    setActive(slot);
    openPicker({
      members,
      excludeIds: buildExclude(snapshot, slot),
      selectedId: snapshot[slot],
      onSuggest: () => applySuggestion(snapshot),
      suggestDisabled: members.length < 4,
      onPick: (member) => {
        const newDraft = { ...snapshot, [slot]: member.id };
        setDraft(newDraft);
        const next = nextEmpty(newDraft);
        if (next === null) {
          closePicker();
          tryAutoSave(newDraft);
        } else if (next === 'scoreA' || next === 'scoreB') {
          setActive(next);
          focusScore(next);
          closePicker();
        } else {
          openSlotPicker(next, newDraft);
        }
      },
    });
  }

  function applySuggestion(snapshot: Draft) {
    const suggestion = suggestTeams({
      members,
      dayMatches,
      allMatches,
    });

    if (!suggestion) {
      setError('Select at least 4 playing players');
      return;
    }

    const newDraft: Draft = {
      ...snapshot,
      teamAP1: suggestion.teamA[0],
      teamAP2: suggestion.teamA[1],
      teamBP1: suggestion.teamB[0],
      teamBP2: suggestion.teamB[1],
    };
    setDraft(newDraft);
    setError(null);

    const next = nextEmpty(newDraft);
    if (next === null) {
      closePicker();
      tryAutoSave(newDraft);
    } else if (next === 'scoreA' || next === 'scoreB') {
      setActive(next);
      closePicker();
      focusScore(next);
    } else {
      openSlotPicker(next, newDraft);
    }
  }

  useEffect(() => {
    openSlotPicker('teamAP1', EMPTY);
    return () => closePicker();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onTapSlot(slot: Slot) {
    openSlotPicker(slot, draft);
  }

  function onScoreChange(side: 'A' | 'B', v: string) {
    const cleaned = v.replace(/\D/g, '').slice(0, 3);
    setDraft((d) => ({ ...d, [side === 'A' ? 'scoreA' : 'scoreB']: cleaned }));
    setError(null);
  }

  function onScoreCommit(side: 'A' | 'B') {
    const current: Draft = {
      ...draft,
      [side === 'A' ? 'scoreA' : 'scoreB']:
        side === 'A' ? draft.scoreA : draft.scoreB,
    };
    const next = nextEmpty(current);
    if (next === null) {
      tryAutoSave(current);
    } else if (next === 'scoreA' || next === 'scoreB') {
      setActive(next);
      focusScore(next);
    } else {
      openSlotPicker(next, current);
    }
  }

  function tryAutoSave(d: Draft) {
    if (!d.teamAP1 || !d.teamAP2 || !d.teamBP1 || !d.teamBP2) return;
    if (d.scoreA === '' || d.scoreB === '') return;
    const a = parseInt(d.scoreA, 10);
    const b = parseInt(d.scoreB, 10);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return;
    if (a === b) {
      setError('One team must win');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await createMatch({
          playDate,
          teamAP1: d.teamAP1!,
          teamAP2: d.teamAP2!,
          teamBP1: d.teamBP1!,
          teamBP2: d.teamBP2!,
          scoreA: a,
          scoreB: b,
        });
        onSaved();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save');
      }
    });
  }

  return (
    <article
      className={cn(
        'relative rounded-2xl border-2 border-dashed border-neutral-300 bg-white p-4 pr-12 transition',
        pending && 'opacity-60',
      )}
    >
      <button
        type="button"
        onClick={() => {
          closePicker();
          onCancel();
        }}
        className="absolute right-3 top-3 rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
        aria-label="Cancel"
      >
        <X size={14} />
      </button>
      <DraftRow
        label="A"
        slot1="teamAP1"
        slot2="teamAP2"
        scoreField="scoreA"
        scoreRef={scoreARef}
        draft={draft}
        active={active}
        onTapSlot={onTapSlot}
        onScoreChange={(v) => onScoreChange('A', v)}
        onScoreCommit={() => onScoreCommit('A')}
        members={members}
      />
      <div className="my-2 h-px bg-neutral-100" />
      <DraftRow
        label="B"
        slot1="teamBP1"
        slot2="teamBP2"
        scoreField="scoreB"
        scoreRef={scoreBRef}
        draft={draft}
        active={active}
        onTapSlot={onTapSlot}
        onScoreChange={(v) => onScoreChange('B', v)}
        onScoreCommit={() => onScoreCommit('B')}
        members={members}
      />
      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
    </article>
  );
}

function DraftRow({
  label,
  slot1,
  slot2,
  scoreField,
  scoreRef,
  draft,
  active,
  onTapSlot,
  onScoreChange,
  onScoreCommit,
  members,
}: {
  label: 'A' | 'B';
  slot1: Slot;
  slot2: Slot;
  scoreField: 'scoreA' | 'scoreB';
  scoreRef: React.RefObject<HTMLInputElement | null>;
  draft: Draft;
  active: Field;
  onTapSlot: (slot: Slot) => void;
  onScoreChange: (v: string) => void;
  onScoreCommit: () => void;
  members: Member[];
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-4 text-xs uppercase text-neutral-400">{label}</span>
      <div className="flex flex-1 items-center gap-2">
        <DraftSlot
          memberId={draft[slot1]}
          isActive={active === slot1}
          onTap={() => onTapSlot(slot1)}
          members={members}
        />
        <DraftSlot
          memberId={draft[slot2]}
          isActive={active === slot2}
          onTap={() => onTapSlot(slot2)}
          members={members}
        />
      </div>
      <input
        ref={scoreRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={draft[scoreField]}
        placeholder="—"
        onChange={(e) => onScoreChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            onScoreCommit();
          }
        }}
        onBlur={() => {
          if (draft[scoreField] !== '') onScoreCommit();
        }}
        className={cn(
          'w-12 shrink-0 rounded-md py-1 text-right text-base tabular-nums outline-none transition placeholder:text-neutral-300',
          active === scoreField
            ? 'bg-neutral-100 ring-1 ring-neutral-950'
            : 'bg-transparent',
          'focus:bg-neutral-100',
        )}
      />
    </div>
  );
}

function DraftSlot({
  memberId,
  isActive,
  onTap,
  members,
}: {
  memberId: string | null;
  isActive: boolean;
  onTap: () => void;
  members: Member[];
}) {
  if (memberId) {
    const member = getMemberOrFallback(memberId, members);
    return (
      <button
        type="button"
        onClick={onTap}
        className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg p-1 text-left hover:bg-neutral-100"
      >
        <Avatar member={member} size="xs" />
        <span className="truncate text-sm">{member.name}</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onTap}
      className={cn(
        'flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-dashed p-1 text-left text-xs transition',
        isActive
          ? 'border-neutral-950 bg-neutral-50 text-neutral-700'
          : 'border-neutral-300 text-neutral-400 hover:bg-neutral-50',
      )}
    >
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-neutral-300">
        +
      </span>
      <span className="truncate">Player</span>
    </button>
  );
}

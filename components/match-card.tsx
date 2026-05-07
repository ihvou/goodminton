'use client';

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import type { DayMatch } from '@/lib/queries';
import { getMemberOrFallback, type Member } from '@/lib/members';
import { Avatar } from './avatar';
import { cn } from '@/lib/utils';
import { updateMatch, deleteMatch } from '@/lib/actions';

type Slot = 'teamAP1' | 'teamAP2' | 'teamBP1' | 'teamBP2';
const SLOTS: Slot[] = ['teamAP1', 'teamAP2', 'teamBP1', 'teamBP2'];

export function MatchCard({
  match,
  playDate,
  members,
  isAdmin,
  openPicker,
  closePicker,
}: {
  match: DayMatch;
  playDate: string;
  members: Member[];
  isAdmin: boolean;
  openPicker: (args: {
    excludeIds: string[];
    selectedId: string | null;
    onPick: (m: Member) => void;
  }) => void;
  closePicker: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const hasScores = match.scoreA !== null && match.scoreB !== null;
  const aWon = hasScores ? match.scoreA! > match.scoreB! : false;

  function tapSlot(slot: Slot) {
    if (!isAdmin) return;
    const ids = SLOTS.map((s) => match[s]);
    const exclude = ids.filter((_, i) => SLOTS[i] !== slot);
    openPicker({
      excludeIds: exclude,
      selectedId: match[slot],
      onPick: (member) => {
        closePicker();
        if (member.id === match[slot]) return;
        setError(null);
        startTransition(async () => {
          try {
            await updateMatch({ id: match.id, [slot]: member.id });
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to save');
          }
        });
      },
    });
  }

  function setScore(side: 'A' | 'B', value: number | null) {
    const current = side === 'A' ? match.scoreA : match.scoreB;
    if (value === current) return;
    setError(null);
    startTransition(async () => {
      try {
        await updateMatch({
          id: match.id,
          ...(side === 'A' ? { scoreA: value } : { scoreB: value }),
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save');
      }
    });
  }

  function onDelete() {
    if (!confirm('Delete this match? Stats will recalculate.')) return;
    startTransition(async () => {
      try {
        await deleteMatch({ id: match.id, playDate });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to delete');
      }
    });
  }

  return (
    <article
      className={cn(
        'relative rounded-2xl border border-neutral-200 bg-white p-4 transition',
        pending && 'opacity-60',
      )}
    >
      <TeamRow
        label="A"
        won={aWon}
        score={match.scoreA}
        p1Id={match.teamAP1}
        p2Id={match.teamAP2}
        onTapP1={() => tapSlot('teamAP1')}
        onTapP2={() => tapSlot('teamAP2')}
        onScoreChange={(v) => setScore('A', v)}
        editable={isAdmin}
        members={members}
      />
      <div className="my-2 h-px bg-neutral-100" />
      <TeamRow
        label="B"
        won={hasScores && !aWon}
        score={match.scoreB}
        p1Id={match.teamBP1}
        p2Id={match.teamBP2}
        onTapP1={() => tapSlot('teamBP1')}
        onTapP2={() => tapSlot('teamBP2')}
        onScoreChange={(v) => setScore('B', v)}
        editable={isAdmin}
        members={members}
      />
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {isAdmin && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            <Trash2 size={13} />
            Delete
          </button>
        </div>
      )}
    </article>
  );
}

function TeamRow({
  label,
  won,
  score,
  p1Id,
  p2Id,
  onTapP1,
  onTapP2,
  onScoreChange,
  editable,
  members,
}: {
  label: 'A' | 'B';
  won: boolean;
  score: number | null;
  p1Id: string;
  p2Id: string;
  onTapP1: () => void;
  onTapP2: () => void;
  onScoreChange: (v: number | null) => void;
  editable: boolean;
  members: Member[];
}) {
  const p1 = getMemberOrFallback(p1Id, members);
  const p2 = getMemberOrFallback(p2Id, members);
  return (
    <div className={cn('flex items-center gap-3', won && 'font-semibold')}>
      <span
        className={cn(
          'w-4 text-xs uppercase',
          won ? 'text-neutral-950' : 'text-neutral-400',
        )}
      >
        {label}
      </span>
      <div className="flex flex-1 items-center gap-2">
        <PlayerSlot member={p1} onTap={onTapP1} editable={editable} />
        <PlayerSlot member={p2} onTap={onTapP2} editable={editable} />
      </div>
      <ScoreInput
        value={score}
        onChange={onScoreChange}
        editable={editable}
        won={won}
      />
    </div>
  );
}

function PlayerSlot({
  member,
  onTap,
  editable,
}: {
  member: Member;
  onTap: () => void;
  editable: boolean;
}) {
  const Comp = editable ? 'button' : 'div';
  return (
    <Comp
      {...(editable ? { type: 'button' as const, onClick: onTap } : {})}
      className={cn(
        'flex min-w-0 flex-1 items-center gap-1.5 rounded-lg p-1 text-left transition',
        editable && 'hover:bg-neutral-100',
      )}
    >
      <Avatar member={member} size="xs" />
      <span className="truncate text-sm">{member.name}</span>
    </Comp>
  );
}

function ScoreInput({
  value,
  onChange,
  editable,
  won,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  editable: boolean;
  won: boolean;
}) {
  const valueText = value === null ? '' : String(value);
  const [draft, setDraft] = useState(valueText);
  const [focused, setFocused] = useState(false);

  if (!focused && draft !== valueText) {
    setDraft(valueText);
  }

  if (!editable) {
    return (
      <span
        className={cn(
          'w-12 text-right text-base tabular-nums text-neutral-950',
          value === null && 'text-neutral-300',
          won && 'font-semibold',
        )}
      >
        {value ?? '—'}
      </span>
    );
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={draft}
      placeholder="—"
      onChange={(e) => setDraft(e.target.value.replace(/\D/g, '').slice(0, 3))}
      onFocus={(e) => {
        setFocused(true);
        e.currentTarget.select();
      }}
      onBlur={() => {
        setFocused(false);
        if (draft === '') {
          if (value !== null) onChange(null);
          return;
        }
        const n = parseInt(draft, 10);
        if (Number.isFinite(n) && n !== value && n >= 0) onChange(n);
        else setDraft(valueText);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      className={cn(
        'w-12 rounded-md py-1 text-right text-base tabular-nums outline-none transition placeholder:text-neutral-300 focus:bg-neutral-100',
        won && 'font-semibold',
      )}
    />
  );
}

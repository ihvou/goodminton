'use client';

import { useState, useTransition } from 'react';
import { MoreHorizontal, Trash2 } from 'lucide-react';
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
  isAdmin,
  openPicker,
  closePicker,
}: {
  match: DayMatch;
  playDate: string;
  isAdmin: boolean;
  openPicker: (args: {
    excludeIds: string[];
    selectedId: string | null;
    onPick: (m: Member) => void;
  }) => void;
  closePicker: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const aWon = match.scoreA > match.scoreB;

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

  function setScore(side: 'A' | 'B', value: number) {
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
    setMenuOpen(false);
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
      />
      <div className="my-2 h-px bg-neutral-100" />
      <TeamRow
        label="B"
        won={!aWon}
        score={match.scoreB}
        p1Id={match.teamBP1}
        p2Id={match.teamBP2}
        onTapP1={() => tapSlot('teamBP1')}
        onTapP2={() => tapSlot('teamBP2')}
        onScoreChange={(v) => setScore('B', v)}
        editable={isAdmin}
      />
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {isAdmin && (
        <div className="absolute right-3 top-3">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Match options"
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-10 cursor-default"
              />
              <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded-xl border border-neutral-200 bg-white p-1 shadow-lg">
                <button
                  type="button"
                  onClick={onDelete}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-neutral-100"
                >
                  <Trash2 size={14} />
                  Delete match
                </button>
              </div>
            </>
          )}
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
}: {
  label: 'A' | 'B';
  won: boolean;
  score: number;
  p1Id: string;
  p2Id: string;
  onTapP1: () => void;
  onTapP2: () => void;
  onScoreChange: (v: number) => void;
  editable: boolean;
}) {
  const p1 = getMemberOrFallback(p1Id);
  const p2 = getMemberOrFallback(p2Id);
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
  value: number;
  onChange: (v: number) => void;
  editable: boolean;
  won: boolean;
}) {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);

  if (!focused && draft !== String(value)) {
    setDraft(String(value));
  }

  if (!editable) {
    return (
      <span
        className={cn(
          'w-12 text-right text-base tabular-nums',
          won && 'font-semibold',
        )}
      >
        {value}
      </span>
    );
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={draft}
      onChange={(e) => setDraft(e.target.value.replace(/\D/g, '').slice(0, 3))}
      onFocus={(e) => {
        setFocused(true);
        e.currentTarget.select();
      }}
      onBlur={() => {
        setFocused(false);
        const n = parseInt(draft, 10);
        if (Number.isFinite(n) && n !== value && n >= 0) onChange(n);
        else setDraft(String(value));
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      className={cn(
        'w-12 rounded-md py-1 text-right text-base tabular-nums outline-none transition focus:bg-neutral-100',
        won && 'font-semibold',
      )}
    />
  );
}

'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';
import { Shuffle, X } from 'lucide-react';
import type { DayTeam } from '@/lib/queries';
import { getMemberOrFallback, sortMembers, type Member } from '@/lib/members';
import { Avatar } from './avatar';
import { cn } from '@/lib/utils';

const noopSubscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function MemberPicker({
  open,
  members,
  excludeIds,
  selectedId,
  onPick,
  teams = [],
  allMembers,
  teamExcludeIds,
  onPickTeam,
  onSuggest,
  suggestDisabled = false,
  onClose,
}: {
  open: boolean;
  members: Member[];
  excludeIds: string[];
  selectedId: string | null;
  onPick: (member: Member) => void;
  teams?: DayTeam[];
  allMembers?: Member[];
  teamExcludeIds?: string[];
  onPickTeam?: (team: DayTeam) => void;
  onSuggest?: () => void;
  suggestDisabled?: boolean;
  onClose: () => void;
}) {
  const mounted = useSyncExternalStore(
    noopSubscribe,
    clientSnapshot,
    serverSnapshot,
  );
  const [tab, setTab] = useState<'players' | 'teams'>('players');
  const sorted = useMemo(() => sortMembers(members), [members]);
  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => a.position - b.position),
    [teams],
  );
  const canPickTeams = Boolean(onPickTeam && sortedTeams.length > 0);
  const memberPool = allMembers ?? members;

  const closePicker = useCallback(() => {
    setTab('players');
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePicker();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, closePicker]);

  if (!mounted || !open) return null;
  const excludeSet = new Set(excludeIds);
  const teamExcludeSet = new Set(teamExcludeIds ?? excludeIds);
  const activeTab = canPickTeams ? tab : 'players';

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Pick player"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-neutral-950/30 backdrop-blur-sm"
        onClick={closePicker}
      />
      <div className="relative w-full max-w-md rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
          <h2 className="text-base font-semibold tracking-tight">
            {activeTab === 'teams' ? 'Pick team' : 'Pick player'}
          </h2>
          <div className="flex items-center gap-1.5">
            {onSuggest && (
              <button
                type="button"
                onClick={onSuggest}
                disabled={suggestDisabled}
                className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:border-neutral-950 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Shuffle size={13} />
                Suggest
              </button>
            )}
            <button
              type="button"
              onClick={closePicker}
              className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        {canPickTeams && (
          <div className="mx-5 mb-3 grid grid-cols-2 rounded-2xl bg-neutral-100 p-1 text-sm font-semibold">
            {(['players', 'teams'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={cn(
                  'rounded-xl px-3 py-2 transition',
                  activeTab === item
                    ? 'bg-white text-neutral-950 shadow-sm'
                    : 'text-neutral-500',
                )}
              >
                {item === 'players' ? 'Players' : 'Teams'}
              </button>
            ))}
          </div>
        )}
        {activeTab === 'players' && sorted.length === 0 ? (
          <div className="px-5 pb-6 text-sm text-neutral-500">
            No players checked.
          </div>
        ) : activeTab === 'players' ? (
          <div className="grid max-h-[70vh] grid-cols-2 gap-1 overflow-y-auto px-3 pb-5">
            {sorted.map((member) => {
              const disabled = excludeSet.has(member.id);
              const selected = selectedId === member.id;
              return (
                <button
                  key={member.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setTab('players');
                    onPick(member);
                  }}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition',
                    disabled
                      ? 'cursor-not-allowed opacity-30'
                      : 'hover:bg-neutral-100 active:bg-neutral-200',
                    selected && 'ring-1 ring-neutral-950',
                  )}
                >
                  <Avatar member={member} size="sm" />
                  <span className="truncate text-sm font-medium">
                    {member.name}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="max-h-[70vh] space-y-2 overflow-y-auto px-3 pb-5">
            {sortedTeams.map((team) => {
              const playerA = team.playerA
                ? getMemberOrFallback(team.playerA, memberPool)
                : null;
              const playerB = team.playerB
                ? getMemberOrFallback(team.playerB, memberPool)
                : null;
              const disabled =
                !playerA ||
                !playerB ||
                teamExcludeSet.has(playerA.id) ||
                teamExcludeSet.has(playerB.id);
              return (
                <button
                  key={team.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onPickTeam?.(team)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left transition',
                    disabled
                      ? 'cursor-not-allowed opacity-30'
                      : 'hover:bg-neutral-100 active:bg-neutral-200',
                  )}
                >
                  <span className="w-5 shrink-0 text-xs font-semibold text-neutral-400">
                    {team.position + 1}
                  </span>
                  <TeamMember member={playerA} />
                  <TeamMember member={playerB} />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function TeamMember({ member }: { member: Member | null }) {
  if (!member) {
    return (
      <span className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-dashed border-neutral-200 px-2 py-1.5 text-xs text-neutral-400">
        Unpaired
      </span>
    );
  }

  return (
    <span className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-1.5">
      <Avatar member={member} size="xs" />
      <span className="truncate text-sm font-medium">{member.name}</span>
    </span>
  );
}

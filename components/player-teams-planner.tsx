'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { GripVertical, Shuffle } from 'lucide-react';
import { updateDayTeams } from '@/lib/actions';
import type { DayTeam, MatchWithDate } from '@/lib/queries';
import type { Member } from '@/lib/members';
import {
  generateBalancedTeamPairs,
  type TeamPairDraft,
} from '@/lib/team-planner';
import { Avatar } from './avatar';
import { cn } from '@/lib/utils';

type Slot = {
  teamIndex: number;
  side: 'A' | 'B';
};

function sameSlot(a: Slot | null, b: Slot) {
  return a?.teamIndex === b.teamIndex && a.side === b.side;
}

function initialTeams(teams: DayTeam[]): TeamPairDraft[] {
  return teams.map((team) => ({
    playerA: team.playerA,
    playerB: team.playerB,
  }));
}

function slotValue(teams: TeamPairDraft[], slot: Slot): string | null {
  const team = teams[slot.teamIndex];
  return slot.side === 'A' ? team.playerA : team.playerB;
}

function setSlotValue(
  teams: TeamPairDraft[],
  slot: Slot,
  value: string | null,
): TeamPairDraft[] {
  return teams.map((team, index) => {
    if (index !== slot.teamIndex) return team;
    return slot.side === 'A'
      ? { ...team, playerA: value }
      : { ...team, playerB: value };
  });
}

function swapSlots(teams: TeamPairDraft[], from: Slot, to: Slot) {
  const fromValue = slotValue(teams, from);
  const toValue = slotValue(teams, to);
  return setSlotValue(setSlotValue(teams, from, toValue), to, fromValue);
}

export function PlayerTeamsPlanner({
  selectedDate,
  members,
  teams,
  allMatches,
}: {
  selectedDate: string;
  members: Member[];
  teams: DayTeam[];
  allMatches: MatchWithDate[];
}) {
  const [draftTeams, setDraftTeams] = useState<TeamPairDraft[]>(() =>
    initialTeams(teams),
  );
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const memberById = useMemo(
    () => new Map(members.map((member) => [member.id, member])),
    [members],
  );
  const playingMembers = useMemo(
    () => members.filter((member) => member.isPlaying),
    [members],
  );

  useEffect(() => {
    if (draftTeams.length > 0 || playingMembers.length === 0) return;
    const generated = generateBalancedTeamPairs(playingMembers, allMatches);
    if (generated.length === 0) return;
    saveTeams(generated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftTeams.length, playingMembers, allMatches, selectedDate]);

  function saveTeams(nextTeams: TeamPairDraft[]) {
    setDraftTeams(nextTeams);
    setError(null);
    startTransition(async () => {
      try {
        await updateDayTeams({ playDate: selectedDate, teams: nextTeams });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save teams');
      }
    });
  }

  function regenerateTeams() {
    saveTeams(generateBalancedTeamPairs(playingMembers, allMatches));
    setSelectedSlot(null);
  }

  function onSlotTap(slot: Slot) {
    const value = slotValue(draftTeams, slot);
    if (!selectedSlot) {
      if (value) setSelectedSlot(slot);
      return;
    }
    if (sameSlot(selectedSlot, slot)) {
      setSelectedSlot(null);
      return;
    }
    saveTeams(swapSlots(draftTeams, selectedSlot, slot));
    setSelectedSlot(null);
  }

  function onDrop(slot: Slot, payload: string) {
    const [teamIndex, side] = payload.split(':');
    if (side !== 'A' && side !== 'B') return;
    const from: Slot = { teamIndex: Number(teamIndex), side };
    if (!Number.isInteger(from.teamIndex)) return;
    if (from.teamIndex < 0 || from.teamIndex >= draftTeams.length) return;
    saveTeams(swapSlots(draftTeams, from, slot));
    setSelectedSlot(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Teams</h2>
          <p className="text-xs text-neutral-500">
            {draftTeams.length === 1 ? '1 team' : `${draftTeams.length} teams`}
          </p>
        </div>
        <button
          type="button"
          onClick={regenerateTeams}
          disabled={pending || playingMembers.length === 0}
          className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 disabled:opacity-40"
        >
          <Shuffle size={15} />
          Generate
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {draftTeams.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-5 text-sm text-neutral-500">
          No playing players.
        </div>
      ) : (
        <div className={cn('space-y-2', pending && 'opacity-70')}>
          {draftTeams.map((team, index) => (
            <article
              key={index}
              className="rounded-2xl border border-neutral-200 bg-white p-3"
            >
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
                <GripVertical size={14} />
                Team {index + 1}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <TeamSlot
                  slot={{ teamIndex: index, side: 'A' }}
                  member={team.playerA ? memberById.get(team.playerA) : undefined}
                  selected={sameSlot(selectedSlot, { teamIndex: index, side: 'A' })}
                  onTap={onSlotTap}
                  onDrop={onDrop}
                />
                <TeamSlot
                  slot={{ teamIndex: index, side: 'B' }}
                  member={team.playerB ? memberById.get(team.playerB) : undefined}
                  selected={sameSlot(selectedSlot, { teamIndex: index, side: 'B' })}
                  onTap={onSlotTap}
                  onDrop={onDrop}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamSlot({
  slot,
  member,
  selected,
  onTap,
  onDrop,
}: {
  slot: Slot;
  member?: Member;
  selected: boolean;
  onTap: (slot: Slot) => void;
  onDrop: (slot: Slot, payload: string) => void;
}) {
  return (
    <button
      type="button"
      draggable={!!member}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', `${slot.teamIndex}:${slot.side}`);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(slot, e.dataTransfer.getData('text/plain'));
      }}
      onClick={() => onTap(slot)}
      className={cn(
        'flex min-h-12 items-center gap-2 rounded-xl border border-neutral-200 px-2 text-left transition',
        selected && 'border-neutral-950 ring-1 ring-neutral-950',
        !member && 'border-dashed text-neutral-400',
      )}
    >
      {member ? (
        <>
          <Avatar member={member} size="sm" />
          <span className="min-w-0 truncate text-sm font-medium">
            {member.name}
          </span>
        </>
      ) : (
        <span className="text-sm">Unpaired</span>
      )}
    </button>
  );
}

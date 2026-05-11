'use client';

import { useEffect, useState, useTransition } from 'react';
import { X } from 'lucide-react';
import { getMemberOrFallback, type Member } from '@/lib/members';
import type { DayMatch, DayTeam, MatchWithDate } from '@/lib/queries';
import { suggestTeams, type LineupLike } from '@/lib/auto-teams';
import { Avatar } from './avatar';
import { cn } from '@/lib/utils';
import { createMatch } from '@/lib/actions';

const SLOTS = ['teamAP1', 'teamAP2', 'teamBP1', 'teamBP2'] as const;
type Slot = (typeof SLOTS)[number];
const ORDER: Slot[] = ['teamAP1', 'teamAP2', 'teamBP1', 'teamBP2'];

type Draft = {
  teamAP1: string | null;
  teamAP2: string | null;
  teamBP1: string | null;
  teamBP2: string | null;
};

const EMPTY: Draft = {
  teamAP1: null,
  teamAP2: null,
  teamBP1: null,
  teamBP2: null,
};

function draftLineup(d: Draft): LineupLike | null {
  if (!d.teamAP1 || !d.teamAP2 || !d.teamBP1 || !d.teamBP2) return null;
  return {
    teamAP1: d.teamAP1,
    teamAP2: d.teamAP2,
    teamBP1: d.teamBP1,
    teamBP2: d.teamBP2,
  };
}

function nextEmpty(d: Draft): Slot | null {
  for (const f of ORDER) {
    if (d[f] === null) return f;
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

function sideSlots(slot: Slot): [Slot, Slot] {
  return slot === 'teamAP1' || slot === 'teamAP2'
    ? ['teamAP1', 'teamAP2']
    : ['teamBP1', 'teamBP2'];
}

function buildTeamExclude(d: Draft, slot: Slot): string[] {
  const side = new Set(sideSlots(slot));
  const out: string[] = [];
  for (const s of SLOTS) {
    if (side.has(s)) continue;
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
  teams?: DayTeam[];
  teamExcludeIds?: string[];
  onPickTeam?: (team: DayTeam) => void;
  onSuggest?: () => void;
  suggestDisabled?: boolean;
};

export function DraftMatchCard({
  playDate,
  members,
  allMembers,
  dayMatches,
  dayTeams,
  reservedLineups,
  blockedPlayerIds,
  allMatches,
  onLineupChange,
  onCancel,
  onSaved,
  openPicker,
  closePicker,
}: {
  playDate: string;
  members: Member[];
  allMembers: Member[];
  dayMatches: DayMatch[];
  dayTeams: DayTeam[];
  reservedLineups: LineupLike[];
  blockedPlayerIds: string[];
  allMatches: MatchWithDate[];
  onLineupChange: (lineup: LineupLike | null) => void;
  onCancel: () => void;
  onSaved: () => void;
  openPicker: (args: PickerArgs) => void;
  closePicker: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [active, setActive] = useState<Slot>('teamAP1');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openSlotPicker(slot: Slot, snapshot: Draft) {
    setActive(slot);
    openPicker({
      members,
      excludeIds: [...buildExclude(snapshot, slot), ...blockedPlayerIds],
      selectedId: snapshot[slot],
      onSuggest: () => applySuggestion(snapshot),
      suggestDisabled: members.length < 4,
      onPick: (member) => {
        const newDraft = { ...snapshot, [slot]: member.id };
        setDraft(newDraft);
        onLineupChange(draftLineup(newDraft));
        if (draftLineup(newDraft)) {
          closePicker();
          createPlannedMatch(newDraft);
        } else {
          const next = nextEmpty(newDraft);
          if (next === null) return;
          openSlotPicker(next, newDraft);
        }
      },
      teams: dayTeams,
      teamExcludeIds: [...buildTeamExclude(snapshot, slot), ...blockedPlayerIds],
      onPickTeam: (team) => applyTeam(slot, snapshot, team),
    });
  }

  function applyTeam(slot: Slot, snapshot: Draft, team: DayTeam) {
    if (!team.playerA || !team.playerB) return;
    const [slot1, slot2] = sideSlots(slot);
    const newDraft = {
      ...snapshot,
      [slot1]: team.playerA,
      [slot2]: team.playerB,
    };
    setDraft(newDraft);
    onLineupChange(draftLineup(newDraft));
    setError(null);

    if (draftLineup(newDraft)) {
      closePicker();
      createPlannedMatch(newDraft);
      return;
    }

    const next = nextEmpty(newDraft);
    if (next !== null) openSlotPicker(next, newDraft);
  }

  function applySuggestion(snapshot: Draft) {
    const suggestion = suggestTeams({
      members,
      dayLineups: [...dayMatches, ...reservedLineups],
      allMatches,
      blockedPlayerIds,
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
    onLineupChange(draftLineup(newDraft));
    setError(null);

    closePicker();
    createPlannedMatch(newDraft);
  }

  useEffect(() => {
    openSlotPicker('teamAP1', EMPTY);
    return () => {
      onLineupChange(null);
      closePicker();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onTapSlot(slot: Slot) {
    openSlotPicker(slot, draft);
  }

  function createPlannedMatch(d: Draft) {
    if (!d.teamAP1 || !d.teamAP2 || !d.teamBP1 || !d.teamBP2) return;
    setError(null);
    startTransition(async () => {
      try {
        await createMatch({
          playDate,
          teamAP1: d.teamAP1!,
          teamAP2: d.teamAP2!,
          teamBP1: d.teamBP1!,
          teamBP2: d.teamBP2!,
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
        draft={draft}
        active={active}
        onTapSlot={onTapSlot}
        members={allMembers}
      />
      <div className="my-2 h-px bg-neutral-100" />
      <DraftRow
        label="B"
        slot1="teamBP1"
        slot2="teamBP2"
        draft={draft}
        active={active}
        onTapSlot={onTapSlot}
        members={allMembers}
      />
      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
    </article>
  );
}

function DraftRow({
  label,
  slot1,
  slot2,
  draft,
  active,
  onTapSlot,
  members,
}: {
  label: 'A' | 'B';
  slot1: Slot;
  slot2: Slot;
  draft: Draft;
  active: Slot;
  onTapSlot: (slot: Slot) => void;
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

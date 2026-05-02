'use client';

import { useMemo, useState } from 'react';
import type { MatchWithDate } from '@/lib/queries';
import {
  computePlayerStats,
  computeTeamStats,
  filterByPeriod,
  type Period,
  type PlayerStats,
  type TeamStats,
} from '@/lib/stats';
import { getMemberOrFallback } from '@/lib/members';
import { Avatar } from './avatar';
import { cn } from '@/lib/utils';

type View = 'players' | 'teams';

export function StatsView({ allMatches }: { allMatches: MatchWithDate[] }) {
  const [view, setView] = useState<View>('players');
  const [period, setPeriod] = useState<Period>('all');

  const filtered = useMemo(
    () => filterByPeriod(allMatches, period),
    [allMatches, period],
  );
  const playerRows = useMemo(
    () =>
      computePlayerStats(filtered).sort(
        (a, b) => b.winRate - a.winRate || b.matches - a.matches,
      ),
    [filtered],
  );
  const teamRows = useMemo(
    () =>
      computeTeamStats(filtered).sort(
        (a, b) => b.wins - a.wins || b.winRate - a.winRate,
      ),
    [filtered],
  );

  return (
    <div className="space-y-4 pt-4 pb-24">
      <Pills
        options={[
          { value: 'players', label: 'Players' },
          { value: 'teams', label: 'Teams' },
        ]}
        value={view}
        onChange={(v) => setView(v as View)}
      />
      <Pills
        options={[
          { value: 'all', label: 'All time' },
          { value: 'month', label: 'This month' },
          { value: '30days', label: 'Last 30 days' },
        ]}
        value={period}
        onChange={(v) => setPeriod(v as Period)}
      />

      {view === 'players' ? (
        <PlayerTable rows={playerRows} totalMatches={filtered.length} />
      ) : (
        <TeamTable rows={teamRows} totalMatches={filtered.length} />
      )}
    </div>
  );
}

function Pills({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex shrink-0 gap-0.5 rounded-full border border-neutral-200 bg-white p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-full px-3 py-1 text-xs transition',
            opt.value === value
              ? 'bg-neutral-950 text-white'
              : 'text-neutral-700 hover:bg-neutral-100',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function PlayerTable({
  rows,
  totalMatches,
}: {
  rows: PlayerStats[];
  totalMatches: number;
}) {
  if (totalMatches === 0) return <Empty />;
  if (rows.length === 0)
    return (
      <p className="pt-8 text-center text-sm text-neutral-500">
        No player stats yet.
      </p>
    );
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-[11px] uppercase tracking-wider text-neutral-500">
            <th className="py-2 pr-2 pl-3">Player</th>
            <th className="px-1.5 py-2 text-right tabular-nums">M</th>
            <th className="px-1.5 py-2 text-right tabular-nums">W–L</th>
            <th className="px-1.5 py-2 text-right tabular-nums">Win%</th>
            <th className="px-1.5 py-2 text-right tabular-nums">Pts</th>
            <th className="py-2 pr-3 pl-1.5 text-right tabular-nums">Avg</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const m = getMemberOrFallback(row.memberId);
            return (
              <tr
                key={row.memberId}
                className={cn(
                  i !== 0 && 'border-t border-neutral-100',
                  i % 2 === 1 && 'bg-neutral-50/40',
                )}
              >
                <td className="py-2.5 pr-2 pl-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar member={m} size="xs" />
                    <span className="truncate font-medium">{m.name}</span>
                  </div>
                </td>
                <td className="px-1.5 py-2.5 text-right tabular-nums text-neutral-700">
                  {row.matches}
                </td>
                <td className="px-1.5 py-2.5 text-right tabular-nums text-neutral-700">
                  {row.wins}–{row.losses}
                </td>
                <td className="px-1.5 py-2.5 text-right font-semibold tabular-nums">
                  {Math.round(row.winRate * 100)}%
                </td>
                <td className="px-1.5 py-2.5 text-right tabular-nums text-neutral-700">
                  {row.totalPoints}
                </td>
                <td className="py-2.5 pr-3 pl-1.5 text-right tabular-nums text-neutral-700">
                  {row.avgPoints.toFixed(1)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TeamTable({
  rows,
  totalMatches,
}: {
  rows: TeamStats[];
  totalMatches: number;
}) {
  if (totalMatches === 0) return <Empty />;
  if (rows.length === 0)
    return (
      <p className="pt-8 text-center text-sm text-neutral-500">
        No team stats yet.
      </p>
    );
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-[11px] uppercase tracking-wider text-neutral-500">
            <th className="py-2 pr-2 pl-3">Team</th>
            <th className="px-1.5 py-2 text-right tabular-nums">M</th>
            <th className="px-1.5 py-2 text-right tabular-nums">W–L</th>
            <th className="px-1.5 py-2 text-right tabular-nums">Win%</th>
            <th className="px-1.5 py-2 text-right tabular-nums">Pts</th>
            <th className="py-2 pr-3 pl-1.5 text-right tabular-nums">Avg</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const a = getMemberOrFallback(row.memberA);
            const b = getMemberOrFallback(row.memberB);
            return (
              <tr
                key={row.pairKey}
                className={cn(
                  i !== 0 && 'border-t border-neutral-100',
                  i % 2 === 1 && 'bg-neutral-50/40',
                )}
              >
                <td className="py-2.5 pr-2 pl-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex shrink-0 -space-x-2">
                      <Avatar
                        member={a}
                        size="xs"
                        className="ring-2 ring-white"
                      />
                      <Avatar
                        member={b}
                        size="xs"
                        className="ring-2 ring-white"
                      />
                    </div>
                    <span className="truncate text-xs">
                      {a.name} & {b.name}
                    </span>
                  </div>
                </td>
                <td className="px-1.5 py-2.5 text-right tabular-nums text-neutral-700">
                  {row.matches}
                </td>
                <td className="px-1.5 py-2.5 text-right tabular-nums text-neutral-700">
                  {row.wins}–{row.losses}
                </td>
                <td className="px-1.5 py-2.5 text-right font-semibold tabular-nums">
                  {Math.round(row.winRate * 100)}%
                </td>
                <td className="px-1.5 py-2.5 text-right tabular-nums text-neutral-700">
                  {row.totalPoints}
                </td>
                <td className="py-2.5 pr-3 pl-1.5 text-right tabular-nums text-neutral-700">
                  {row.avgPoints.toFixed(1)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Empty() {
  return (
    <p className="pt-12 text-center text-sm text-neutral-400">
      No matches recorded yet.
    </p>
  );
}

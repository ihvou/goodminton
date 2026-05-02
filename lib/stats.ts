import type { MatchWithDate } from '@/lib/queries';

export type Period = 'all' | 'month' | '30days';

export type PlayerStats = {
  memberId: string;
  matches: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPoints: number;
  avgPoints: number;
};

export type TeamStats = {
  pairKey: string;
  memberA: string;
  memberB: string;
  matches: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPoints: number;
  avgPoints: number;
};

export function filterByPeriod(
  matches: MatchWithDate[],
  period: Period,
): MatchWithDate[] {
  if (period === 'all') return matches;
  const now = new Date();
  let start: Date;
  if (period === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    start = new Date(now);
    start.setDate(start.getDate() - 30);
  }
  const startIso = start.toISOString().slice(0, 10);
  return matches.filter((m) => m.playDate >= startIso);
}

export function computePlayerStats(matches: MatchWithDate[]): PlayerStats[] {
  type Acc = {
    matches: number;
    wins: number;
    losses: number;
    totalPoints: number;
  };
  const map = new Map<string, Acc>();
  const ensure = (id: string): Acc => {
    let a = map.get(id);
    if (!a) {
      a = { matches: 0, wins: 0, losses: 0, totalPoints: 0 };
      map.set(id, a);
    }
    return a;
  };

  for (const m of matches) {
    const aWon = m.scoreA > m.scoreB;
    for (const id of [m.teamAP1, m.teamAP2]) {
      const s = ensure(id);
      s.matches++;
      if (aWon) s.wins++;
      else s.losses++;
      s.totalPoints += m.scoreA;
    }
    for (const id of [m.teamBP1, m.teamBP2]) {
      const s = ensure(id);
      s.matches++;
      if (!aWon) s.wins++;
      else s.losses++;
      s.totalPoints += m.scoreB;
    }
  }

  return Array.from(map.entries()).map(([memberId, s]) => ({
    memberId,
    matches: s.matches,
    wins: s.wins,
    losses: s.losses,
    winRate: s.matches > 0 ? s.wins / s.matches : 0,
    totalPoints: s.totalPoints,
    avgPoints: s.matches > 0 ? s.totalPoints / s.matches : 0,
  }));
}

export function computeTeamStats(matches: MatchWithDate[]): TeamStats[] {
  type Acc = {
    a: string;
    b: string;
    matches: number;
    wins: number;
    losses: number;
    totalPoints: number;
  };
  const map = new Map<string, Acc>();
  const pairKey = (x: string, y: string) => [x, y].sort().join('+');
  const ensure = (x: string, y: string): Acc => {
    const [a, b] = [x, y].sort();
    const key = pairKey(x, y);
    let acc = map.get(key);
    if (!acc) {
      acc = { a, b, matches: 0, wins: 0, losses: 0, totalPoints: 0 };
      map.set(key, acc);
    }
    return acc;
  };

  for (const m of matches) {
    const aWon = m.scoreA > m.scoreB;
    const sA = ensure(m.teamAP1, m.teamAP2);
    sA.matches++;
    if (aWon) sA.wins++;
    else sA.losses++;
    sA.totalPoints += m.scoreA;
    const sB = ensure(m.teamBP1, m.teamBP2);
    sB.matches++;
    if (!aWon) sB.wins++;
    else sB.losses++;
    sB.totalPoints += m.scoreB;
  }

  return Array.from(map.entries()).map(([key, s]) => ({
    pairKey: key,
    memberA: s.a,
    memberB: s.b,
    matches: s.matches,
    wins: s.wins,
    losses: s.losses,
    winRate: s.matches > 0 ? s.wins / s.matches : 0,
    totalPoints: s.totalPoints,
    avgPoints: s.matches > 0 ? s.totalPoints / s.matches : 0,
  }));
}

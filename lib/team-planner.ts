import type { Member } from '@/lib/members';

export type TeamPairDraft = {
  playerA: string | null;
  playerB: string | null;
};

type MatchForAverage = {
  teamAP1: string;
  teamAP2: string;
  teamBP1: string;
  teamBP2: string;
  scoreA: number | null;
  scoreB: number | null;
};

function increment(map: Map<string, number>, key: string, amount: number) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function buildAverageScores(matches: readonly MatchForAverage[]) {
  const totals = new Map<string, number>();
  const counts = new Map<string, number>();
  let globalTotal = 0;
  let globalCount = 0;

  function add(id: string, score: number) {
    increment(totals, id, score);
    increment(counts, id, 1);
    globalTotal += score;
    globalCount++;
  }

  for (const match of matches) {
    if (match.scoreA === null || match.scoreB === null) continue;
    add(match.teamAP1, match.scoreA);
    add(match.teamAP2, match.scoreA);
    add(match.teamBP1, match.scoreB);
    add(match.teamBP2, match.scoreB);
  }

  const fallback = globalCount > 0 ? globalTotal / globalCount : 30;
  return (id: string) => {
    const count = counts.get(id) ?? 0;
    return count > 0 ? (totals.get(id) ?? 0) / count : fallback;
  };
}

export function generateBalancedTeamPairs(
  members: readonly Member[],
  matches: readonly MatchForAverage[],
): TeamPairDraft[] {
  const averageScore = buildAverageScores(matches);
  const pool = [...members]
    .filter((member) => member.isPlaying)
    .sort((a, b) => {
      const scoreDiff = averageScore(b.id) - averageScore(a.id);
      if (scoreDiff !== 0) return scoreDiff;
      return a.name.localeCompare(b.name);
    });

  const teams: TeamPairDraft[] = [];
  while (pool.length > 1) {
    const strongest = pool.shift()!;
    const softest = pool.pop()!;
    teams.push({ playerA: strongest.id, playerB: softest.id });
  }
  if (pool.length === 1) {
    teams.push({ playerA: pool[0].id, playerB: null });
  }

  return teams;
}

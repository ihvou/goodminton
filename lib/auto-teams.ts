import type { Member } from '@/lib/members';

export type LineupLike = {
  teamAP1: string;
  teamAP2: string;
  teamBP1: string;
  teamBP2: string;
};

type MatchLike = LineupLike & {
  scoreA: number | null;
  scoreB: number | null;
};

export type TeamSuggestion = {
  teamA: [string, string];
  teamB: [string, string];
};

type Candidate = TeamSuggestion & {
  repeatedPairs: number;
  balanceGap: number;
  dayLoad: number;
  stableKey: string;
};

function pairKey(a: string, b: string): string {
  return [a, b].sort().join('+');
}

function increment(map: Map<string, number>, key: string, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function teamPairings(ids: [string, string, string, string]): TeamSuggestion[] {
  const [a, b, c, d] = ids;
  return [
    { teamA: [a, b], teamB: [c, d] },
    { teamA: [a, c], teamB: [b, d] },
    { teamA: [a, d], teamB: [b, c] },
  ];
}

function combinationsOfFour(ids: string[]): [string, string, string, string][] {
  const out: [string, string, string, string][] = [];
  for (let a = 0; a < ids.length - 3; a++) {
    for (let b = a + 1; b < ids.length - 2; b++) {
      for (let c = b + 1; c < ids.length - 1; c++) {
        for (let d = c + 1; d < ids.length; d++) {
          out.push([ids[a], ids[b], ids[c], ids[d]]);
        }
      }
    }
  }
  return out;
}

function buildDayMaps(dayLineups: LineupLike[]) {
  const pairCounts = new Map<string, number>();
  const playerCounts = new Map<string, number>();

  for (const lineup of dayLineups) {
    increment(pairCounts, pairKey(lineup.teamAP1, lineup.teamAP2));
    increment(pairCounts, pairKey(lineup.teamBP1, lineup.teamBP2));
    for (const id of [
      lineup.teamAP1,
      lineup.teamAP2,
      lineup.teamBP1,
      lineup.teamBP2,
    ]) {
      increment(playerCounts, id);
    }
  }

  return { pairCounts, playerCounts };
}

function buildAverageScores(allMatches: MatchLike[]) {
  const totals = new Map<string, number>();
  const counts = new Map<string, number>();
  let globalTotal = 0;
  let globalCount = 0;

  function addPlayer(id: string, score: number) {
    increment(totals, id, score);
    increment(counts, id);
    globalTotal += score;
    globalCount++;
  }

  for (const match of allMatches) {
    if (match.scoreA === null || match.scoreB === null) continue;
    addPlayer(match.teamAP1, match.scoreA);
    addPlayer(match.teamAP2, match.scoreA);
    addPlayer(match.teamBP1, match.scoreB);
    addPlayer(match.teamBP2, match.scoreB);
  }

  const fallbackAverage = globalCount > 0 ? globalTotal / globalCount : 30;
  return (id: string) => {
    const count = counts.get(id) ?? 0;
    return count > 0 ? (totals.get(id) ?? 0) / count : fallbackAverage;
  };
}

export function suggestTeams({
  members,
  dayLineups,
  allMatches,
  blockedPlayerIds = [],
}: {
  members: Member[];
  dayLineups: LineupLike[];
  allMatches: MatchLike[];
  blockedPlayerIds?: string[];
}): TeamSuggestion | null {
  const blocked = new Set(blockedPlayerIds);
  const eligibleIds = [...members]
    .filter((member) => member.isPlaying && !blocked.has(member.id))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((member) => member.id);

  if (eligibleIds.length < 4) return null;

  const { pairCounts, playerCounts } = buildDayMaps(dayLineups);
  const averageScore = buildAverageScores(allMatches);
  let best: Candidate | null = null;

  for (const ids of combinationsOfFour(eligibleIds)) {
    for (const pairing of teamPairings(ids)) {
      const repeatedPairs =
        (pairCounts.get(pairKey(pairing.teamA[0], pairing.teamA[1])) ?? 0) +
        (pairCounts.get(pairKey(pairing.teamB[0], pairing.teamB[1])) ?? 0);
      const teamAStrength =
        averageScore(pairing.teamA[0]) + averageScore(pairing.teamA[1]);
      const teamBStrength =
        averageScore(pairing.teamB[0]) + averageScore(pairing.teamB[1]);
      const balanceGap = Math.abs(teamAStrength - teamBStrength);
      const dayLoad = [...pairing.teamA, ...pairing.teamB].reduce(
        (sum, id) => sum + (playerCounts.get(id) ?? 0),
        0,
      );
      const stableKey = [...pairing.teamA, ...pairing.teamB].join('+');
      const candidate: Candidate = {
        ...pairing,
        repeatedPairs,
        balanceGap,
        dayLoad,
        stableKey,
      };

      if (
        !best ||
        candidate.repeatedPairs < best.repeatedPairs ||
        (candidate.repeatedPairs === best.repeatedPairs &&
          candidate.dayLoad < best.dayLoad) ||
        (candidate.repeatedPairs === best.repeatedPairs &&
          candidate.dayLoad === best.dayLoad &&
          candidate.balanceGap < best.balanceGap) ||
        (candidate.repeatedPairs === best.repeatedPairs &&
          candidate.dayLoad === best.dayLoad &&
          candidate.balanceGap === best.balanceGap &&
          candidate.stableKey < best.stableKey)
      ) {
        best = candidate;
      }
    }
  }

  return best ? { teamA: best.teamA, teamB: best.teamB } : null;
}

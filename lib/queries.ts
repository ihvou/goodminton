import 'server-only';
import { db } from '@/db';
import { playSessions, matches } from '@/db/schema';
import { eq, asc, sql } from 'drizzle-orm';

export type DayMatch = {
  id: string;
  teamAP1: string;
  teamAP2: string;
  teamBP1: string;
  teamBP2: string;
  scoreA: number;
  scoreB: number;
  createdAt: Date;
};

export type MatchWithDate = DayMatch & {
  playDate: string;
};

export async function loadDayMatches(playDate: string): Promise<DayMatch[]> {
  const session = await db.query.playSessions.findFirst({
    where: eq(playSessions.playDate, playDate),
  });
  if (!session) return [];
  return db
    .select({
      id: matches.id,
      teamAP1: matches.teamAP1,
      teamAP2: matches.teamAP2,
      teamBP1: matches.teamBP1,
      teamBP2: matches.teamBP2,
      scoreA: matches.scoreA,
      scoreB: matches.scoreB,
      createdAt: matches.createdAt,
    })
    .from(matches)
    .where(eq(matches.sessionId, session.id))
    .orderBy(asc(matches.createdAt));
}

/** Map of YYYY-MM-DD → match count, for every session row that has matches. */
export async function loadDayCounts(): Promise<Map<string, number>> {
  const rows = await db
    .select({
      playDate: playSessions.playDate,
      count: sql<number>`count(${matches.id})::int`,
    })
    .from(playSessions)
    .leftJoin(matches, eq(matches.sessionId, playSessions.id))
    .groupBy(playSessions.playDate);
  return new Map(rows.map((r) => [r.playDate, r.count]));
}

export async function loadAllMatches(): Promise<MatchWithDate[]> {
  return db
    .select({
      id: matches.id,
      teamAP1: matches.teamAP1,
      teamAP2: matches.teamAP2,
      teamBP1: matches.teamBP1,
      teamBP2: matches.teamBP2,
      scoreA: matches.scoreA,
      scoreB: matches.scoreB,
      createdAt: matches.createdAt,
      playDate: playSessions.playDate,
    })
    .from(matches)
    .innerJoin(playSessions, eq(matches.sessionId, playSessions.id))
    .orderBy(asc(playSessions.playDate));
}

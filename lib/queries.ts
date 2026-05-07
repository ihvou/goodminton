import 'server-only';
import { db } from '@/db';
import { playSessions, matches, members } from '@/db/schema';
import { eq, asc, sql } from 'drizzle-orm';
import {
  DEFAULT_MEMBERS,
  sortMembers,
  type Member,
} from '@/lib/members';

export type DayMatch = {
  id: string;
  teamAP1: string;
  teamAP2: string;
  teamBP1: string;
  teamBP2: string;
  scoreA: number | null;
  scoreB: number | null;
  createdAt: Date;
};

export type MatchWithDate = DayMatch & {
  playDate: string;
};

export async function loadMembers(): Promise<Member[]> {
  const rows = await db
    .select({
      id: members.id,
      name: members.name,
      avatar: members.avatar,
      isActive: members.isActive,
      isPlaying: members.isPlaying,
    })
    .from(members)
    .orderBy(asc(members.name));

  const byId = new Map<string, Member>(
    DEFAULT_MEMBERS.map((m) => [m.id, { ...m }]),
  );

  for (const row of rows) {
    if (!row.isActive) {
      byId.delete(row.id);
      continue;
    }
    byId.set(row.id, {
      id: row.id,
      name: row.name,
      avatar: row.avatar,
      isPlaying: row.isPlaying,
    });
  }

  return sortMembers(Array.from(byId.values()));
}

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

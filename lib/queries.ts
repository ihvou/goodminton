import 'server-only';
import { db } from '@/db';
import { clubs, dayTeams, playSessions, matches, members } from '@/db/schema';
import { and, eq, asc, sql } from 'drizzle-orm';
import { sortMembers, type Member } from '@/lib/members';

export type ClubSummary = {
  id: string;
  name: string;
  icon: string;
  accessCode: string;
  isDemo: boolean;
};

export type PublicClub = {
  id: string;
  name: string;
  icon: string;
  isDemo: boolean;
};

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

export type DayTeam = {
  id: string;
  position: number;
  playerA: string | null;
  playerB: string | null;
  createdAt: Date;
};

export async function loadClub(clubId: string): Promise<ClubSummary | null> {
  const row = await db.query.clubs.findFirst({
    where: eq(clubs.id, clubId),
  });
  return row
    ? {
        id: row.id,
        name: row.name,
        icon: row.icon,
        accessCode: row.accessCode,
        isDemo: row.isDemo,
      }
    : null;
}

export async function loadPublicClubs(): Promise<PublicClub[]> {
  return db
    .select({
      id: clubs.id,
      name: clubs.name,
      icon: clubs.icon,
      isDemo: clubs.isDemo,
    })
    .from(clubs)
    .orderBy(asc(clubs.isDemo), asc(clubs.createdAt));
}

export async function loadMembers(clubId: string): Promise<Member[]> {
  const rows = await db
    .select({
      id: members.id,
      name: members.name,
      avatar: members.avatar,
      isActive: members.isActive,
      isPlaying: members.isPlaying,
    })
    .from(members)
    .where(and(eq(members.clubId, clubId), eq(members.isActive, true)))
    .orderBy(asc(members.name));

  return sortMembers(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      avatar: row.avatar,
      isPlaying: row.isPlaying,
    })),
  );
}

export async function loadDayMatches(
  clubId: string,
  playDate: string,
): Promise<DayMatch[]> {
  const session = await db.query.playSessions.findFirst({
    where: and(eq(playSessions.clubId, clubId), eq(playSessions.playDate, playDate)),
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

export async function loadDayTeams(
  clubId: string,
  playDate: string,
): Promise<DayTeam[]> {
  const session = await db.query.playSessions.findFirst({
    where: and(eq(playSessions.clubId, clubId), eq(playSessions.playDate, playDate)),
  });
  if (!session) return [];

  return db
    .select({
      id: dayTeams.id,
      position: dayTeams.position,
      playerA: dayTeams.playerA,
      playerB: dayTeams.playerB,
      createdAt: dayTeams.createdAt,
    })
    .from(dayTeams)
    .where(eq(dayTeams.sessionId, session.id))
    .orderBy(asc(dayTeams.position));
}

/** Map of YYYY-MM-DD → match count, for every session row that has matches. */
export async function loadDayCounts(clubId: string): Promise<Map<string, number>> {
  const rows = await db
    .select({
      playDate: playSessions.playDate,
      count: sql<number>`count(${matches.id})::int`,
    })
    .from(playSessions)
    .leftJoin(matches, eq(matches.sessionId, playSessions.id))
    .where(eq(playSessions.clubId, clubId))
    .groupBy(playSessions.playDate);
  return new Map(rows.map((r) => [r.playDate, r.count]));
}

export async function loadAllMatches(clubId: string): Promise<MatchWithDate[]> {
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
    .where(eq(playSessions.clubId, clubId))
    .orderBy(asc(playSessions.playDate));
}

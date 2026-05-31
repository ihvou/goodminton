'use server';

import { db } from '@/db';
import { dayTeams, members, playSessions, matches } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { and, eq, isNull, ne, or, sql } from 'drizzle-orm';
import { DEFAULT_MEMBERS, isDefaultMember } from '@/lib/members';
import { loadMembers } from '@/lib/queries';

const MAX_AVATAR_LENGTH = 1_500_000;

function hasOwn<T extends object>(obj: T, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

async function validatePlayers(
  clubId: string,
  p1: string,
  p2: string,
  p3: string,
  p4: string,
) {
  const ids = [p1, p2, p3, p4];
  const validIds = new Set((await loadMembers(clubId)).map((m) => m.id));
  for (const id of ids) {
    if (!validIds.has(id)) throw new Error('Unknown member: ' + id);
  }
  if (new Set(ids).size !== 4) {
    throw new Error('Each player can only be in one slot');
  }
}

function validateScores(a: number | null, b: number | null) {
  if (a !== null && !Number.isInteger(a)) {
    throw new Error('Scores must be whole numbers');
  }
  if (b !== null && !Number.isInteger(b)) {
    throw new Error('Scores must be whole numbers');
  }
  if ((a !== null && a < 0) || (b !== null && b < 0)) {
    throw new Error('Scores must be ≥ 0');
  }
  if (a !== null && b !== null && a === b) {
    throw new Error('One team must win');
  }
}

function isIncompleteScore(a: number | null, b: number | null) {
  return a === null || b === null;
}

async function validateNoPendingPlayerOverlap({
  sessionId,
  playerIds,
  excludeMatchId,
}: {
  sessionId: string;
  playerIds: string[];
  excludeMatchId?: string;
}) {
  const rows = await db
    .select({
      id: matches.id,
      teamAP1: matches.teamAP1,
      teamAP2: matches.teamAP2,
      teamBP1: matches.teamBP1,
      teamBP2: matches.teamBP2,
    })
    .from(matches)
    .where(
      and(
        eq(matches.sessionId, sessionId),
        or(isNull(matches.scoreA), isNull(matches.scoreB)),
        excludeMatchId ? ne(matches.id, excludeMatchId) : undefined,
      ),
    );

  const requested = new Set(playerIds);
  for (const row of rows) {
    const overlap = [row.teamAP1, row.teamAP2, row.teamBP1, row.teamBP2].find(
      (id) => requested.has(id),
    );
    if (overlap) {
      throw new Error(`${overlap} is already in an unfinished match`);
    }
  }
}

function slugifyName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'player';
}

function cleanName(name: string): string {
  const cleaned = name.trim().replace(/\s+/g, ' ');
  if (cleaned.length < 2) throw new Error('Player name is too short');
  if (cleaned.length > 60) throw new Error('Player name is too long');
  return cleaned;
}

function cleanAvatar(avatar: string | null | undefined): string | null {
  if (!avatar) return null;
  if (!avatar.startsWith('data:image/')) {
    throw new Error('Avatar must be an image');
  }
  if (avatar.length > MAX_AVATAR_LENGTH) {
    throw new Error('Avatar image is too large');
  }
  return avatar;
}

async function uniqueMemberId(name: string): Promise<string> {
  const base = slugifyName(name);
  let candidate = base;
  let suffix = 2;
  const dbIds = await db.select({ id: members.id }).from(members);
  const existing = new Set([
    ...DEFAULT_MEMBERS.map((m) => m.id),
    ...dbIds.map((m) => m.id),
  ]);
  while (existing.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix++;
  }
  return candidate;
}

function revalidateRosterPaths() {
  revalidatePath('/');
  revalidatePath('/stats');
  revalidatePath('/players');
}

async function findOrCreateSession(
  clubId: string,
  playDate: string,
): Promise<string> {
  const existing = await db.query.playSessions.findFirst({
    where: and(eq(playSessions.clubId, clubId), eq(playSessions.playDate, playDate)),
  });
  if (existing) return existing.id;
  const [created] = await db
    .insert(playSessions)
    .values({ clubId, playDate })
    .returning({ id: playSessions.id });
  return created.id;
}

async function assertSessionInClub(sessionId: string, clubId: string) {
  const session = await db.query.playSessions.findFirst({
    where: and(eq(playSessions.id, sessionId), eq(playSessions.clubId, clubId)),
  });
  if (!session) throw new Error('Match not found');
}

export type CreateMatchInput = {
  playDate: string;
  teamAP1: string;
  teamAP2: string;
  teamBP1: string;
  teamBP2: string;
  scoreA?: number | null;
  scoreB?: number | null;
};

export async function createMatch(input: CreateMatchInput) {
  const { clubId } = await requireAdmin();
  await validatePlayers(
    clubId,
    input.teamAP1,
    input.teamAP2,
    input.teamBP1,
    input.teamBP2,
  );
  const scoreA = input.scoreA ?? null;
  const scoreB = input.scoreB ?? null;
  validateScores(scoreA, scoreB);
  const sessionId = await findOrCreateSession(clubId, input.playDate);
  if (isIncompleteScore(scoreA, scoreB)) {
    await validateNoPendingPlayerOverlap({
      sessionId,
      playerIds: [input.teamAP1, input.teamAP2, input.teamBP1, input.teamBP2],
    });
  }
  const [created] = await db
    .insert(matches)
    .values({
      sessionId,
      teamAP1: input.teamAP1,
      teamAP2: input.teamAP2,
      teamBP1: input.teamBP1,
      teamBP2: input.teamBP2,
      scoreA,
      scoreB,
    })
    .returning();
  revalidatePath('/');
  revalidatePath('/matches');
  revalidatePath('/stats');
  return created;
}

export type UpdateMatchInput = Partial<{
  teamAP1: string;
  teamAP2: string;
  teamBP1: string;
  teamBP2: string;
  scoreA: number | null;
  scoreB: number | null;
}> & { id: string };

export async function updateMatch(input: UpdateMatchInput) {
  const { clubId } = await requireAdmin();
  const current = await db.query.matches.findFirst({
    where: eq(matches.id, input.id),
  });
  if (!current) throw new Error('Match not found');
  await assertSessionInClub(current.sessionId, clubId);
  const next = {
    teamAP1: input.teamAP1 ?? current.teamAP1,
    teamAP2: input.teamAP2 ?? current.teamAP2,
    teamBP1: input.teamBP1 ?? current.teamBP1,
    teamBP2: input.teamBP2 ?? current.teamBP2,
    scoreA: hasOwn(input, 'scoreA') ? input.scoreA! : current.scoreA,
    scoreB: hasOwn(input, 'scoreB') ? input.scoreB! : current.scoreB,
  };
  await validatePlayers(
    clubId,
    next.teamAP1,
    next.teamAP2,
    next.teamBP1,
    next.teamBP2,
  );
  validateScores(next.scoreA, next.scoreB);
  if (isIncompleteScore(next.scoreA, next.scoreB)) {
    await validateNoPendingPlayerOverlap({
      sessionId: current.sessionId,
      playerIds: [next.teamAP1, next.teamAP2, next.teamBP1, next.teamBP2],
      excludeMatchId: input.id,
    });
  }
  await db
    .update(matches)
    .set({ ...next, updatedAt: new Date() })
    .where(eq(matches.id, input.id));
  revalidatePath('/');
  revalidatePath('/matches');
  revalidatePath('/stats');
}

export type CreateMemberInput = {
  name: string;
  avatar?: string | null;
};

export async function createMember(input: CreateMemberInput) {
  const { clubId } = await requireAdmin();
  const name = cleanName(input.name);
  const avatar = cleanAvatar(input.avatar);
  const id = await uniqueMemberId(name);
  await db.insert(members).values({
    id,
    clubId,
    name,
    avatar,
    isActive: true,
  });
  revalidateRosterPaths();
}

export type UpdateMemberInput = {
  id: string;
  name: string;
  avatar?: string | null;
};

export async function updateMember(input: UpdateMemberInput) {
  const { clubId } = await requireAdmin();
  const current = await db.query.members.findFirst({
    where: and(eq(members.id, input.id), eq(members.clubId, clubId)),
  });
  if (!current) throw new Error('Player not found');
  const name = cleanName(input.name);
  const avatar = cleanAvatar(input.avatar);
  await db
    .insert(members)
    .values({
      id: input.id,
      clubId,
      name,
      avatar,
      isActive: true,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: members.id,
      set: {
        name,
        clubId,
        avatar,
        isActive: true,
        updatedAt: new Date(),
      },
    });
  revalidateRosterPaths();
}

export async function updateMemberPlaying(input: {
  id: string;
  isPlaying: boolean;
}) {
  const { clubId } = await requireAdmin();
  const current = (await loadMembers(clubId)).find((member) => member.id === input.id);
  if (!current) throw new Error('Player not found');

  await db
    .insert(members)
    .values({
      id: current.id,
      clubId,
      name: current.name,
      avatar: current.avatar ?? null,
      isActive: true,
      isPlaying: input.isPlaying,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: members.id,
      set: {
        isActive: true,
        clubId,
        isPlaying: input.isPlaying,
        updatedAt: new Date(),
      },
    });
  revalidateRosterPaths();
}

export type DayTeamInput = {
  playerA: string | null;
  playerB: string | null;
};

async function validateTeamPlayers(clubId: string, teams: DayTeamInput[]) {
  const validIds = new Set((await loadMembers(clubId)).map((member) => member.id));
  const used = new Set<string>();

  for (const team of teams) {
    for (const id of [team.playerA, team.playerB]) {
      if (id === null) continue;
      if (!validIds.has(id)) throw new Error('Unknown member: ' + id);
      if (used.has(id)) throw new Error('Player is in more than one team');
      used.add(id);
    }
    if (team.playerA !== null && team.playerA === team.playerB) {
      throw new Error('Team needs two different players');
    }
  }
}

export async function updateDayTeams(input: {
  playDate: string;
  teams: DayTeamInput[];
}) {
  const { clubId } = await requireAdmin();
  await validateTeamPlayers(clubId, input.teams);
  const sessionId = await findOrCreateSession(clubId, input.playDate);

  await db.delete(dayTeams).where(eq(dayTeams.sessionId, sessionId));
  const rows = input.teams
    .map((team, index) => ({
      sessionId,
      position: index,
      playerA: team.playerA,
      playerB: team.playerB,
      updatedAt: new Date(),
    }))
    .filter((team) => team.playerA !== null || team.playerB !== null);

  if (rows.length > 0) {
    await db.insert(dayTeams).values(rows);
  }
  revalidatePath('/');
  revalidatePath('/matches');
  revalidatePath('/players');
}

export async function deleteMember(input: { id: string }) {
  const { clubId } = await requireAdmin();
  const current = await db.query.members.findFirst({
    where: and(eq(members.id, input.id), eq(members.clubId, clubId)),
  });
  if (!current) throw new Error('Player not found');
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(matches)
    .where(
      or(
        eq(matches.teamAP1, input.id),
        eq(matches.teamAP2, input.id),
        eq(matches.teamBP1, input.id),
        eq(matches.teamBP2, input.id),
      ),
    );
  if (count > 0) {
    throw new Error('Player has matches. Edit their name/avatar instead.');
  }

  if (isDefaultMember(input.id)) {
    await db
      .insert(members)
      .values({
        id: input.id,
        clubId,
        name: input.id,
        isActive: false,
        isPlaying: false,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: members.id,
        set: {
          isActive: false,
          clubId,
          isPlaying: false,
          updatedAt: new Date(),
        },
      });
  } else {
    await db
      .delete(members)
      .where(and(eq(members.id, input.id), eq(members.clubId, clubId)));
  }
  revalidateRosterPaths();
}

export async function deleteMatch(input: { id: string; playDate: string }) {
  const { clubId } = await requireAdmin();
  const current = await db.query.matches.findFirst({
    where: eq(matches.id, input.id),
  });
  if (!current) throw new Error('Match not found');
  await assertSessionInClub(current.sessionId, clubId);
  await db.delete(matches).where(eq(matches.id, input.id));
  const sessionRow = await db.query.playSessions.findFirst({
    where: and(eq(playSessions.clubId, clubId), eq(playSessions.playDate, input.playDate)),
  });
  if (sessionRow) {
    const [{ count: matchCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(matches)
      .where(eq(matches.sessionId, sessionRow.id));
    const [{ count: teamCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(dayTeams)
      .where(eq(dayTeams.sessionId, sessionRow.id));
    if (matchCount === 0 && teamCount === 0) {
      await db.delete(playSessions).where(eq(playSessions.id, sessionRow.id));
    }
  }
  revalidatePath('/');
  revalidatePath('/matches');
  revalidatePath('/stats');
}

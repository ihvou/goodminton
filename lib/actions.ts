'use server';

import { db } from '@/db';
import { members, playSessions, matches } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { eq, or, sql } from 'drizzle-orm';
import { DEFAULT_MEMBERS, isDefaultMember } from '@/lib/members';
import { loadMembers } from '@/lib/queries';

const MAX_AVATAR_LENGTH = 1_500_000;

async function validatePlayers(p1: string, p2: string, p3: string, p4: string) {
  const ids = [p1, p2, p3, p4];
  const validIds = new Set((await loadMembers()).map((m) => m.id));
  for (const id of ids) {
    if (!validIds.has(id)) throw new Error('Unknown member: ' + id);
  }
  if (new Set(ids).size !== 4) {
    throw new Error('Each player can only be in one slot');
  }
}

function validateScores(a: number, b: number) {
  if (!Number.isInteger(a) || !Number.isInteger(b)) {
    throw new Error('Scores must be whole numbers');
  }
  if (a < 0 || b < 0) throw new Error('Scores must be ≥ 0');
  if (a === b) throw new Error('One team must win');
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

async function findOrCreateSession(playDate: string): Promise<string> {
  const existing = await db.query.playSessions.findFirst({
    where: eq(playSessions.playDate, playDate),
  });
  if (existing) return existing.id;
  const [created] = await db
    .insert(playSessions)
    .values({ playDate })
    .returning({ id: playSessions.id });
  return created.id;
}

export type CreateMatchInput = {
  playDate: string;
  teamAP1: string;
  teamAP2: string;
  teamBP1: string;
  teamBP2: string;
  scoreA: number;
  scoreB: number;
};

export async function createMatch(input: CreateMatchInput) {
  await requireAdmin();
  await validatePlayers(input.teamAP1, input.teamAP2, input.teamBP1, input.teamBP2);
  validateScores(input.scoreA, input.scoreB);
  const sessionId = await findOrCreateSession(input.playDate);
  const [created] = await db
    .insert(matches)
    .values({
      sessionId,
      teamAP1: input.teamAP1,
      teamAP2: input.teamAP2,
      teamBP1: input.teamBP1,
      teamBP2: input.teamBP2,
      scoreA: input.scoreA,
      scoreB: input.scoreB,
    })
    .returning();
  revalidatePath('/');
  revalidatePath('/stats');
  return created;
}

export type UpdateMatchInput = Partial<{
  teamAP1: string;
  teamAP2: string;
  teamBP1: string;
  teamBP2: string;
  scoreA: number;
  scoreB: number;
}> & { id: string };

export async function updateMatch(input: UpdateMatchInput) {
  await requireAdmin();
  const current = await db.query.matches.findFirst({
    where: eq(matches.id, input.id),
  });
  if (!current) throw new Error('Match not found');
  const next = {
    teamAP1: input.teamAP1 ?? current.teamAP1,
    teamAP2: input.teamAP2 ?? current.teamAP2,
    teamBP1: input.teamBP1 ?? current.teamBP1,
    teamBP2: input.teamBP2 ?? current.teamBP2,
    scoreA: input.scoreA ?? current.scoreA,
    scoreB: input.scoreB ?? current.scoreB,
  };
  await validatePlayers(next.teamAP1, next.teamAP2, next.teamBP1, next.teamBP2);
  validateScores(next.scoreA, next.scoreB);
  await db
    .update(matches)
    .set({ ...next, updatedAt: new Date() })
    .where(eq(matches.id, input.id));
  revalidatePath('/');
  revalidatePath('/stats');
}

export type CreateMemberInput = {
  name: string;
  avatar?: string | null;
};

export async function createMember(input: CreateMemberInput) {
  await requireAdmin();
  const name = cleanName(input.name);
  const avatar = cleanAvatar(input.avatar);
  const id = await uniqueMemberId(name);
  await db.insert(members).values({
    id,
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
  await requireAdmin();
  const name = cleanName(input.name);
  const avatar = cleanAvatar(input.avatar);
  await db
    .insert(members)
    .values({
      id: input.id,
      name,
      avatar,
      isActive: true,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: members.id,
      set: {
        name,
        avatar,
        isActive: true,
        updatedAt: new Date(),
      },
    });
  revalidateRosterPaths();
}

export async function deleteMember(input: { id: string }) {
  await requireAdmin();
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
        name: input.id,
        isActive: false,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: members.id,
        set: {
          isActive: false,
          updatedAt: new Date(),
        },
      });
  } else {
    await db.delete(members).where(eq(members.id, input.id));
  }
  revalidateRosterPaths();
}

export async function deleteMatch(input: { id: string; playDate: string }) {
  await requireAdmin();
  await db.delete(matches).where(eq(matches.id, input.id));
  const sessionRow = await db.query.playSessions.findFirst({
    where: eq(playSessions.playDate, input.playDate),
  });
  if (sessionRow) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(matches)
      .where(eq(matches.sessionId, sessionRow.id));
    if (count === 0) {
      await db.delete(playSessions).where(eq(playSessions.id, sessionRow.id));
    }
  }
  revalidatePath('/');
  revalidatePath('/stats');
}

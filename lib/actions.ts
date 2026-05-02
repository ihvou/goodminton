'use server';

import { db } from '@/db';
import { playSessions, matches } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { eq, sql } from 'drizzle-orm';
import { MEMBERS } from '@/lib/members';

const VALID_IDS = new Set(MEMBERS.map((m) => m.id));

function validatePlayers(p1: string, p2: string, p3: string, p4: string) {
  const ids = [p1, p2, p3, p4];
  for (const id of ids) {
    if (!VALID_IDS.has(id)) throw new Error('Unknown member: ' + id);
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
  validatePlayers(input.teamAP1, input.teamAP2, input.teamBP1, input.teamBP2);
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
  validatePlayers(next.teamAP1, next.teamAP2, next.teamBP1, next.teamBP2);
  validateScores(next.scoreA, next.scoreB);
  await db
    .update(matches)
    .set({ ...next, updatedAt: new Date() })
    .where(eq(matches.id, input.id));
  revalidatePath('/');
  revalidatePath('/stats');
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

import 'server-only';
import { db } from '@/db';
import { clubAdmins, clubs, matches, members, playSessions } from '@/db/schema';
import { hashPassword } from '@/lib/passwords';
import { todayDate, todayIso, toIsoDate, isPlayDay } from '@/lib/dates';
import { and, eq } from 'drizzle-orm';
import { addDays } from 'date-fns';

export const DEMO_ACCESS_CODE = 'demo';
export const DEMO_PASSWORD = 'demo';

const DEMO_MEMBERS = [
  { id: 'aiko', name: 'Aiko Tan', avatar: '/avatars/demo-aiko.svg' },
  { id: 'bruno', name: 'Bruno Lee', avatar: '/avatars/demo-bruno.svg' },
  { id: 'carmen', name: 'Carmen Wu', avatar: '/avatars/demo-carmen.svg' },
  { id: 'diego', name: 'Diego Ramos', avatar: '/avatars/demo-diego.svg' },
  { id: 'elena', name: 'Elena Park', avatar: '/avatars/demo-elena.svg' },
  { id: 'farid', name: 'Farid Noor', avatar: '/avatars/demo-farid.svg' },
  { id: 'mira', name: 'Mira Chen', avatar: '/avatars/demo-mira.svg' },
  { id: 'niko', name: 'Niko Hart', avatar: '/avatars/demo-niko.svg' },
] as const;

function demoMemberId(id: string) {
  return `demo-${id}`;
}

async function hasCurrentDemoRoster(clubId: string): Promise<boolean> {
  const firstDemoMember = DEMO_MEMBERS[0];
  const member = await db.query.members.findFirst({
    where: and(
      eq(members.clubId, clubId),
      eq(members.id, demoMemberId(firstDemoMember.id)),
    ),
  });
  return !!member;
}

function recentPlayDates(count: number): string[] {
  const dates: string[] = [];
  let cursor = todayDate();
  while (dates.length < count) {
    if (isPlayDay(cursor)) dates.push(toIsoDate(cursor));
    cursor = addDays(cursor, -1);
  }
  return dates.reverse();
}

async function getOrCreateDemoClub() {
  const existing = await db.query.clubs.findFirst({
    where: eq(clubs.accessCode, DEMO_ACCESS_CODE),
  });
  if (existing) return existing;

  const [created] = await db
    .insert(clubs)
    .values({
      name: 'Demo club',
      icon: 'target',
      accessCode: DEMO_ACCESS_CODE,
      isDemo: true,
    })
    .returning();
  return created;
}

async function ensureDemoAdmin(clubId: string) {
  const existing = await db.query.clubAdmins.findFirst({
    where: eq(clubAdmins.phone, DEMO_ACCESS_CODE),
  });
  if (existing) return;

  await db.insert(clubAdmins).values({
    clubId,
    name: 'Demo admin',
    phone: DEMO_ACCESS_CODE,
    passwordHash: await hashPassword(DEMO_PASSWORD),
  });
}

async function seedDemoData(clubId: string) {
  await db.delete(playSessions).where(eq(playSessions.clubId, clubId));
  await db.delete(members).where(eq(members.clubId, clubId));

  const demoMembers = DEMO_MEMBERS.map((member) => ({
    id: demoMemberId(member.id),
    clubId,
    name: member.name,
    avatar: member.avatar,
    isActive: true,
    isPlaying: true,
    updatedAt: new Date(),
  }));
  await db.insert(members).values(demoMembers);

  const dates = recentPlayDates(4);
  for (const [index, playDate] of dates.entries()) {
    const [session] = await db
      .insert(playSessions)
      .values({ clubId, playDate })
      .returning({ id: playSessions.id });
    const ids = DEMO_MEMBERS.map((member) => demoMemberId(member.id));
    await db.insert(matches).values([
      {
        sessionId: session.id,
        teamAP1: ids[index % ids.length],
        teamAP2: ids[(index + 1) % ids.length],
        teamBP1: ids[(index + 2) % ids.length],
        teamBP2: ids[(index + 3) % ids.length],
        scoreA: index % 2 === 0 ? 30 : 24,
        scoreB: index % 2 === 0 ? 26 : 30,
      },
      {
        sessionId: session.id,
        teamAP1: ids[(index + 4) % ids.length],
        teamAP2: ids[(index + 5) % ids.length],
        teamBP1: ids[(index + 6) % ids.length],
        teamBP2: ids[(index + 7) % ids.length],
        scoreA: index % 2 === 0 ? 22 : 30,
        scoreB: index % 2 === 0 ? 30 : 28,
      },
      {
        sessionId: session.id,
        teamAP1: ids[(index + 1) % ids.length],
        teamAP2: ids[(index + 4) % ids.length],
        teamBP1: ids[(index + 3) % ids.length],
        teamBP2: ids[(index + 6) % ids.length],
        scoreA: 30,
        scoreB: 27,
      },
    ]);
  }
}

export async function ensureDemoClubReady() {
  const club = await getOrCreateDemoClub();
  await ensureDemoAdmin(club.id);

  if (club.demoResetDate !== todayIso() || !(await hasCurrentDemoRoster(club.id))) {
    await seedDemoData(club.id);
    const [updated] = await db
      .update(clubs)
      .set({ demoResetDate: todayIso(), icon: 'target', updatedAt: new Date() })
      .where(and(eq(clubs.id, club.id), eq(clubs.isDemo, true)))
      .returning();
    return updated ?? club;
  }

  if (club.icon !== 'target') {
    const [updated] = await db
      .update(clubs)
      .set({ icon: 'target', updatedAt: new Date() })
      .where(and(eq(clubs.id, club.id), eq(clubs.isDemo, true)))
      .returning();
    return updated ?? club;
  }

  return club;
}

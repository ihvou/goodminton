import { config } from 'dotenv';
import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';

config({ path: '.env.local' });

const scryptAsync = promisify(scrypt);
const DEMO_ACCESS_CODE = 'demo';
const DEMO_PASSWORD = 'demo';
const DEMO_MEMBER_IDS = [
  'tsugi',
  'rahmad',
  'hadrien',
  'denis',
  'arif',
  'matej',
  'scott',
  'vincent',
] as const;

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${key.toString('hex')}`;
}

function cleanAccessCode(value: string): string {
  const trimmed = value.trim().toLowerCase();
  const digits = trimmed.replace(/\D/g, '');
  const normalized = digits.length > 0 ? digits : trimmed.replace(/\s+/g, '');
  if (normalized.length < 3) throw new Error('Phone number is too short');
  return normalized;
}

function demoMemberId(id: string) {
  return `demo-${id}`;
}

function todayIso() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function recentPlayDates(count: number): string[] {
  const dates: string[] = [];
  const cursor = new Date(todayIso() + 'T00:00:00');
  while (dates.length < count) {
    const weekday = cursor.getDay();
    if (weekday === 1 || weekday === 3 || weekday === 5) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return dates.reverse();
}

async function main() {
  const [{ db }, schema, { eq, isNull }, { DEFAULT_MEMBERS }] =
    await Promise.all([
      import('@/db'),
      import('@/db/schema'),
      import('drizzle-orm'),
      import('@/lib/members'),
    ]);
  const { clubAdmins, clubs, matches, members, playSessions } = schema;

  const tsugiPhone = cleanAccessCode(
    process.env.TSUGI_ADMIN_PHONE ||
      process.env.ADMIN_USERNAME ||
      'tsugi-admin',
  );
  const tsugiPassword = process.env.TSUGI_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  if (!tsugiPassword) {
    throw new Error('ADMIN_PASSWORD or TSUGI_ADMIN_PASSWORD is required');
  }

  let tsugiClub = await db.query.clubs.findFirst({
    where: eq(clubs.accessCode, tsugiPhone),
  });
  if (!tsugiClub) {
    [tsugiClub] = await db
      .insert(clubs)
      .values({
        name: process.env.TSUGI_CLUB_NAME || 'Tsugi club',
        icon: 'trophy',
        accessCode: tsugiPhone,
      })
      .returning();
  }

  const existingAdmin = await db.query.clubAdmins.findFirst({
    where: eq(clubAdmins.phone, tsugiPhone),
  });
  if (!existingAdmin) {
    await db.insert(clubAdmins).values({
      clubId: tsugiClub.id,
      name: process.env.TSUGI_ADMIN_NAME || 'Tsugi',
      phone: tsugiPhone,
      passwordHash: await hashPassword(tsugiPassword),
    });
  }

  await db
    .update(members)
    .set({ clubId: tsugiClub.id, updatedAt: new Date() })
    .where(isNull(members.clubId));
  await db
    .update(playSessions)
    .set({ clubId: tsugiClub.id })
    .where(isNull(playSessions.clubId));

  for (const member of DEFAULT_MEMBERS) {
    await db
      .insert(members)
      .values({
        id: member.id,
        clubId: tsugiClub.id,
        name: member.name,
        avatar: member.avatar ?? null,
        isActive: true,
        isPlaying: member.isPlaying,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: members.id,
        set: {
          clubId: tsugiClub.id,
          updatedAt: new Date(),
        },
      });
  }

  let demoClub = await db.query.clubs.findFirst({
    where: eq(clubs.accessCode, DEMO_ACCESS_CODE),
  });
  if (!demoClub) {
    [demoClub] = await db
      .insert(clubs)
      .values({
        name: 'Demo club',
        icon: 'target',
        accessCode: DEMO_ACCESS_CODE,
        isDemo: true,
      })
      .returning();
  }
  const demoAdmin = await db.query.clubAdmins.findFirst({
    where: eq(clubAdmins.phone, DEMO_ACCESS_CODE),
  });
  if (!demoAdmin) {
    await db.insert(clubAdmins).values({
      clubId: demoClub.id,
      name: 'Demo admin',
      phone: DEMO_ACCESS_CODE,
      passwordHash: await hashPassword(DEMO_PASSWORD),
    });
  }

  await db.delete(playSessions).where(eq(playSessions.clubId, demoClub.id));
  await db.delete(members).where(eq(members.clubId, demoClub.id));
  await db.insert(members).values(
    DEMO_MEMBER_IDS.map((id) => {
      const member = DEFAULT_MEMBERS.find((m) => m.id === id)!;
      return {
        id: demoMemberId(member.id),
        clubId: demoClub.id,
        name: member.name,
        avatar: member.avatar ?? null,
        isActive: true,
        isPlaying: true,
        updatedAt: new Date(),
      };
    }),
  );
  for (const [index, playDate] of recentPlayDates(4).entries()) {
    const [session] = await db
      .insert(playSessions)
      .values({ clubId: demoClub.id, playDate })
      .returning({ id: playSessions.id });
    const ids = DEMO_MEMBER_IDS.map(demoMemberId);
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
  await db
    .update(clubs)
    .set({ demoResetDate: todayIso(), updatedAt: new Date() })
    .where(eq(clubs.id, demoClub.id));

  console.log(
    JSON.stringify(
      {
        tsugiClub: {
          id: tsugiClub.id,
          name: tsugiClub.name,
          accessCode: tsugiClub.accessCode,
        },
        demoClub: {
          id: demoClub.id,
          name: demoClub.name,
          accessCode: demoClub.accessCode,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

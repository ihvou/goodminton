import { NextResponse } from 'next/server';
import { db } from '@/db';
import { clubAdmins, clubs } from '@/db/schema';
import { grantAdminAccess } from '@/lib/auth';
import { cleanPassword, hashPassword } from '@/lib/passwords';
import { cleanAccessCode } from '@/lib/phone';

function cleanName(value: unknown, label: string) {
  if (typeof value !== 'string') throw new Error(`${label} is required`);
  const cleaned = value.trim().replace(/\s+/g, ' ');
  if (cleaned.length < 2) throw new Error(`${label} is too short`);
  if (cleaned.length > 80) throw new Error(`${label} is too long`);
  return cleaned;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | {
        clubName?: unknown;
        adminName?: unknown;
        phone?: unknown;
        password?: unknown;
      }
    | null;

  try {
    const clubName = cleanName(body?.clubName, 'Club name');
    const adminName = cleanName(body?.adminName, 'Admin name');
    const phone = cleanAccessCode(typeof body?.phone === 'string' ? body.phone : '');
    const password = cleanPassword(
      typeof body?.password === 'string' ? body.password : '',
    );
    const passwordHash = await hashPassword(password);

    const [club] = await db
      .insert(clubs)
      .values({
        name: clubName,
        accessCode: phone,
      })
      .returning();
    const [admin] = await db
      .insert(clubAdmins)
      .values({
        clubId: club.id,
        name: adminName,
        phone,
        passwordHash,
      })
      .returning();

    await grantAdminAccess({
      clubId: club.id,
      clubName: club.name,
      adminId: admin.id,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not register club';
    const duplicate =
      message.includes('duplicate key') || message.includes('unique constraint');
    return NextResponse.json(
      { error: duplicate ? 'This phone number is already registered' : message },
      { status: duplicate ? 409 : 400 },
    );
  }
}

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { clubAdmins } from '@/db/schema';
import { grantAdminAccess } from '@/lib/auth';
import { DEMO_ACCESS_CODE, ensureDemoClubReady } from '@/lib/demo';

export async function POST() {
  const club = await ensureDemoClubReady();
  const admin = await db.query.clubAdmins.findFirst({
    where: and(
      eq(clubAdmins.clubId, club.id),
      eq(clubAdmins.phone, DEMO_ACCESS_CODE),
    ),
  });

  if (!admin) {
    return NextResponse.json(
      { error: 'Demo admin is not available' },
      { status: 500 },
    );
  }

  await grantAdminAccess({
    clubId: club.id,
    clubName: club.name,
    adminId: admin.id,
  });
  return NextResponse.json({ ok: true });
}

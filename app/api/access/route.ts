import { NextResponse } from 'next/server';
import {
  findClubByAccessCode,
  findClubByAccessCodeForClub,
  grantClubAccess,
} from '@/lib/auth';
import { ensureDemoClubReady } from '@/lib/demo';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { accessCode?: unknown; clubId?: unknown }
    | null;
  const accessCode =
    body && typeof body.accessCode === 'string' ? body.accessCode : '';
  const clubId = body && typeof body.clubId === 'string' ? body.clubId : '';
  if (!accessCode) {
    return NextResponse.json({ error: 'Enter admin phone number' }, { status: 400 });
  }

  const demo = accessCode.trim().toLowerCase() === 'demo';
  const club = demo
    ? await ensureDemoClubReady()
    : clubId
      ? await findClubByAccessCodeForClub(clubId, accessCode)
      : await findClubByAccessCode(accessCode);
  if (clubId && club?.id !== clubId) {
    return NextResponse.json({ error: 'Club not found' }, { status: 404 });
  }
  if (!club) {
    return NextResponse.json({ error: 'Club not found' }, { status: 404 });
  }

  await grantClubAccess({ id: club.id, name: club.name });
  return NextResponse.json({ ok: true });
}

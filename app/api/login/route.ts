import { NextResponse } from 'next/server';
import { grantAdminAccess, verifyAdminCredentials } from '@/lib/auth';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { phone?: unknown; password?: unknown; clubId?: unknown }
    | null;
  const phone = body && typeof body.phone === 'string' ? body.phone : '';
  const password = body && typeof body.password === 'string' ? body.password : '';
  const clubId = body && typeof body.clubId === 'string' ? body.clubId : undefined;
  if (!phone || !password) {
    return NextResponse.json(
      { error: 'Wrong login or password' },
      { status: 400 },
    );
  }
  const admin = await verifyAdminCredentials(phone, password, clubId);
  if (!admin) {
    return NextResponse.json(
      { error: 'Wrong login or password' },
      { status: 401 },
    );
  }
  await grantAdminAccess(admin);
  return NextResponse.json({ ok: true });
}

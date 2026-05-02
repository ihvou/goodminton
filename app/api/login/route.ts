import { NextResponse } from 'next/server';
import { getSession, verifyAdminCredentials } from '@/lib/auth';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { username?: unknown; password?: unknown }
    | null;
  const username = body && typeof body.username === 'string' ? body.username : '';
  const password = body && typeof body.password === 'string' ? body.password : '';
  if (!username || !password) {
    return NextResponse.json(
      { error: 'Wrong login or password' },
      { status: 400 },
    );
  }
  const ok = await verifyAdminCredentials(username, password);
  if (!ok) {
    return NextResponse.json(
      { error: 'Wrong login or password' },
      { status: 401 },
    );
  }
  const session = await getSession();
  session.isAdmin = true;
  await session.save();
  return NextResponse.json({ ok: true });
}

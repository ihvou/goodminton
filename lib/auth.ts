import 'server-only';
import { getIronSession, type SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { clubAdmins, clubs } from '@/db/schema';
import { cleanAccessCode } from '@/lib/phone';
import { verifyPassword } from '@/lib/passwords';
import { eq } from 'drizzle-orm';

export type SessionData = {
  clubId?: string;
  clubName?: string;
  viewerAccessGranted?: boolean;
  isAdmin?: boolean;
  adminId?: string;
};

function getSessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error('SESSION_SECRET must be set and at least 32 characters');
  }
  return {
    password,
    cookieName: 'goodminton_session',
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 400,
    },
  };
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), getSessionOptions());
}

export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return !!session.clubId && !!session.isAdmin;
}

export async function getSessionClub() {
  const session = await getSession();
  if (!session.clubId || !session.viewerAccessGranted) return null;
  const storedClub = await db.query.clubs.findFirst({
    where: eq(clubs.id, session.clubId),
  });
  if (!storedClub) return null;
  const club = storedClub.isDemo
    ? await import('@/lib/demo').then((mod) => mod.ensureDemoClubReady())
    : storedClub;
  return {
    id: club.id,
    name: club.name,
    isDemo: club.isDemo,
    isAdmin: !!session.isAdmin,
    adminId: session.adminId ?? null,
  };
}

export async function requireClubAccess() {
  const club = await getSessionClub();
  if (!club) throw new Error('Club access required');
  return club;
}

export async function requireAdmin(): Promise<{
  clubId: string;
  adminId: string | null;
}> {
  const session = await getSession();
  if (!session.clubId || !session.isAdmin) {
    throw new Error('Not authorized');
  }
  return { clubId: session.clubId, adminId: session.adminId ?? null };
}

export async function grantClubAccess(club: { id: string; name: string }) {
  const session = await getSession();
  session.clubId = club.id;
  session.clubName = club.name;
  session.viewerAccessGranted = true;
  session.isAdmin = false;
  session.adminId = undefined;
  await session.save();
}

export async function grantAdminAccess(input: {
  clubId: string;
  clubName: string;
  adminId: string;
}) {
  const session = await getSession();
  session.clubId = input.clubId;
  session.clubName = input.clubName;
  session.viewerAccessGranted = true;
  session.isAdmin = true;
  session.adminId = input.adminId;
  await session.save();
}

export async function findClubByAccessCode(accessCode: string) {
  const code = cleanAccessCode(accessCode);
  return db.query.clubs.findFirst({
    where: eq(clubs.accessCode, code),
  });
}

export async function verifyAdminCredentials(
  phone: string,
  password: string,
): Promise<
  | {
      adminId: string;
      clubId: string;
      clubName: string;
    }
  | null
> {
  const normalizedPhone = cleanAccessCode(phone);
  const admin = await db.query.clubAdmins.findFirst({
    where: eq(clubAdmins.phone, normalizedPhone),
  });
  if (!admin) return null;
  const ok = await verifyPassword(password, admin.passwordHash);
  if (!ok) return null;
  const club = await db.query.clubs.findFirst({
    where: eq(clubs.id, admin.clubId),
  });
  if (!club) return null;
  return {
    adminId: admin.id,
    clubId: club.id,
    clubName: club.name,
  };
}

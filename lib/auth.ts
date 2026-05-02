import 'server-only';
import { getIronSession, type SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export type SessionData = {
  isAdmin?: boolean;
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
      maxAge: 60 * 60 * 24 * 30,
    },
  };
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), getSessionOptions());
}

export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return !!session.isAdmin;
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    throw new Error('Not authorized');
  }
}

export async function verifyAdminCredentials(
  username: string,
  password: string,
): Promise<boolean> {
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPass) return false;
  return username === expectedUser && password === expectedPass;
}

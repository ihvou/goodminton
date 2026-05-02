import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  const session = await getSession();
  session.destroy();
  return Response.redirect(new URL('/', req.url), 303);
}

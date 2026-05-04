import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import { loadMembers } from '@/lib/queries';
import { PlayersView } from '@/components/players-view';

export const dynamic = 'force-dynamic';

export default async function PlayersPage() {
  if (!(await isAdmin())) redirect('/login');
  const members = await loadMembers();
  return <PlayersView members={members} />;
}

import { redirect } from 'next/navigation';
import { getSessionClub } from '@/lib/auth';
import { loadAllMatches, loadMembers } from '@/lib/queries';
import { StatsView } from '@/components/stats-view';

export const dynamic = 'force-dynamic';

export default async function StatsPage() {
  const club = await getSessionClub();
  if (!club) redirect('/');
  const [matches, members] = await Promise.all([
    loadAllMatches(club.id),
    loadMembers(club.id),
  ]);
  return <StatsView allMatches={matches} members={members} />;
}

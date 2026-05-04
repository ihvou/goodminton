import { loadAllMatches, loadMembers } from '@/lib/queries';
import { StatsView } from '@/components/stats-view';

export const dynamic = 'force-dynamic';

export default async function StatsPage() {
  const [matches, members] = await Promise.all([loadAllMatches(), loadMembers()]);
  return <StatsView allMatches={matches} members={members} />;
}

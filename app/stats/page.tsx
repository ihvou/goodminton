import { loadAllMatches } from '@/lib/queries';
import { StatsView } from '@/components/stats-view';

export const dynamic = 'force-dynamic';

export default async function StatsPage() {
  const matches = await loadAllMatches();
  return <StatsView allMatches={matches} />;
}

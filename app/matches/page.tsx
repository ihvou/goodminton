import { redirect } from 'next/navigation';
import { getSessionClub } from '@/lib/auth';
import {
  loadAllMatches,
  loadDayCounts,
  loadDayMatches,
  loadDayTeams,
  loadMembers,
} from '@/lib/queries';
import {
  todayIso,
  currentWeekPlayDays,
  upcomingPlayDays,
  toIsoDate,
  isPast,
  fromIsoDate,
  latestPlayDayOnOrBefore,
} from '@/lib/dates';
import { MatchesView } from '@/components/matches-view';

export const dynamic = 'force-dynamic';

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const club = await getSessionClub();
  if (!club) redirect('/');

  const params = await searchParams;
  const today = todayIso();

  const [dayCounts, members, allMatches] = await Promise.all([
    loadDayCounts(club.id),
    loadMembers(club.id),
    loadAllMatches(club.id),
  ]);
  const matchDates = Array.from(dayCounts.entries())
    .filter(([, count]) => count > 0)
    .map(([iso]) => iso);
  const sortedMatchDates = [...matchDates].sort();
  const latestMatchDate = sortedMatchDates[sortedMatchDates.length - 1];
  const fallbackDate = toIsoDate(latestPlayDayOnOrBefore(fromIsoDate(today)));
  const selectedDate = params.d ?? latestMatchDate ?? fallbackDate;
  const [matches, dayTeams] = await Promise.all([
    loadDayMatches(club.id, selectedDate),
    loadDayTeams(club.id, selectedDate),
  ]);

  const pastDates = matchDates.filter((iso) => isPast(iso));
  const thisWeek = currentWeekPlayDays().map(toIsoDate);
  const upcoming = upcomingPlayDays(fromIsoDate(today), 2).map(toIsoDate);
  const allDates = new Set<string>([
    ...pastDates,
    ...thisWeek,
    ...upcoming,
    selectedDate,
  ]);
  const dayList = Array.from(allDates)
    .sort()
    .map((iso) => ({ iso, count: dayCounts.get(iso) ?? 0 }));

  return (
    <MatchesView
      selectedDate={selectedDate}
      dayList={dayList}
      matches={matches}
      dayTeams={dayTeams}
      allMatches={allMatches}
      members={members}
      isAdmin={club.isAdmin}
    />
  );
}

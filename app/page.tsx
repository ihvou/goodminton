import { isAdmin } from '@/lib/auth';
import { loadDayCounts, loadDayMatches } from '@/lib/queries';
import {
  todayIso,
  currentWeekPlayDays,
  upcomingPlayDays,
  toIsoDate,
  isPast,
  fromIsoDate,
} from '@/lib/dates';
import { MatchesView } from '@/components/matches-view';

export const dynamic = 'force-dynamic';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const params = await searchParams;
  const today = todayIso();

  const [dayCounts, admin] = await Promise.all([
    loadDayCounts(),
    isAdmin(),
  ]);
  const matchDates = Array.from(dayCounts.entries())
    .filter(([, count]) => count > 0)
    .map(([iso]) => iso);
  const sortedMatchDates = [...matchDates].sort();
  const latestMatchDate = sortedMatchDates[sortedMatchDates.length - 1];
  const selectedDate = params.d ?? latestMatchDate ?? today;
  const matches = await loadDayMatches(selectedDate);

  // Build the day strip:
  //  - play dates with games (left)
  //  - this week's M/W/F (center)
  //  - next 2 upcoming play days (right)
  //  - selected date, always present
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
      isAdmin={admin}
    />
  );
}

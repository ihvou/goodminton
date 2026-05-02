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
  const selectedDate = params.d ?? today;

  const [dayCounts, matches, admin] = await Promise.all([
    loadDayCounts(),
    loadDayMatches(selectedDate),
    isAdmin(),
  ]);

  // Build the day strip:
  //  - past play dates with games (left)
  //  - this week's M/W/F (center)
  //  - next 2 upcoming play days (right)
  //  - selected date + today, always present
  const pastDates = Array.from(dayCounts.keys()).filter((iso) => isPast(iso));
  const thisWeek = currentWeekPlayDays().map(toIsoDate);
  const upcoming = upcomingPlayDays(fromIsoDate(today), 2).map(toIsoDate);
  const allDates = new Set<string>([
    ...pastDates,
    ...thisWeek,
    ...upcoming,
    selectedDate,
    today,
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

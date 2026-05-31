import { redirect } from 'next/navigation';
import { getSessionClub } from '@/lib/auth';
import {
  loadAllMatches,
  loadClubSettings,
  loadDayCounts,
  loadDayTeams,
  loadMembers,
} from '@/lib/queries';
import {
  currentWeekPlayDays,
  fromIsoDate,
  isPast,
  latestPlayDayOnOrBefore,
  todayIso,
  toIsoDate,
  upcomingPlayDays,
} from '@/lib/dates';
import { PlayersView } from '@/components/players-view';

export const dynamic = 'force-dynamic';

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const club = await getSessionClub();
  if (!club) redirect('/');
  if (!club.isAdmin) redirect('/login');
  const params = await searchParams;
  const today = todayIso();
  const [members, allMatches, dayCounts, settings] = await Promise.all([
    loadMembers(club.id),
    loadAllMatches(club.id),
    loadDayCounts(club.id),
    loadClubSettings(club.id),
  ]);
  const fallbackDate = toIsoDate(
    latestPlayDayOnOrBefore(fromIsoDate(today), settings.playWeekdays),
  );
  const selectedDate = params.d ?? fallbackDate;
  const teams = await loadDayTeams(club.id, selectedDate);

  const matchDates = Array.from(dayCounts.entries())
    .filter(([, count]) => count > 0)
    .map(([iso]) => iso);
  const thisWeek = currentWeekPlayDays(settings.playWeekdays).map(toIsoDate);
  const upcoming = upcomingPlayDays(
    fromIsoDate(today),
    2,
    settings.playWeekdays,
  ).map(toIsoDate);
  const allDates = new Set<string>([
    ...matchDates.filter((iso) => isPast(iso)),
    ...thisWeek,
    ...upcoming,
    selectedDate,
  ]);
  const dayList = Array.from(allDates)
    .sort()
    .map((iso) => ({ iso, count: dayCounts.get(iso) ?? 0 }));

  return (
    <PlayersView
      selectedDate={selectedDate}
      dayList={dayList}
      members={members}
      teams={teams}
      allMatches={allMatches}
    />
  );
}

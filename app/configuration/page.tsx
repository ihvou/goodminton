import { redirect } from 'next/navigation';
import { getSessionClub } from '@/lib/auth';
import { loadClubSettings } from '@/lib/queries';
import { SettingsView } from '@/components/settings-view';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const club = await getSessionClub();
  if (!club) redirect('/');
  if (!club.isAdmin) redirect('/login');

  const settings = await loadClubSettings(club.id);
  return <SettingsView settings={settings} />;
}

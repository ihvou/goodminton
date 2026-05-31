import { redirect } from 'next/navigation';
import { getSessionClub } from '@/lib/auth';
import { AccessClubForm } from '@/components/access-club-form';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const club = await getSessionClub();
  if (club) redirect('/matches');
  return <AccessClubForm />;
}

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionClub } from '@/lib/auth';
import { RegisterClubForm } from '@/components/register-club-form';

export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  const club = await getSessionClub();
  if (club?.isAdmin) redirect('/matches');

  return (
    <div className="mx-auto max-w-sm pt-12">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">Register club</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Create a club. Members will use the admin phone number as the access code.
        </p>
      </div>
      <RegisterClubForm />
      <Link
        href="/"
        className="mt-4 block text-center text-sm text-neutral-500 transition hover:text-neutral-950"
      >
        Back to club access
      </Link>
    </div>
  );
}

import Link from 'next/link';
import { getSessionClub } from '@/lib/auth';
import { TabNav } from '@/components/tab-nav';
import { Logo } from '@/components/logo';
import { ClubIcon } from '@/components/club-icon';

export async function Header() {
  const club = await getSessionClub();
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-screen-md items-center justify-between px-4 pt-3 pb-2">
        <Link
          href={club ? '/matches' : '/'}
          className="flex items-center gap-1.5 text-base font-semibold tracking-tight"
        >
          {club ? <ClubIcon icon={club.icon} size={18} /> : <Logo size={18} />}
          <span className="truncate">{club?.name ?? 'Goodminton'}</span>
        </Link>
        {club?.isAdmin ? (
          <form action="/api/logout" method="POST">
            <button
              type="submit"
              className="text-sm text-neutral-500 transition hover:text-neutral-950"
            >
              Logout
            </button>
          </form>
        ) : club ? (
          <Link
            href="/login"
            className="text-sm text-neutral-500 transition hover:text-neutral-950"
          >
            Log in
          </Link>
        ) : null}
      </div>
      {club && <TabNav isAdmin={club.isAdmin} />}
    </header>
  );
}

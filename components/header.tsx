import Link from 'next/link';
import { isAdmin } from '@/lib/auth';
import { TabNav } from '@/components/tab-nav';

export async function Header() {
  const admin = await isAdmin();
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-screen-md items-center justify-between px-4 pt-3 pb-2">
        <Link href="/" className="text-base font-semibold tracking-tight">
          Goodminton
        </Link>
        {admin ? (
          <form action="/api/logout" method="POST">
            <button
              type="submit"
              className="text-sm text-neutral-500 transition hover:text-neutral-950"
            >
              Logout
            </button>
          </form>
        ) : (
          <Link
            href="/login"
            className="text-sm text-neutral-500 transition hover:text-neutral-950"
          >
            Log in
          </Link>
        )}
      </div>
      <TabNav />
    </header>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/', label: 'Matches' },
  { href: '/stats', label: 'Stats' },
];

export function TabNav() {
  const pathname = usePathname();
  return (
    <nav className="mx-auto flex max-w-screen-md items-center gap-6 px-4">
      {TABS.map((tab) => {
        const active =
          tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'relative -mb-px py-3 text-sm transition',
              active
                ? 'font-semibold text-neutral-950'
                : 'text-neutral-500 hover:text-neutral-950',
            )}
          >
            {tab.label}
            {active && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-neutral-950" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

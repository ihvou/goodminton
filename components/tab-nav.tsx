'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/matches', label: 'Matches' },
  { href: '/stats', label: 'Stats' },
];

export function TabNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const tabs = isAdmin
    ? [
        ...TABS,
        { href: '/players', label: 'Players' },
        { href: '/configuration', label: 'Configuration' },
      ]
    : TABS;
  return (
    <nav className="mx-auto flex max-w-screen-md items-center gap-6 overflow-x-auto px-4">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'relative -mb-px shrink-0 py-3 text-sm transition',
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

'use client';

import { useEffect, useRef } from 'react';
import { fromIsoDate, formatTab, isToday, isFuture } from '@/lib/dates';
import { cn } from '@/lib/utils';

export type DayItem = { iso: string; count: number };

export function DayStrip({
  days,
  selected,
  onSelect,
}: {
  days: DayItem[];
  selected: string;
  onSelect: (iso: string) => void;
}) {
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({
      behavior: 'auto',
      inline: 'center',
      block: 'nearest',
    });
  }, [selected]);

  return (
    <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto overflow-y-hidden px-4 py-3">
      {days.map((day) => {
        const isSel = day.iso === selected;
        const today = isToday(day.iso);
        const future = isFuture(day.iso);
        const dim = future && day.count === 0 && !isSel;
        return (
          <button
            key={day.iso}
            ref={isSel ? selectedRef : null}
            type="button"
            onClick={() => onSelect(day.iso)}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs transition',
              isSel
                ? 'bg-neutral-950 text-white'
                : 'text-neutral-700 hover:bg-neutral-100',
              today && !isSel && 'font-semibold text-neutral-950',
              dim && 'text-neutral-300',
            )}
          >
            {formatTab(fromIsoDate(day.iso))}
            {day.count > 0 && (
              <span className="ml-1.5 text-[10px] opacity-70">· {day.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

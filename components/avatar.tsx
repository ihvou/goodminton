import Image from 'next/image';
import { cn, initials, colorFromId } from '@/lib/utils';
import type { Member } from '@/lib/members';

const SIZES = {
  xs: { class: 'h-7 w-7 text-[9px]', px: 28 },
  sm: { class: 'h-9 w-9 text-[10px]', px: 36 },
  md: { class: 'h-11 w-11 text-xs', px: 44 },
  lg: { class: 'h-14 w-14 text-sm', px: 56 },
} as const;

export function Avatar({
  member,
  size = 'md',
  className,
}: {
  member: Member;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];
  if (member.avatar) {
    const isDataUrl = member.avatar.startsWith('data:');
    return (
      <Image
        src={member.avatar}
        alt={member.name}
        width={s.px * 2}
        height={s.px * 2}
        unoptimized={isDataUrl}
        className={cn('rounded-full object-cover', s.class, className)}
      />
    );
  }
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-medium uppercase text-white',
        s.class,
        className,
      )}
      style={{ backgroundColor: colorFromId(member.id) }}
      aria-label={member.name}
    >
      {initials(member.name)}
    </div>
  );
}

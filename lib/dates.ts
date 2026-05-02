import {
  addDays,
  format,
  isMonday,
  isWednesday,
  isFriday,
  startOfWeek,
  parseISO,
  isAfter,
  isBefore,
  startOfDay,
} from 'date-fns';
import { CLUB_TIMEZONE } from './config';

export const PLAY_WEEKDAYS = [1, 3, 5] as const; // Mon, Wed, Fri

export function isPlayDay(d: Date): boolean {
  return isMonday(d) || isWednesday(d) || isFriday(d);
}

export function toIsoDate(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function fromIsoDate(s: string): Date {
  return parseISO(s);
}

export function formatTab(d: Date): string {
  return format(d, 'EEE d MMM');
}

export function formatLong(d: Date): string {
  return format(d, 'EEEE d MMMM yyyy');
}

/** Today's date as YYYY-MM-DD, in the club timezone. */
export function todayIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CLUB_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function todayDate(): Date {
  return parseISO(todayIso() + 'T00:00:00');
}

export function isToday(iso: string): boolean {
  return iso === todayIso();
}

export function isPast(iso: string): boolean {
  return isBefore(parseISO(iso), startOfDay(todayDate()));
}

export function isFuture(iso: string): boolean {
  return isAfter(parseISO(iso), startOfDay(todayDate()));
}

/** Mon/Wed/Fri of the week containing `today`. */
export function currentWeekPlayDays(today = todayDate()): Date[] {
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  return [0, 2, 4].map((offset) => addDays(weekStart, offset));
}

/** Next N play days strictly after `after`. */
export function upcomingPlayDays(after: Date, count: number): Date[] {
  const out: Date[] = [];
  let cursor = addDays(after, 1);
  while (out.length < count) {
    if (isPlayDay(cursor)) out.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return out;
}

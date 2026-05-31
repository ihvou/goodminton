import {
  addDays,
  format,
  startOfWeek,
  parseISO,
  isAfter,
  isBefore,
  startOfDay,
} from 'date-fns';
import { CLUB_TIMEZONE } from './config';
import { DEFAULT_PLAY_WEEKDAYS, sortWeekdays } from '@/lib/club-settings';

export const PLAY_WEEKDAYS = DEFAULT_PLAY_WEEKDAYS;

function weekdayOffset(weekday: number): number {
  return weekday === 0 ? 6 : weekday - 1;
}

export function isPlayDay(
  d: Date,
  playWeekdays: readonly number[] = DEFAULT_PLAY_WEEKDAYS,
): boolean {
  return playWeekdays.includes(d.getDay());
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

/** Configured play days of the week containing `today`. */
export function currentWeekPlayDays(
  playWeekdays: readonly number[] = DEFAULT_PLAY_WEEKDAYS,
  today = todayDate(),
): Date[] {
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  return sortWeekdays(playWeekdays).map((weekday) =>
    addDays(weekStart, weekdayOffset(weekday)),
  );
}

/** Next N play days strictly after `after`. */
export function upcomingPlayDays(
  after: Date,
  count: number,
  playWeekdays: readonly number[] = DEFAULT_PLAY_WEEKDAYS,
): Date[] {
  const out: Date[] = [];
  let cursor = addDays(after, 1);
  while (out.length < count) {
    if (isPlayDay(cursor, playWeekdays)) out.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return out;
}

export function latestPlayDayOnOrBefore(
  date: Date,
  playWeekdays: readonly number[] = DEFAULT_PLAY_WEEKDAYS,
): Date {
  let cursor = date;
  while (!isPlayDay(cursor, playWeekdays)) {
    cursor = addDays(cursor, -1);
  }
  return cursor;
}

export const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
] as const;

export const DEFAULT_PLAY_WEEKDAYS = [1, 3, 5] as const;

export const ROTATION_ALGORITHMS = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'americano', label: 'Americano' },
  { value: 'mexicano', label: 'Mexicano' },
] as const;

export type RotationAlgorithm = (typeof ROTATION_ALGORITHMS)[number]['value'];

export type ClubSettings = {
  playWeekdays: number[];
  rotationAlgorithm: RotationAlgorithm;
};

export const DEFAULT_ROTATION_ALGORITHM: RotationAlgorithm = 'balanced';

const WEEKDAY_VALUES = new Set<number>(
  WEEKDAY_OPTIONS.map((option) => option.value),
);
const ROTATION_VALUES = new Set(
  ROTATION_ALGORITHMS.map((algorithm) => algorithm.value),
);

export function sortWeekdays(days: readonly number[]): number[] {
  const order = new Map<number, number>(
    WEEKDAY_OPTIONS.map((option, index) => [option.value, index]),
  );
  return [...days].sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99));
}

export function serializeWeekdays(days: readonly number[]): string {
  return sortWeekdays(days).join(',');
}

export function parseWeekdays(value: string | null | undefined): number[] {
  const parsed = (value ?? '')
    .split(',')
    .map((part) => Number(part))
    .filter((day) => Number.isInteger(day) && WEEKDAY_VALUES.has(day));
  const unique = Array.from(new Set(parsed));
  return unique.length > 0 ? sortWeekdays(unique) : [...DEFAULT_PLAY_WEEKDAYS];
}

export function cleanWeekdays(value: unknown): number[] {
  if (!Array.isArray(value)) throw new Error('Select at least one match day');
  const unique = Array.from(
    new Set(
      value
        .map((day) => Number(day))
        .filter((day) => Number.isInteger(day) && WEEKDAY_VALUES.has(day)),
    ),
  );
  if (unique.length === 0) throw new Error('Select at least one match day');
  return sortWeekdays(unique);
}

export function cleanRotationAlgorithm(value: unknown): RotationAlgorithm {
  return typeof value === 'string' &&
    ROTATION_VALUES.has(value as RotationAlgorithm)
    ? (value as RotationAlgorithm)
    : DEFAULT_ROTATION_ALGORITHM;
}

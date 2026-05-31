export const CLUB_ICON_IDS = [
  'trophy',
  'target',
  'zap',
  'flame',
  'star',
  'shield',
  'award',
  'crown',
  'dumbbell',
  'medal',
  'rocket',
  'sparkles',
  'swords',
  'waves',
] as const;

export type ClubIconId = (typeof CLUB_ICON_IDS)[number];

export const DEFAULT_CLUB_ICON: ClubIconId = 'trophy';

export function cleanClubIcon(value: unknown): ClubIconId {
  return typeof value === 'string' &&
    CLUB_ICON_IDS.includes(value as ClubIconId)
    ? (value as ClubIconId)
    : DEFAULT_CLUB_ICON;
}

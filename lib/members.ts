export type Member = {
  id: string;
  name: string;
  avatar?: string | null;
  isPlaying: boolean;
};

export const DEFAULT_MEMBERS: readonly Member[] = [
  { id: 'tsugi', name: 'Tsugi', avatar: '/avatars/tsugi.jpg', isPlaying: true },
  { id: 'rahmad', name: 'Rahmad', avatar: '/avatars/rahmad.jpg', isPlaying: true },
  { id: 'hadrien', name: 'Hadrien', avatar: '/avatars/hadrien.jpg', isPlaying: true },
  { id: 'denis', name: 'Denis', avatar: '/avatars/denis.jpg', isPlaying: true },
  { id: 'komang', name: 'Komang', isPlaying: true },
  { id: 'arif', name: 'Arif', avatar: '/avatars/arif.jpg', isPlaying: true },
  { id: 'matej', name: 'Matej', avatar: '/avatars/matej.jpg', isPlaying: true },
  { id: 'sergii', name: 'Sergii', avatar: '/avatars/sergii.jpg', isPlaying: true },
  { id: 'mao', name: 'Mao', isPlaying: true },
  { id: 'scott', name: 'Scott', avatar: '/avatars/scott.jpg', isPlaying: true },
  { id: 'johan', name: 'Johan', isPlaying: true },
  { id: 'vincent', name: 'Vincent', avatar: '/avatars/vincent.jpg', isPlaying: true },
] as const;

export const MEMBERS = DEFAULT_MEMBERS;

export function sortMembers(members: readonly Member[]): Member[] {
  return [...members].sort((a, b) => a.name.localeCompare(b.name));
}

export function memberMap(members: readonly Member[]): Map<string, Member> {
  return new Map(members.map((m) => [m.id, m]));
}

export function getMember(
  id: string,
  members: readonly Member[] = DEFAULT_MEMBERS,
): Member | undefined {
  return memberMap(members).get(id);
}

export function getMemberOrFallback(
  id: string,
  members: readonly Member[] = DEFAULT_MEMBERS,
): Member {
  return getMember(id, members) ?? { id, name: id, isPlaying: true };
}

export function isDefaultMember(id: string): boolean {
  return DEFAULT_MEMBERS.some((m) => m.id === id);
}

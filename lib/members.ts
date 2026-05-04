export type Member = {
  id: string;
  name: string;
  avatar?: string | null;
};

export const DEFAULT_MEMBERS: readonly Member[] = [
  { id: 'tsugi', name: 'Tsugi', avatar: '/avatars/tsugi.jpg' },
  { id: 'rahmad', name: 'Rahmad', avatar: '/avatars/rahmad.jpg' },
  { id: 'hadrien', name: 'Hadrien', avatar: '/avatars/hadrien.jpg' },
  { id: 'denis', name: 'Denis', avatar: '/avatars/denis.jpg' },
  { id: 'komang', name: 'Komang' },
  { id: 'arif', name: 'Arif', avatar: '/avatars/arif.jpg' },
  { id: 'matej', name: 'Matej', avatar: '/avatars/matej.jpg' },
  { id: 'sergii', name: 'Sergii', avatar: '/avatars/sergii.jpg' },
  { id: 'mao', name: 'Mao' },
  { id: 'scott', name: 'Scott', avatar: '/avatars/scott.jpg' },
  { id: 'johan', name: 'Johan' },
  { id: 'vincent', name: 'Vincent', avatar: '/avatars/vincent.jpg' },
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
  return getMember(id, members) ?? { id, name: id };
}

export function isDefaultMember(id: string): boolean {
  return DEFAULT_MEMBERS.some((m) => m.id === id);
}

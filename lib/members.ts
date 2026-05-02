export type Member = {
  id: string;
  name: string;
  avatar?: string;
};

export const MEMBERS: readonly Member[] = [
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
] as const;

const BY_ID: Record<string, Member> = Object.fromEntries(
  MEMBERS.map((m) => [m.id, m]),
);

export function getMember(id: string): Member | undefined {
  return BY_ID[id];
}

export function getMemberOrFallback(id: string): Member {
  return BY_ID[id] ?? { id, name: id };
}

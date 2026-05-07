'use client';

import { useRef, useState, useTransition } from 'react';
import { Circle, CircleCheck, ImagePlus, Plus, Trash2, X } from 'lucide-react';
import {
  createMember,
  deleteMember,
  updateMember,
  updateMemberPlaying,
} from '@/lib/actions';
import { sortMembers, type Member } from '@/lib/members';
import { Avatar } from './avatar';
import { cn } from '@/lib/utils';

type Draft = {
  id: string | null;
  name: string;
  avatar: string | null;
};

const MAX_SOURCE_IMAGE_BYTES = 20_000_000;
const MAX_AVATAR_DATA_URL_LENGTH = 1_400_000;
const AVATAR_MAX_SIDE = 512;
const AVATAR_QUALITY = 0.82;

const EMPTY_DRAFT: Draft = {
  id: null,
  name: '',
  avatar: null,
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not read avatar image'));
    image.src = src;
  });
}

async function resizeAvatar(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (width < 1 || height < 1) throw new Error('Could not read avatar image');

    const scale = Math.min(1, AVATAR_MAX_SIDE / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not resize avatar image');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const avatar = canvas.toDataURL('image/jpeg', AVATAR_QUALITY);
    if (avatar.length > MAX_AVATAR_DATA_URL_LENGTH) {
      throw new Error('Avatar image is too large');
    }
    return avatar;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function PlayersView({ members }: { members: Member[] }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playingOverrides, setPlayingOverrides] = useState<
    Record<string, boolean>
  >({});
  const [playingPendingIds, setPlayingPendingIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const sorted = sortMembers(members);
  const isMemberPlaying = (member: Member) =>
    playingOverrides[member.id] ?? member.isPlaying;
  const playingCount = sorted.filter(isMemberPlaying).length;

  function startAdd() {
    setDraft(EMPTY_DRAFT);
    setError(null);
  }

  function startEdit(member: Member) {
    setDraft({
      id: member.id,
      name: member.name,
      avatar: member.avatar ?? null,
    });
    setError(null);
  }

  async function onAvatarFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Avatar must be an image');
      return;
    }
    if (file.size > MAX_SOURCE_IMAGE_BYTES) {
      setError('Photo is too large to process');
      return;
    }
    setAvatarBusy(true);
    try {
      const avatar = await resizeAvatar(file);
      setDraft((d) => (d ? { ...d, avatar } : d));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resize avatar image');
    } finally {
      setAvatarBusy(false);
    }
  }

  function saveDraft() {
    if (!draft || pending || avatarBusy) return;
    setError(null);
    startTransition(async () => {
      try {
        if (draft.id) {
          await updateMember({
            id: draft.id,
            name: draft.name,
            avatar: draft.avatar,
          });
        } else {
          await createMember({
            name: draft.name,
            avatar: draft.avatar,
          });
        }
        setDraft(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save player');
      }
    });
  }

  function removeMember(member: Member) {
    if (pending) return;
    if (!confirm(`Delete ${member.name}?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteMember({ id: member.id });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to delete player');
      }
    });
  }

  function setPlaying(member: Member, isPlaying: boolean) {
    if (playingPendingIds.has(member.id)) return;
    setError(null);
    setPlayingOverrides((overrides) => ({ ...overrides, [member.id]: isPlaying }));
    setPlayingPendingIds((ids) => new Set(ids).add(member.id));

    void (async () => {
      try {
        await updateMemberPlaying({ id: member.id, isPlaying });
      } catch (e) {
        setPlayingOverrides((overrides) => ({
          ...overrides,
          [member.id]: member.isPlaying,
        }));
        setError(e instanceof Error ? e.message : 'Failed to update player');
      } finally {
        setPlayingPendingIds((ids) => {
          const next = new Set(ids);
          next.delete(member.id);
          return next;
        });
      }
    })();
  }

  return (
    <div className="space-y-4 pt-4 pb-24">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Players</h1>
          <p className="text-xs text-neutral-500">
            {sorted.length === 1 ? '1 player' : `${sorted.length} players`} -{' '}
            {playingCount} playing
          </p>
        </div>
        <button
          type="button"
          onClick={startAdd}
          className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-950 px-3 py-2 text-sm font-medium text-white"
        >
          <Plus size={15} />
          Add
        </button>
      </div>

      {draft && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar
                member={{
                  id: draft.id ?? (draft.name || 'new'),
                  name: draft.name || 'Player',
                  avatar: draft.avatar,
                  isPlaying: true,
                }}
                size="lg"
              />
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={avatarBusy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-700 disabled:opacity-50"
                >
                  <ImagePlus size={14} />
                  {avatarBusy ? 'Preparing...' : 'Avatar'}
                </button>
                {draft.avatar && (
                  <button
                    type="button"
                    onClick={() => setDraft((d) => (d ? { ...d, avatar: null } : d))}
                    className="block text-left text-xs text-neutral-500"
                  >
                    Remove avatar
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  void onAvatarFile(e.currentTarget.files?.[0]);
                  e.currentTarget.value = '';
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-medium text-neutral-500">
              Name
            </span>
            <input
              type="text"
              value={draft.name}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, name: e.target.value } : d))
              }
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base outline-none transition focus:border-neutral-950"
              autoComplete="off"
            />
          </label>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <button
            type="button"
            onClick={saveDraft}
            disabled={pending || avatarBusy}
            className="mt-4 w-full rounded-xl bg-neutral-950 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
          >
            {avatarBusy
              ? 'Preparing...'
              : pending
                ? 'Saving...'
                : draft.id
                  ? 'Save player'
                  : 'Add player'}
          </button>
        </section>
      )}

      {!draft && error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-2">
        {sorted.map((member) => {
          const isPlaying = isMemberPlaying(member);
          const isSavingPlaying = playingPendingIds.has(member.id);
          return (
            <article
              key={member.id}
              className={cn(
                'flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3 transition',
                !isPlaying && 'bg-neutral-50 text-neutral-500',
              )}
            >
              <button
                type="button"
                aria-pressed={isPlaying}
                aria-label={
                  isPlaying
                    ? `Mark ${member.name} as not playing today`
                    : `Mark ${member.name} as playing today`
                }
                onClick={() => setPlaying(member, !isPlaying)}
                disabled={isSavingPlaying}
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:bg-neutral-100 disabled:opacity-70',
                  isPlaying ? 'text-emerald-600' : 'text-neutral-300',
                )}
              >
                {isPlaying ? (
                  <CircleCheck size={24} strokeWidth={2.4} />
                ) : (
                  <Circle size={24} strokeWidth={2.2} />
                )}
              </button>
              <Avatar member={member} size="md" />
              <button
                type="button"
                onClick={() => startEdit(member)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="truncate text-sm font-medium">{member.name}</div>
                <div className="truncate text-xs text-neutral-400">
                  {member.id} - {isPlaying ? 'Playing' : 'Out'}
                </div>
              </button>
              <button
                type="button"
                onClick={() => removeMember(member)}
                disabled={pending}
                className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                aria-label={`Delete ${member.name}`}
              >
                <Trash2 size={16} />
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Shuffle, X } from 'lucide-react';
import { sortMembers, type Member } from '@/lib/members';
import { Avatar } from './avatar';
import { cn } from '@/lib/utils';

const noopSubscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function MemberPicker({
  open,
  members,
  excludeIds,
  selectedId,
  onPick,
  onSuggest,
  suggestDisabled = false,
  onClose,
}: {
  open: boolean;
  members: Member[];
  excludeIds: string[];
  selectedId: string | null;
  onPick: (member: Member) => void;
  onSuggest?: () => void;
  suggestDisabled?: boolean;
  onClose: () => void;
}) {
  const mounted = useSyncExternalStore(
    noopSubscribe,
    clientSnapshot,
    serverSnapshot,
  );
  const sorted = useMemo(() => sortMembers(members), [members]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;
  const excludeSet = new Set(excludeIds);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Pick player"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-neutral-950/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
          <h2 className="text-base font-semibold tracking-tight">Pick player</h2>
          <div className="flex items-center gap-1.5">
            {onSuggest && (
              <button
                type="button"
                onClick={onSuggest}
                disabled={suggestDisabled}
                className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:border-neutral-950 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Shuffle size={13} />
                Suggest
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        {sorted.length === 0 ? (
          <div className="px-5 pb-6 text-sm text-neutral-500">
            No players checked.
          </div>
        ) : (
          <div className="grid max-h-[70vh] grid-cols-2 gap-1 overflow-y-auto px-3 pb-5">
            {sorted.map((member) => {
              const disabled = excludeSet.has(member.id);
              const selected = selectedId === member.id;
              return (
                <button
                  key={member.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onPick(member)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition',
                    disabled
                      ? 'cursor-not-allowed opacity-30'
                      : 'hover:bg-neutral-100 active:bg-neutral-200',
                    selected && 'ring-1 ring-neutral-950',
                  )}
                >
                  <Avatar member={member} size="sm" />
                  <span className="truncate text-sm font-medium">
                    {member.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

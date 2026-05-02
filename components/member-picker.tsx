'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { MEMBERS, type Member } from '@/lib/members';
import { Avatar } from './avatar';
import { cn } from '@/lib/utils';

const SORTED = [...MEMBERS].sort((a, b) => a.name.localeCompare(b.name));

export function MemberPicker({
  open,
  excludeIds,
  selectedId,
  onPick,
  onClose,
}: {
  open: boolean;
  excludeIds: string[];
  selectedId: string | null;
  onPick: (member: Member) => void;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-base font-semibold tracking-tight">Pick player</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="grid max-h-[70vh] grid-cols-2 gap-1 overflow-y-auto px-3 pb-5">
          {SORTED.map((member) => {
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
                <span className="truncate text-sm font-medium">{member.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}

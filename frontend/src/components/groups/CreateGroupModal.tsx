"use client";

import { useState } from 'react';
import { Icons } from '@/lib/icons';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { title: string; description: string; is_private: boolean }) => void;
}

export function CreateGroupModal({
  isOpen,
  onClose,
  onCreate,
}: CreateGroupModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate({
      title: title.trim(),
      description: description.trim(),
      is_private: isPrivate,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-[var(--text)]">Create Group Community</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
          >
            <Icons.x className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">
              Group Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Polyglot Founders, Tokyo Coffee Talk"
              className="w-full bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this group about?"
              className="w-full bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 resize-none"
            />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4 rounded text-[var(--primary)] focus:ring-[var(--primary)]/30"
            />
            <span className="text-xs text-[var(--muted)]">
              Private room (only accessible via direct room code or invite link)
            </span>
          </label>

          <button
            type="submit"
            className="w-full py-3 rounded-full bg-[var(--primary)] text-white text-sm font-bold hover:opacity-90 transition-all shadow-md cursor-pointer mt-2"
          >
            Create Group
          </button>
        </form>
      </div>
    </div>
  );
}

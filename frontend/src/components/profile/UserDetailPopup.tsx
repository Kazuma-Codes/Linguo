"use client";

import React, { useEffect, useState } from 'react';
import { MergedAvatar } from '@/components/common/MergedAvatar';
import { Icons } from '@/lib/icons';
import { getUserById } from '@/lib/api';
import { LANGUAGE_MAP as LANG_NAMES } from '@/lib/languages';

interface UserDetailPopupProps {
  token: string | null;
  /** Backend user UUID to show. Null = closed. */
  userId: string | null;
  onClose: () => void;
  /** Open (or create) a 1:1 chat with this person. */
  onChat: (userId: string) => void;
}

export function UserDetailPopup({ token, userId, onClose, onChat }: UserDetailPopupProps) {
  const [detail, setDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || !userId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    getUserById(token, userId)
      .then((d) => setDetail(d))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [token, userId]);

  if (!userId) return null;

  const displayName =
    detail?.username || detail?.email?.split('@')[0] || 'User';
  const langName =
    LANG_NAMES[detail?.preferred_language] || detail?.preferred_language?.toUpperCase() || '';

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-[var(--card)] border border-[var(--border)] rounded-3xl w-full max-w-xs shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner */}
        <div className="h-16 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-blue-950/40" />

        <div className="px-5 pb-5 flex flex-col items-center text-center -mt-10">
          {loading || !detail ? (
            <div className="flex items-center gap-2 py-8 text-[var(--muted)]">
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading profile…</span>
            </div>
          ) : (
            <>
              <div className="ring-4 ring-[var(--card)] rounded-full shadow-md bg-[var(--card)]">
                <MergedAvatar
                  name={displayName}
                  avatarUrl={detail.avatar_url}
                  size="xl"
                  shape="circle"
                />
              </div>
              <h3 className="text-lg font-bold tracking-tight text-[var(--text)] mt-2">
                {displayName}
              </h3>
              <p className="text-xs text-[var(--muted)]">{detail.email}</p>
              {detail.about && (
                <p className="text-xs text-[var(--text)] opacity-90 mt-2">{detail.about}</p>
              )}
              {langName && (
                <span className="mt-2 px-2.5 py-1 rounded-full bg-[var(--accent-light)] text-[var(--accent-text)] border border-[var(--accent)]/20 text-[11px] font-bold uppercase tracking-wider">
                  Speaks {langName}
                </span>
              )}

              <div className="flex items-center gap-2 w-full mt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-xs font-semibold hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => onChat(detail.id)}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--primary)] text-white text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-1.5"
                  title="Chat 1:1 with this person"
                >
                  <Icons.chat className="w-4 h-4" />
                  <span>Chat</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from 'react';
import { MergedAvatar } from '@/components/common/MergedAvatar';
import { Icons } from '@/lib/icons';

export interface MemberInfo {
  user_id?: string;
  email: string;
  username?: string;
  avatar_url?: string;
  language: string;
  joined_at?: string;
}

interface RoomInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  title: string;
  description?: string;
  emoji?: string;
  avatarUrl?: string;
  members: MemberInfo[];
  distinctLangs: string[];
  currentEmail?: string;
  langNames: Record<string, string>;
  onCopyCode: () => void;
  onShareLink: () => void;
  onLeaveRoom?: () => void;
  /** 1:1 direct chat — hides invite links, room code; shows the person, not group stats. */
  isDirect?: boolean;
  /** Tap a participant to see their detail popup. */
  onSelectMember?: (userId: string) => void;
  /** True when the viewer is the group creator — shows the settings gear. */
  isAdmin?: boolean;
  /** Persist group title/description/emoji (creator only). */
  onSaveSettings?: (data: { title: string; description: string; emoji: string }) => Promise<void>;
}

export function RoomInfoDrawer({
  isOpen,
  onClose,
  roomId,
  title,
  description,
  emoji,
  avatarUrl,
  members,
  distinctLangs,
  currentEmail,
  langNames,
  onCopyCode,
  onShareLink,
  onLeaveRoom,
  isDirect = false,
  onSelectMember,
}: RoomInfoDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:justify-end bg-black/50 backdrop-blur-xs transition-all">
      <div className="bg-[var(--card)] border-l border-[var(--border)] w-full max-w-md h-full sm:h-screen flex flex-col shadow-2xl p-5 sm:p-6 overflow-y-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            {isDirect ? 'Contact Info' : 'Room Details'}
          </span>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--bg-subtle)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
          >
            <Icons.x className="w-5 h-5" />
          </button>
        </div>

        {/* Room Avatar & Info */}
        <div className="flex flex-col items-center text-center space-y-3 pb-3 border-b border-[var(--border)]">
          <MergedAvatar
            name={title}
            avatarUrl={avatarUrl}
            emoji={emoji || '💬'}
            size="xl"
          />
          <div>
            <h2 className="text-xl font-bold text-[var(--text)]">{title}</h2>
            {description && (
              <p className="text-xs text-[var(--muted)] mt-1 max-w-xs">{description}</p>
            )}
          </div>

          {/* Quick Actions (Share, Copy) — groups only; a 1:1 chat has no one to invite */}
          {!isDirect && (
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={onShareLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs font-semibold hover:bg-indigo-500/20 transition-all cursor-pointer"
              >
                <Icons.share className="w-3.5 h-3.5" />
                <span>Share Invite</span>
              </button>

              <button
                onClick={onCopyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--text)] hover:bg-[var(--card)] transition-all cursor-pointer"
              >
                <Icons.copy className="w-3.5 h-3.5 text-[var(--muted)]" />
                <span>Copy Code</span>
              </button>
            </div>
          )}
        </div>

        {/* Distinct Active Languages */}
        {distinctLangs.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              Active Languages ({distinctLangs.length})
            </label>
            <div className="flex flex-wrap gap-1.5">
              {distinctLangs.map((code) => (
                <span
                  key={code}
                  className="px-2.5 py-1 rounded-full bg-[var(--accent-light)] text-[var(--accent-text)] border border-[var(--accent)]/20 text-xs font-semibold uppercase tracking-wider"
                >
                  {langNames[code] || code}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Member Roster with Seats */}
        <div className="space-y-3 flex-1 min-h-0">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            {isDirect ? 'People' : `Participants (${members.length})`}
          </label>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {members.map((m) => (
              <div
                key={m.email}
                onClick={() => m.user_id && onSelectMember?.(m.user_id)}
                className={`flex items-center justify-between p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)]/50 ${
                  m.user_id && onSelectMember ? 'cursor-pointer hover:bg-[var(--bg-subtle)] transition-colors' : ''
                }`}
                title={m.user_id ? 'View profile' : undefined}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <MergedAvatar
                    name={m.username || m.email}
                    avatarUrl={m.avatar_url}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[var(--text)] truncate">
                      {m.username || m.email.split('@')[0]}
                      {m.email === currentEmail && ' (You)'}
                    </p>
                    <p className="text-[10px] text-[var(--muted)] truncate">{m.email}</p>
                  </div>
                </div>

                <span className="flex-none px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 text-[10px] font-bold uppercase">
                  {langNames[m.language] || m.language}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Room Code — groups only */}
        {!isDirect && (
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Room UUID</label>
            <div className="p-3 bg-[var(--bg-subtle)] rounded-xl font-mono text-[11px] text-[var(--text)] break-all border border-[var(--border)] flex items-center justify-between">
              <span>{roomId}</span>
              <button
                onClick={onCopyCode}
                className="px-2.5 py-1 rounded-lg bg-[var(--primary)] text-white text-xs font-semibold hover:opacity-90 ml-2 cursor-pointer flex-none"
              >
                Copy
              </button>
            </div>
          </div>
        )}

        {/* Leave Room Trigger */}
        {onLeaveRoom && (
          <button
            onClick={onLeaveRoom}
            className="w-full py-2.5 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-500/10 border border-red-500/20 transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <Icons.logout className="w-4 h-4" />
            <span>Leave Conversation</span>
          </button>
        )}
      </div>
    </div>
  );
}

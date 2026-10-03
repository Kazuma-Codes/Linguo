"use client";

import React, { useEffect, useRef, useState } from 'react';
import { MergedAvatar } from '@/components/common/MergedAvatar';
import { AvatarCropperPopup } from '@/components/common/AvatarCropper';
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
  /** Creator's user UUID — that row gets an Admin badge. */
  creatorId?: string;
  /** Persist group title/description/avatar (creator only). */
  onSaveSettings?: (data: { title: string; description: string; avatarUrl: string }) => Promise<void>;
  /** Promote another member to admin (admin only, groups only). */
  onTransferAdmin?: (userId: string) => Promise<void> | void;
}

export function RoomInfoDrawer({
  isOpen,
  onClose,
  roomId,
  title,
  description,
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
  isAdmin = false,
  creatorId,
  onSaveSettings,
  onTransferAdmin,
}: RoomInfoDrawerProps) {
  const [editingSettings, setEditingSettings] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editDescription, setEditDescription] = useState(description || '');
  const [editAvatar, setEditAvatar] = useState(avatarUrl || '');
  const [pendingSrc, setPendingSrc] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Refresh the form whenever a different room is opened
  useEffect(() => {
    setEditingSettings(false);
    setEditTitle(title);
    setEditDescription(description || '');
    setEditAvatar(avatarUrl || '');
    if (pendingSrc) URL.revokeObjectURL(pendingSrc);
    setPendingSrc(null);
    setSettingsError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, title, description, avatarUrl]);

  if (!isOpen) return null;

  const canEdit = isAdmin && !isDirect && !!onSaveSettings;

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setSettingsError('Please upload an image file (JPG, PNG, WebP)');
      return;
    }
    if (pendingSrc) URL.revokeObjectURL(pendingSrc);
    setPendingSrc(URL.createObjectURL(file));
    setSettingsError(null);
  };

  const closeCropper = () => {
    if (pendingSrc) URL.revokeObjectURL(pendingSrc);
    setPendingSrc(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveSettings = async () => {
    if (!onSaveSettings || !editTitle.trim()) return;
    setSavingSettings(true);
    setSettingsError(null);
    try {
      await onSaveSettings({
        title: editTitle.trim(),
        description: editDescription.trim(),
        avatarUrl: editAvatar.trim(),
      });
      setEditingSettings(false);
      if (pendingSrc) URL.revokeObjectURL(pendingSrc);
      setPendingSrc(null);
    } catch (err: any) {
      setSettingsError(err.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

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
            size="xl"
          />
          <div>
            <h2 className="text-xl font-bold text-[var(--text)]">{title}</h2>
            {description && (
              <p className="text-xs text-[var(--muted)] mt-1 max-w-xs">{description}</p>
            )}
          </div>

          {/* Quick Actions (Share, Copy, Settings) */}
          <div className="flex items-center gap-2 pt-1">
            {!isDirect && (
              <>
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
              </>
            )}
            {canEdit && (
              <button
                onClick={() => setEditingSettings((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                  editingSettings
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                    : 'border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text)] hover:bg-[var(--card)]'
                }`}
                title="Group settings (creator only)"
              >
                <Icons.sliders className="w-3.5 h-3.5" />
                <span>Settings</span>
              </button>
            )}
          </div>
        </div>

        {/* Creator-only inline settings editor (right under the Copy Code row) */}
        {canEdit && editingSettings && (
          <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-subtle)]/50 space-y-3">
            <div className="flex items-center gap-3">
              <MergedAvatar
                name={editTitle || title}
                avatarUrl={editAvatar || undefined}
                size="lg"
              />
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--text)]">Group photo</p>
                <label className="mt-1 inline-block px-3 py-1.5 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-bold hover:bg-[var(--primary)]/20 transition-colors cursor-pointer">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="sr-only"
                    onChange={handleAvatarFile}
                  />
                  <span className="pointer-events-none">Change photo</span>
                </label>
                <p className="text-[10px] text-[var(--muted)] mt-1">
                  Crop in the popup, hit ✓, then press Save below.
                </p>
              </div>
            </div>
            {pendingSrc && (
              <AvatarCropperPopup
                src={pendingSrc}
                onApply={(dataUrl) => setEditAvatar(dataUrl)}
                onClose={closeCropper}
                onPickDifferentFile={(file) => {
                  if (pendingSrc) URL.revokeObjectURL(pendingSrc);
                  setPendingSrc(URL.createObjectURL(file));
                }}
              />
            )}
            <div>
              <label className="block text-[11px] font-bold text-[var(--muted)] mb-1">Group name</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[var(--muted)] mb-1">Description</label>
              <input
                type="text"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="What is this group about?"
                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>
            {settingsError && (
              <p className="text-xs text-red-500 font-medium">{settingsError}</p>
            )}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingSettings(false)}
                className="flex-1 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={savingSettings || !editTitle.trim()}
                className="flex-1 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
              >
                {savingSettings ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}

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
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-[10px] text-[var(--muted)] truncate">{m.email}</p>
                      {creatorId && m.user_id === creatorId && (
                        <span className="flex-none px-1.5 py-px rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[9px] font-bold uppercase tracking-wider">
                          Admin
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-none items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 text-[10px] font-bold uppercase">
                    {langNames[m.language] || m.language}
                  </span>
                  {isAdmin && !isDirect && m.user_id && m.email !== currentEmail && onTransferAdmin && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onTransferAdmin(m.user_id!); }}
                      className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold hover:bg-amber-500/25 transition-colors cursor-pointer"
                      title={`Make ${m.username || m.email} the admin`}
                    >
                      Make admin
                    </button>
                  )}
                </div>
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

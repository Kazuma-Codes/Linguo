"use client";

import { useState } from 'react';
import { MergedAvatar } from '@/components/common/MergedAvatar';
import { Icons } from '@/lib/icons';

export interface RoomItem {
  id: string;
  title: string;
  source_lang?: string;
  target_lang?: string;
  room_type?: string;
  description?: string;
  emoji?: string;
  avatar_url?: string;
  members_count?: number;
  last_message?: string;
  last_message_at?: string;
}

interface GroupsTabProps {
  myRooms: RoomItem[];
  discoverableRooms: RoomItem[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onEnterRoom: (roomId: string) => void;
  onJoinRoom: (roomId: string) => void;
  onCreateGroupModal: () => void;
  /** Join by pasted invite link or raw room code. */
  onJoinByCode: (input: string) => void;
}

export function GroupsTab({
  myRooms,
  discoverableRooms,
  searchQuery,
  onSearchChange,
  onEnterRoom,
  onJoinRoom,
  onCreateGroupModal,
  onJoinByCode,
}: GroupsTabProps) {
  const [subTab, setSubTab] = useState<'joined' | 'discover'>('joined');
  const [inviteInput, setInviteInput] = useState('');

  const filteredMyRooms = myRooms.filter(
    (r) =>
      r.room_type === 'group' &&
      r.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDiscover = discoverableRooms.filter((r) =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header with Search and Create */}
      <div className="p-4 border-b border-[var(--border)] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border)] text-xs font-semibold">
            <button
              onClick={() => setSubTab('joined')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                subTab === 'joined'
                  ? 'bg-[var(--card)] text-[var(--text)] shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              My Groups ({filteredMyRooms.length})
            </button>
            <button
              onClick={() => setSubTab('discover')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                subTab === 'discover'
                  ? 'bg-[var(--card)] text-[var(--text)] shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              Discover ({discoverableRooms.length})
            </button>
          </div>

          <button
            onClick={onCreateGroupModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--primary)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-xs"
          >
            <Icons.plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Group</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Icons.search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search group communities..."
            className="w-full bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
          />
        </div>

        {/* Join by invite link or room code */}
        <div className="flex gap-2">
          <input
            type="text"
            value={inviteInput}
            onChange={(e) => setInviteInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && inviteInput.trim()) {
                onJoinByCode(inviteInput.trim());
                setInviteInput('');
              }
            }}
            placeholder="Paste invite link or room code…"
            className="flex-1 min-w-0 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs sm:text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
          />
          <button
            onClick={() => {
              if (inviteInput.trim()) {
                onJoinByCode(inviteInput.trim());
                setInviteInput('');
              }
            }}
            className="px-3.5 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer flex-none"
          >
            Join
          </button>
        </div>
      </div>

      {/* Main List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {subTab === 'joined' ? (
          filteredMyRooms.length === 0 ? (
            <div className="text-center py-12 text-[var(--muted)] space-y-3">
              <span className="text-3xl block">🌐</span>
              <p className="text-xs font-medium">You haven&apos;t joined any group rooms yet</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setSubTab('discover')}
                  className="text-xs font-bold text-[var(--primary)] hover:underline cursor-pointer"
                >
                  Browse public rooms
                </button>
                <span>·</span>
                <button
                  onClick={onCreateGroupModal}
                  className="text-xs font-bold text-[var(--primary)] hover:underline cursor-pointer"
                >
                  Create a new group
                </button>
              </div>
            </div>
          ) : (
            filteredMyRooms.map((room) => (
              <div
                key={room.id}
                onClick={() => onEnterRoom(room.id)}
                className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--bg-subtle)] transition-all flex items-center justify-between gap-3 cursor-pointer group shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <MergedAvatar
                    name={room.title}
                    avatarUrl={room.avatar_url}
                    emoji={room.emoji || '💬'}
                    size="md"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-[var(--text)] truncate">
                        {room.title}
                      </h4>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-[var(--accent-light)] text-[var(--accent-text)]">
                        Omni
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted)] truncate mt-0.5">
                      {room.last_message || room.description || 'Omni-language chat room'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-none">
                  {room.members_count && (
                    <span className="text-[11px] text-[var(--muted)]">
                      {room.members_count} members
                    </span>
                  )}
                  <span className="px-3 py-1.5 rounded-xl bg-[var(--primary)] text-white text-xs font-bold hover:opacity-90 transition-opacity">
                    Open →
                  </span>
                </div>
              </div>
            ))
          )
        ) : filteredDiscover.length === 0 ? (
          <div className="text-center py-12 text-[var(--muted)] space-y-2">
            <span className="text-3xl block">🔍</span>
            <p className="text-xs font-medium">No discoverable public groups right now</p>
          </div>
        ) : (
          filteredDiscover.map((room) => (
            <div
              key={room.id}
              className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--card)] flex items-center justify-between gap-3 shadow-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <MergedAvatar
                  name={room.title}
                  avatarUrl={room.avatar_url}
                  emoji={room.emoji || '💬'}
                  size="md"
                />
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-[var(--text)] truncate">{room.title}</h4>
                  <p className="text-xs text-[var(--muted)] truncate">
                    {room.description || 'Public cross-language discussion group'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => onJoinRoom(room.id)}
                className="px-3.5 py-1.5 rounded-xl bg-[var(--accent-light)] text-[var(--accent-text)] border border-[var(--accent)]/30 text-xs font-bold hover:opacity-90 transition-all cursor-pointer flex-none"
              >
                Join
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

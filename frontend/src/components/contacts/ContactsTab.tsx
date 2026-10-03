"use client";

import { useState } from 'react';
import { MergedAvatar } from '@/components/common/MergedAvatar';
import { Icons } from '@/lib/icons';

export interface ContactItem {
  id: string;
  user_id: string;
  email: string;
  username?: string;
  avatar_url?: string;
  about?: string;
  preferred_language?: string;
  direct_room_id?: string;
}

export interface ContactRequestItem {
  id: string;
  from_user_id: string;
  from_user_email: string;
  from_user_username?: string;
  from_user_avatar_url?: string;
  content?: string;
  created_at?: string;
}

interface ContactsTabProps {
  contacts: ContactItem[];
  requests: ContactRequestItem[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenDirectChat: (contactUserId: string) => void;
  onAcceptRequest: (requestId: string) => void;
  onDeclineRequest: (requestId: string) => void;
  onOpenAddModal: () => void;
  langNames: Record<string, string>;
}

export function ContactsTab({
  contacts,
  requests,
  searchQuery,
  onSearchChange,
  onOpenDirectChat,
  onAcceptRequest,
  onDeclineRequest,
  onOpenAddModal,
  langNames,
}: ContactsTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'contacts' | 'requests'>('contacts');

  const filteredContacts = contacts.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.email.toLowerCase().includes(q) ||
      (c.username && c.username.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search & Actions Header */}
      <div className="p-4 border-b border-[var(--border)] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border)] text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab('contacts')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeSubTab === 'contacts'
                  ? 'bg-[var(--card)] text-[var(--text)] shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              All Contacts ({contacts.length})
            </button>
            <button
              onClick={() => setActiveSubTab('requests')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'requests'
                  ? 'bg-[var(--card)] text-[var(--text)] shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <span>Requests</span>
              {requests.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {requests.length}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--primary)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-xs"
          >
            <Icons.userPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Icons.search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search contacts..."
            className="w-full bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
          />
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {activeSubTab === 'requests' ? (
          requests.length === 0 ? (
            <div className="text-center py-12 text-[var(--muted)] space-y-2">
              <p className="text-xs font-medium">No pending contact requests</p>
            </div>
          ) : (
            requests.map((r) => (
              <div
                key={r.id}
                className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--card)] space-y-2.5 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <MergedAvatar
                    name={r.from_user_username || r.from_user_email}
                    avatarUrl={r.from_user_avatar_url}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[var(--text)] truncate">
                      {r.from_user_username || r.from_user_email.split('@')[0]}
                    </p>
                    <p className="text-xs text-[var(--muted)] truncate">{r.from_user_email}</p>
                  </div>
                </div>

                {r.content && (
                  <p className="text-xs text-[var(--muted)] italic bg-[var(--bg-subtle)] p-2 rounded-xl">
                    &quot;{r.content}&quot;
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => onAcceptRequest(r.id)}
                    className="py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => onDeclineRequest(r.id)}
                    className="py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] hover:bg-[var(--card)] text-[var(--muted)] hover:text-[var(--text)] text-xs font-semibold transition-all cursor-pointer"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))
          )
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-12 text-[var(--muted)] space-y-3">
            <span className="text-3xl block">👥</span>
            <p className="text-xs font-medium">No contacts found</p>
            <button
              onClick={onOpenAddModal}
              className="text-xs font-bold text-[var(--primary)] hover:underline cursor-pointer"
            >
              + Find and connect with people
            </button>
          </div>
        ) : (
          filteredContacts.map((c) => (
            <div
              key={c.id}
              onClick={() => onOpenDirectChat(c.user_id)}
              className="p-3 rounded-2xl border border-transparent hover:border-[var(--border)] hover:bg-[var(--bg-subtle)] transition-all flex items-center justify-between gap-3 cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <MergedAvatar
                  name={c.username || c.email}
                  avatarUrl={c.avatar_url}
                  size="md"
                />
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-[var(--text)] truncate">
                    {c.username || c.email.split('@')[0]}
                  </h4>
                  <p className="text-xs text-[var(--muted)] truncate">
                    {c.about || c.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-none">
                {c.preferred_language && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--accent-light)] text-[var(--accent-text)] border border-[var(--accent)]/20">
                    {langNames[c.preferred_language] || c.preferred_language}
                  </span>
                )}
                <span className="p-2 rounded-xl text-[var(--muted)] group-hover:text-[var(--primary)] group-hover:bg-[var(--card)] transition-colors">
                  <Icons.chat className="w-4 h-4" />
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from 'react';
import { MergedAvatar } from '@/components/common/MergedAvatar';
import { Icons } from '@/lib/icons';
import { searchUsers } from '@/lib/api';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  onAddContact: (userId: string) => void;
  onSendRequest: (userId: string) => void;
}

export function AddContactModal({
  isOpen,
  onClose,
  token,
  onAddContact,
}: AddContactModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [addedMap, setAddedMap] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !token) return;

    setLoading(true);
    try {
      const data = await searchUsers(token, query.trim());
      setResults(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (userId: string) => {
    onAddContact(userId);
    setAddedMap((prev) => ({ ...prev, [userId]: true }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] text-sm">
              <Icons.userPlus className="w-5 h-5" />
            </span>
            <h3 className="font-bold text-base text-[var(--text)]">Add New Contact</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
          >
            <Icons.x className="w-5 h-5" />
          </button>
        </div>

        {/* Search input form */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Icons.search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
            <input
              type="text"
              required
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by email or username..."
              className="w-full bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? '...' : 'Search'}
          </button>
        </form>

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-[160px] pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-[var(--muted)] text-xs">
              Searching directory...
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-10 text-[var(--muted)] text-xs">
              {query ? 'No matching users found' : 'Type a name or email to search'}
            </div>
          ) : (
            results.map((u) => (
              <div
                key={u.id}
                className="p-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-subtle)] flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <MergedAvatar
                    name={u.username || u.email}
                    avatarUrl={u.avatar_url}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[var(--text)] truncate">
                      {u.username || u.email.split('@')[0]}
                    </p>
                    <p className="text-[11px] text-[var(--muted)] truncate">{u.email}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleAdd(u.id)}
                  disabled={addedMap[u.id]}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    addedMap[u.id]
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      : 'bg-[var(--primary)] text-white hover:opacity-90'
                  }`}
                >
                  {addedMap[u.id] ? 'Added ✓' : 'Add'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

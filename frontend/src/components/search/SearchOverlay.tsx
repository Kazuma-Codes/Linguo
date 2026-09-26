"use client";

import { useEffect, useRef, useState } from 'react';
import { MergedAvatar } from '@/components/common/MergedAvatar';
import { Icons } from '@/lib/icons';

interface SearchItem {
  id: string;
  title: string;
  subtitle?: string;
  avatarUrl?: string;
  emoji?: string;
  type: 'room' | 'contact';
}

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  items: SearchItem[];
  onSelect: (item: SearchItem) => void;
}

export function SearchOverlay({
  isOpen,
  onClose,
  items,
  onSelect,
}: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = items.filter((i) => {
    const q = query.toLowerCase();
    return (
      i.title.toLowerCase().includes(q) ||
      (i.subtitle && i.subtitle.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-[var(--border)] flex items-center gap-3">
          <Icons.search className="w-5 h-5 text-[var(--muted)] flex-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search anything..."
            className="flex-1 bg-transparent text-sm sm:text-base text-[var(--text)] focus:outline-none placeholder:text-[var(--muted)]/60"
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold bg-[var(--bg-subtle)] text-[var(--muted)] border border-[var(--border)] rounded-md">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--muted)]">
              No results found for &quot;{query}&quot;
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                onClick={() => {
                  onSelect(item);
                  onClose();
                }}
                className="flex items-center justify-between p-3 rounded-2xl hover:bg-[var(--bg-subtle)] cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <MergedAvatar
                    name={item.title}
                    avatarUrl={item.avatarUrl}
                    emoji={item.emoji}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--text)] truncate">{item.title}</p>
                    {item.subtitle && (
                      <p className="text-xs text-[var(--muted)] truncate">{item.subtitle}</p>
                    )}
                  </div>
                </div>

                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--muted)] group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">
                  {item.type}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { LanguageOption } from '@/lib/languages';

interface DashboardHeaderProps {
  userEmail: string;
  preferredLanguage: string;
  availableLanguages: LanguageOption[];
  onLanguageChange: (lang: string) => void;
  theme: string;
  onToggleTheme: () => void;
  onLogoutClick: () => void;
}

export function DashboardHeader({
  userEmail,
  preferredLanguage,
  availableLanguages,
  onLanguageChange,
  theme,
  onToggleTheme,
  onLogoutClick,
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-[var(--card)] border-b border-[var(--card-border)] px-4 sm:px-8 py-3.5 backdrop-blur-md shadow-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-light)] border border-[var(--accent)]/30 flex items-center justify-center text-xl shadow-xs">
            🌐
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">
            Mosaic Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Preferred Language Selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--text)]">
            <span className="text-[var(--muted)] hidden sm:inline">My Language:</span>
            <select
              value={preferredLanguage}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="bg-transparent text-[var(--text)] font-bold focus:outline-none cursor-pointer"
              title="Your default preferred language"
            >
              {availableLanguages.map((l) => (
                <option key={l.code} value={l.code} className="bg-[var(--card)] text-[var(--text)]">
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dark/Light toggle */}
          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2 rounded-full border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-[var(--text)] transition-colors cursor-pointer"
          >
            {theme === 'dark' ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
            )}
          </button>

          {/* User Avatar Pill */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-subtle)]">
            <span className="w-6 h-6 rounded-full bg-[var(--dashboard-btn)] text-white text-xs font-bold flex items-center justify-center">
              {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
            </span>
            <span className="text-sm font-medium text-[var(--text)] hidden sm:inline">
              {userEmail}
            </span>
          </div>

          {/* Logout Trigger */}
          <button
            onClick={onLogoutClick}
            className="text-sm font-medium text-[var(--muted)] hover:text-red-500 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

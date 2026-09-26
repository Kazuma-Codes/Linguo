"use client";

import React, { useState } from 'react';
import { Icons } from '@/lib/icons';
import { SUPPORTED_LANGUAGES, LanguageOption } from '@/lib/languages';

interface SettingsTabProps {
  currentLanguage: string;
  onUpdateLanguage: (lang: string) => void;
  theme: string;
  onToggleTheme: () => void;
  onLogout: () => void;
  onBack?: () => void;
  onReplaySkeletons?: () => void;
  onResetDemoData?: () => void;
  availableLanguages?: LanguageOption[];
}

export function SettingsTab({
  currentLanguage,
  onUpdateLanguage,
  theme,
  onToggleTheme,
  onLogout,
  onBack,
  onReplaySkeletons,
  onResetDemoData,
  availableLanguages = SUPPORTED_LANGUAGES,
}: SettingsTabProps) {
  const [simulatedError, setSimulatedError] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [enterToSend, setEnterToSend] = useState(true);

  const handleSimulateError = () => {
    setSimulatedError(true);
  };

  const handleReplay = () => {
    if (onReplaySkeletons) {
      onReplaySkeletons();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] text-[var(--text)] overflow-y-auto">
      {/* Header (Matches both Image 1 and Image 2) */}
      <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--card)]/90 backdrop-blur-md sticky top-0 z-10 flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="p-1.5 rounded-full hover:bg-[var(--bg-subtle)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
            title="Go Back"
          >
            <Icons.back className="w-5 h-5" />
          </button>
        )}
        <h2 className="text-xl font-bold tracking-tight text-[var(--text)]">Settings</h2>
      </div>

      <div className="p-4 sm:p-6 max-w-3xl w-full mx-auto space-y-6 pb-12">
        {/* Simulated Error Alert if active */}
        {simulatedError && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-between gap-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <Icons.alertCircle className="w-5 h-5 flex-none" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider">Simulated Connection Error</h4>
                <p className="text-xs opacity-90">Previewing error boundary & retry UI state.</p>
              </div>
            </div>
            <button
              onClick={() => setSimulatedError(false)}
              className="px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Dismiss / Retry
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 1. PREFERENCES SECTION (Matches Image 1)                                   */}
        {/* ========================================================================= */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] px-1">
            Preferences
          </h3>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl overflow-hidden divide-y divide-[var(--border)] shadow-xs">
            {/* Appearance */}
            <button
              type="button"
              onClick={onToggleTheme}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center flex-none">
                  <Icons.contrast className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text)]">Appearance</h4>
                  <p className="text-xs text-[var(--muted)]">
                    {theme === 'dark' ? 'Dark mode' : 'Light mode'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
                <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
                <Icons.chevR className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>

            {/* Notifications */}
            <button
              type="button"
              onClick={() => setNotificationsOn(!notificationsOn)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center flex-none">
                  <Icons.bell className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text)]">Notifications</h4>
                  <p className="text-xs text-[var(--muted)]">{notificationsOn ? 'On' : 'Muted'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
                <span>{notificationsOn ? 'On' : 'Off'}</span>
                <Icons.chevR className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>

            {/* Privacy */}
            <div className="px-5 py-4 flex items-center justify-between hover:bg-[var(--bg-subtle)] transition-colors text-left group">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-none">
                  <Icons.shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text)]">Privacy</h4>
                  <p className="text-xs text-[var(--muted)]">Last seen, online status</p>
                </div>
              </div>
              <Icons.chevR className="w-4 h-4 text-[var(--muted)]" />
            </div>

            {/* Chat */}
            <button
              type="button"
              onClick={() => setEnterToSend(!enterToSend)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center flex-none">
                  <Icons.chat className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text)]">Chat</h4>
                  <p className="text-xs text-[var(--muted)]">Enter to send, downloads</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
                <span>{enterToSend ? 'Enter to send' : 'Ctrl+Enter'}</span>
                <Icons.chevR className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. LANGUAGE SECTION (Matches Image 2)                                      */}
        {/* ========================================================================= */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] px-1">
            Language
          </h3>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-5 shadow-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center flex-none">
                <Icons.translate className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--text)]">Language</h4>
                <p className="text-xs text-[var(--muted)]">Interface language</p>
              </div>
            </div>

            <select
              value={currentLanguage}
              onChange={(e) => onUpdateLanguage(e.target.value)}
              className="bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-[var(--text)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              {availableLanguages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. DEMO TOOLS SECTION (Matches Image 2)                                    */}
        {/* ========================================================================= */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] px-1">
            Demo Tools
          </h3>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl overflow-hidden divide-y divide-[var(--border)] shadow-xs">
            {/* Replay skeletons */}
            <button
              type="button"
              onClick={handleReplay}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center flex-none">
                  <Icons.refresh className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text)]">Replay loading skeletons</h4>
                  <p className="text-xs text-[var(--muted)]">See the loading states again</p>
                </div>
              </div>
              <Icons.chevR className="w-4 h-4 text-[var(--muted)] group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Simulate error state */}
            <button
              type="button"
              onClick={handleSimulateError}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center flex-none">
                  <Icons.alertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text)]">Simulate an error state</h4>
                  <p className="text-xs text-[var(--muted)]">Preview the failure + retry UI</p>
                </div>
              </div>
              <Icons.chevR className="w-4 h-4 text-[var(--muted)] group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Reset demo data */}
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center flex-none">
                  <Icons.trash className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-red-500">Reset demo data</h4>
                  <p className="text-xs text-[var(--muted)]">Restore seed conversations and contacts</p>
                </div>
              </div>
              <Icons.chevR className="w-4 h-4 text-[var(--muted)] group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. ABOUT SECTION (Matches Image 1 and Image 2)                             */}
        {/* ========================================================================= */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] px-1">
            About
          </h3>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-5 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-[var(--bg-subtle)] text-[var(--muted)] border border-[var(--border)] flex items-center justify-center flex-none">
                <Icons.info className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--text)]">About Halo</h4>
                <p className="text-xs text-[var(--muted)]">Version 1.0.0</p>
              </div>
            </div>
            <Icons.chevR className="w-4 h-4 text-[var(--muted)]" />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 5. LOG OUT BUTTON (Matches Image 1)                                        */}
        {/* ========================================================================= */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onLogout}
            className="w-full py-3.5 rounded-2xl bg-red-500/5 hover:bg-red-500/10 border border-red-500/30 text-red-500 font-bold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer"
          >
            <Icons.logout className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
              <Icons.trash className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text)]">Reset demo data?</h3>
              <p className="text-xs text-[var(--muted)] mt-1">
                This will reload fresh seed rooms and reset local mock state.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-xs font-semibold hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirm(false);
                  if (onResetDemoData) onResetDemoData();
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

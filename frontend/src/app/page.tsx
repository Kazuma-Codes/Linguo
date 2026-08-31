"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore } from '@/store/useThemeStore';
import { login, register, getMe, createRoom, joinRoom, listRooms } from '@/lib/api';

const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ar', name: 'Arabic' },
  { code: 'ru', name: 'Russian' },
  { code: 'it', name: 'Italian' },
  { code: 'ko', name: 'Korean' },
];

function extractRoomId(input: string): string {
  const trimmed = input.trim();
  const uuidMatch = trimmed.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
  if (uuidMatch) return uuidMatch[0];
  if (trimmed.includes('/chat/')) {
    const afterChat = trimmed.split('/chat/')[1];
    return afterChat.split(/[?#/]/)[0].trim();
  }
  return trimmed;
}

export default function HomePage() {
  const router = useRouter();
  const { token, user, setAuth, logout, hasHydrated } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Dashboard state
  const [rooms, setRooms] = useState<any[]>([]);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('es');
  const [dashboardError, setDashboardError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    if (token && user) {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect');
        if (redirect && redirect.startsWith('/')) {
          router.push(redirect);
          return;
        }
      }
      loadRooms();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  const loadRooms = async () => {
    if (!token) return;
    setIsRefreshing(true);
    try {
      const data = await listRooms(token);
      setRooms(Array.isArray(data) ? data : data?.rooms ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!email.trim()) {
      setAuthError('Email is required.');
      return;
    }
    if (!password) {
      setAuthError('Password is required.');
      return;
    }
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }

    setAuthLoading(true);
    try {
      let accessToken;
      if (isLogin) {
        const data = await login(email, password);
        accessToken = data.access_token;
      } else {
        await register(email, password, 'en');
        const data = await login(email, password);
        accessToken = data.access_token;
      }
      const userData = await getMe(accessToken);
      setAuth(accessToken, userData);
      setEmail('');
      setPassword('');

      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect');
        if (redirect && redirect.startsWith('/')) {
          router.push(redirect);
          return;
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSwapLanguages = () => {
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setDashboardError('');
    try {
      const title = newRoomTitle.trim() || 'New Room';
      const room = await createRoom(token, title, sourceLang, targetLang);
      showToast(`✨ Room "${title}" created`);
      router.push(`/chat/${room.id}`);
    } catch (err: any) {
      setDashboardError(err.message || 'Failed to create room.');
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = extractRoomId(joinRoomId);
    if (!token || !cleanId) return;
    setDashboardError('');
    try {
      await joinRoom(token, cleanId);
      showToast(`🔗 Joined room ${cleanId}`);
      router.push(`/chat/${cleanId}`);
    } catch (err: any) {
      setDashboardError(err.message || 'Failed to join room. Please check the code.');
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`📋 ${label} copied to clipboard`);
    } catch {
      showToast(`📋 ${text}`);
    }
  };

  if (!hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg)] text-[var(--muted)]">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Loading Linguo...</span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 1. AUTH SCREEN (SIGN IN / SIGN UP) — EDITORIAL SPLIT SCREEN (NO ANIMATION)
  // =========================================================================
  if (!user) {
    return (
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[46%_1fr] bg-[var(--bg)] text-[var(--text)] transition-colors duration-200 relative">
        {/* Theme toggle button top right */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="absolute top-5 right-6 z-30 p-2.5 rounded-full border border-[var(--border)] bg-[var(--card)] hover:opacity-80 text-[var(--text)] transition-all shadow-sm flex items-center justify-center"
        >
          {theme === 'dark' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
          )}
        </button>

        {/* LEFT ART PANEL (Editorial Style, Static image without motion animation) */}
        <aside className="relative hidden lg:block overflow-hidden bg-[#1C1917]">
          {/* Static high-resolution image */}
          <img
            src="https://image.qwenlm.ai/public_source/6f898c32-8385-4259-95bc-c9af1efa37f4/1db0a56e5-1527-4e22-bd33-1401fd4de67a.png"
            alt="People around the world greeting each other in many languages"
            className="w-full h-full object-cover select-none pointer-events-none"
          />

          {/* Dark gradient overlay at bottom for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

          {/* Top-left pill badge */}
          <div className="absolute top-6 left-6 z-10 bg-[#FBF7F0] text-[#1C1917] text-[11px] font-semibold tracking-wider uppercase px-3.5 py-1.5 rounded-full shadow-md">
            48 LANGUAGES · 12M LEARNERS
          </div>

          {/* Bottom quote */}
          <div className="absolute left-8 right-8 bottom-8 z-10 text-[#FBF7F0]">
            <blockquote className="font-serif-display text-2xl leading-snug">
              “One language sets you in a corridor for life. Two languages open every door along the way.”
            </blockquote>
            <p className="mt-3 text-xs tracking-widest uppercase text-white/70 font-sans font-medium">
              — THE LINGUO COMMUNITY
            </p>
          </div>
        </aside>

        {/* RIGHT AUTH CARD (Minimalist Underline Inputs + Pill Button) */}
        <main className="flex items-center justify-center p-6 sm:p-12 lg:p-16">
          <div className="w-full max-w-md mx-auto">
            {/* Brand Header */}
            <div className="flex items-center gap-3 mb-10">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 flex items-center justify-center text-white shadow-md">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  <path d="M8 10h.01M12 10h.01M16 10h.01"/>
                </svg>
              </div>
              <span className="font-bold text-2xl tracking-tight text-[var(--text)]">Linguo</span>
            </div>

            {/* Title & Subtitle */}
            <h1 className="font-serif-display text-4xl sm:text-5xl font-normal text-[var(--text)] tracking-tight mb-2">
              {isLogin ? 'Welcome back.' : 'Create account.'}
            </h1>
            <p className="text-[var(--muted)] text-base mb-10">
              {isLogin ? 'Please login to continue.' : 'Create an account to get started.'}
            </p>

            {/* Auth Error Banner */}
            {authError && (
              <div className="mb-6 p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm flex items-center gap-2">
                <span>⚠️</span>
                <span>{authError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAuth} className="space-y-7" noValidate>
              {/* Email field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold tracking-widest text-[var(--muted)] uppercase">
                  EMAIL
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@linguo.app"
                  autoComplete="email"
                  className="w-full bg-transparent border-b border-[var(--input-border)] py-2.5 px-0.5 text-[var(--text)] placeholder:text-[var(--muted)]/50 focus:border-[var(--input-focus)] focus:outline-none transition-colors text-base"
                />
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold tracking-widest text-[var(--muted)] uppercase">
                  PASSWORD
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    className="w-full bg-transparent border-b border-[var(--input-border)] py-2.5 px-0.5 pr-10 text-[var(--text)] placeholder:text-[var(--muted)]/50 focus:border-[var(--input-focus)] focus:outline-none transition-colors text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)] p-1 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={authLoading}
                className="w-full mt-4 py-3.5 px-6 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-semibold text-base hover:bg-[var(--btn-primary-hover)] transition-all shadow-md active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {authLoading && (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                )}
                <span>{authLoading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}</span>
              </button>
            </form>

            {/* Toggle Sign In / Sign Up footer */}
            <p className="text-center text-sm text-[var(--muted)] mt-8">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setAuthError('');
                }}
                className="font-bold text-[var(--accent)] hover:underline ml-1 cursor-pointer"
              >
                {isLogin ? 'Sign up' : 'Sign In'}
              </button>
            </p>
          </div>
        </main>
      </div>
    );
  }

  // =========================================================================
  // 2. DASHBOARD SCREEN — MATCHING USER IMAGE 2
  // =========================================================================
  return (
    <div className="min-h-screen bg-[var(--dashboard-bg)] text-[var(--text)] transition-colors duration-200">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[var(--card)] border-b border-[var(--card-border)] px-4 sm:px-8 py-3.5 backdrop-blur-md shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-light)] border border-[var(--accent)]/30 flex items-center justify-center text-xl shadow-xs">
              🌐
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">
              Linguo Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Dark/Light toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 rounded-full border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-[var(--text)] transition-colors"
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
                {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
              </span>
              <span className="text-sm font-medium text-[var(--text)] hidden sm:inline">
                {user.email}
              </span>
            </div>

            {/* Logout Trigger */}
            <button
              onClick={() => setShowLogoutModal(true)}
              className="text-sm font-medium text-[var(--muted)] hover:text-red-500 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="max-w-6xl mx-auto p-4 sm:p-8 space-y-8">
        {dashboardError && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-sm p-4 rounded-xl flex items-center justify-between">
            <span>{dashboardError}</span>
            <button onClick={() => setDashboardError('')} className="font-bold text-red-500 ml-4">✕</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[7fr_5fr] gap-6 items-start">
          {/* LEFT COLUMN: Create Room & Join Room */}
          <div className="space-y-6">
            {/* Create Room Card */}
            <div className="bg-[var(--dashboard-card)] border border-[var(--card-border)] rounded-2xl p-6 sm:p-7 shadow-xs">
              <div className="flex items-center gap-3 mb-6">
                <span className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 flex items-center justify-center text-lg">
                  ✨
                </span>
                <h2 className="text-xl font-bold text-[var(--text)]">Create a New Room</h2>
              </div>

              <form onSubmit={handleCreateRoom} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold tracking-wider uppercase text-[var(--muted)] mb-2">
                    ROOM TITLE
                  </label>
                  <input
                    type="text"
                    value={newRoomTitle}
                    onChange={(e) => setNewRoomTitle(e.target.value)}
                    placeholder="e.g. Weekly Meeting"
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] placeholder:text-[var(--muted)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-all"
                  />
                </div>

                {/* Language selection with swap button */}
                <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end">
                  <div>
                    <label className="block text-xs font-bold tracking-wider uppercase text-[var(--muted)] mb-2">
                      SOURCE LANG
                    </label>
                    <select
                      value={sourceLang}
                      onChange={(e) => setSourceLang(e.target.value)}
                      className="w-full bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl px-3.5 py-3 text-[var(--text)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                    >
                      {AVAILABLE_LANGUAGES.map((l) => (
                        <option key={l.code} value={l.code} className="bg-[var(--card)] text-[var(--text)]">
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Language Swap Button */}
                  <button
                    type="button"
                    onClick={handleSwapLanguages}
                    title="Swap languages"
                    className="w-11 h-11 mb-0.5 rounded-full border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--bg-subtle)] text-[var(--text)] flex items-center justify-center transition-all active:scale-95 shadow-xs"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>
                    </svg>
                  </button>

                  <div>
                    <label className="block text-xs font-bold tracking-wider uppercase text-[var(--muted)] mb-2">
                      TARGET LANG
                    </label>
                    <select
                      value={targetLang}
                      onChange={(e) => setTargetLang(e.target.value)}
                      className="w-full bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl px-3.5 py-3 text-[var(--text)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                    >
                      {AVAILABLE_LANGUAGES.map((l) => (
                        <option key={l.code} value={l.code} className="bg-[var(--card)] text-[var(--text)]">
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-full bg-[var(--dashboard-btn)] text-[var(--dashboard-btn-text)] font-semibold text-base hover:opacity-90 transition-all shadow-sm active:scale-[0.99] cursor-pointer mt-2"
                >
                  Create Room
                </button>
              </form>
            </div>

            {/* Join Room Card */}
            <div className="bg-[var(--dashboard-card)] border border-[var(--card-border)] rounded-2xl p-6 sm:p-7 shadow-xs">
              <div className="flex items-center gap-3 mb-6">
                <span className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 flex items-center justify-center text-lg">
                  🔗
                </span>
                <h2 className="text-xl font-bold text-[var(--text)]">Join Existing Room</h2>
              </div>

              <form onSubmit={handleJoinRoom} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold tracking-wider uppercase text-[var(--muted)] mb-2">
                    ROOM CODE OR INVITE LINK
                  </label>
                  <input
                    type="text"
                    required
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value)}
                    placeholder="Paste invite link (https://...) or enter room code"
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] placeholder:text-[var(--muted)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-all"
                  />
                  <p className="text-xs text-[var(--muted)] mt-2">
                    You can paste a full invite URL or enter the room code directly.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-full bg-[var(--accent-light)] text-[var(--accent-text)] border border-[var(--accent)]/30 font-semibold text-base hover:opacity-90 transition-all shadow-sm active:scale-[0.99] cursor-pointer mt-2"
                >
                  Join Room
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT COLUMN: Your Rooms */}
          <div className="bg-[var(--dashboard-card)] border border-[var(--card-border)] rounded-2xl p-6 sm:p-7 shadow-xs lg:sticky lg:top-24">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center text-lg">
                  📚
                </span>
                <h2 className="text-xl font-bold text-[var(--text)]">Your Rooms</h2>
              </div>

              <button
                onClick={loadRooms}
                disabled={isRefreshing}
                className="text-xs font-semibold border border-[var(--border)] bg-[var(--bg-subtle)] hover:bg-[var(--card)] text-[var(--muted)] hover:text-[var(--text)] px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>Refresh</span>
                <span className={isRefreshing ? 'animate-spin inline-block' : ''}>↻</span>
              </button>
            </div>

            {rooms.length === 0 ? (
              <div className="border-2 border-dashed border-[var(--border)] rounded-xl py-12 px-6 text-center text-[var(--muted)] bg-[var(--bg-subtle)]/40">
                <span className="text-3xl block mb-2">🗂️</span>
                <p className="font-medium text-sm">You haven&apos;t joined any rooms yet.</p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[580px] overflow-y-auto pr-1">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)]/60 hover:bg-[var(--bg-subtle)] transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm truncate text-[var(--text)] max-w-[180px]">
                          {room.title || 'Untitled Room'}
                        </h3>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--accent-light)] text-[var(--accent-text)]">
                          {room.source_lang} ↔ {room.target_lang}
                        </span>
                      </div>
                      <p className="font-mono text-[11px] text-[var(--muted)] mt-1 truncate max-w-[200px]" title={room.id}>
                        {room.id}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-none">
                      <button
                        onClick={() => copyToClipboard(room.id, 'Room ID')}
                        title="Copy Room ID"
                        className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--card)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                      </button>

                      <button
                        onClick={() => router.push(`/chat/${room.id}`)}
                        className="px-3 py-1.5 rounded-lg bg-[var(--dashboard-btn)] text-[var(--dashboard-btn-text)] text-xs font-semibold hover:opacity-90 transition-all cursor-pointer"
                      >
                        Enter →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 sm:p-7 max-w-sm w-full shadow-2xl text-center">
            <div className="text-4xl mb-3">👋</div>
            <h3 className="text-lg font-bold text-[var(--text)] mb-2">Log out of Linguo?</h3>
            <p className="text-sm text-[var(--muted)] mb-6">
              You can rejoin your rooms anytime by signing back in.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="py-2.5 rounded-xl border border-[var(--border)] text-[var(--text)] font-semibold text-sm hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutModal(false);
                  logout();
                }}
                className="py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--card)] text-[var(--text)] border border-[var(--border)] px-4 py-2.5 rounded-full shadow-xl text-sm font-semibold flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
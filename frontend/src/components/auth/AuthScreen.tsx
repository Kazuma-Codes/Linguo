"use client";

import Image from 'next/image';

interface AuthScreenProps {
  isLogin: boolean;
  setIsLogin: (val: boolean) => void;
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  authError: string;
  authLoading: boolean;
  handleAuth: (e: React.FormEvent) => void;
  theme: string;
  toggleTheme: () => void;
}

export function AuthScreen({
  isLogin,
  setIsLogin,
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  authError,
  authLoading,
  handleAuth,
  theme,
  toggleTheme,
}: AuthScreenProps) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[46%_1fr] bg-[var(--bg)] text-[var(--text)] transition-colors duration-200 relative">
      {/* Theme toggle button top right */}
      <button
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        className="absolute top-5 right-6 z-30 p-2.5 rounded-full border border-[var(--border)] bg-[var(--card)] hover:opacity-80 text-[var(--text)] transition-all shadow-sm flex items-center justify-center cursor-pointer"
      >
        {theme === 'dark' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
        )}
      </button>

      {/* LEFT ART PANEL (Editorial Style) */}
      <aside className="relative hidden lg:block overflow-hidden bg-[#1C1917]">
        <Image
          src="/auth-art.png"
          alt="People around the world greeting each other in many languages"
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 0px"
          className="w-full h-full object-cover select-none pointer-events-none"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

        <div className="absolute top-6 left-6 z-10 bg-[#FBF7F0] text-[#1C1917] text-[11px] font-semibold tracking-wider uppercase px-3.5 py-1.5 rounded-full shadow-md">
          48 LANGUAGES · 12M LEARNERS
        </div>

        <div className="absolute left-8 right-8 bottom-8 z-10 text-[#FBF7F0]">
          <blockquote className="font-serif-display text-2xl leading-snug">
            “One language sets you in a corridor for life. Two languages open every door along the way.”
          </blockquote>
          <p className="mt-3 text-xs tracking-widest uppercase text-white/70 font-sans font-medium">
            — THE MOSAIC COMMUNITY
          </p>
        </div>
      </aside>

      {/* RIGHT AUTH CARD */}
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
            <span className="font-bold text-2xl tracking-tight text-[var(--text)]">Mosaic</span>
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
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold tracking-widest text-[var(--muted)] uppercase">
                EMAIL
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@mosaic.app"
                autoComplete="email"
                className="w-full bg-transparent border-b border-[var(--input-border)] py-2.5 px-0.5 text-[var(--text)] placeholder:text-[var(--muted)]/50 focus:border-[var(--input-focus)] focus:outline-none transition-colors text-base"
              />
            </div>

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
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)] p-1 transition-colors cursor-pointer"
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

            <button
              type="submit"
              disabled={authLoading}
              className="w-full mt-4 py-3.5 px-6 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-semibold text-base hover:bg-[var(--btn-primary-hover)] transition-all shadow-md active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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

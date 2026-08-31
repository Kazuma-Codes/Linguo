"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import { useThemeStore } from '@/store/useThemeStore';
import { getRoom, setMyLanguage } from '@/lib/api';

const LANG_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  es: 'Spanish',
  fr: 'French',
  ja: 'Japanese',
  ru: 'Russian',
  ar: 'Arabic',
  zh: 'Chinese',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ko: 'Korean',
};


interface CulturalFootnotes {
  humor_explanation?: string;
  idiom_breakdown?: string;
  etiquette_warning?: string;
}

function Footnotes({ footnotes }: { footnotes?: CulturalFootnotes | null }) {
  if (!footnotes) return null;
  const { humor_explanation, idiom_breakdown, etiquette_warning } = footnotes;
  if (!humor_explanation && !idiom_breakdown && !etiquette_warning) return null;

  return (
    <div className="mt-2.5 text-xs bg-black/25 dark:bg-black/40 p-2.5 rounded-xl border border-white/10 space-y-1 text-white">
      <p className="font-bold text-amber-300 flex items-center gap-1">🧠 Cultural Context</p>
      {humor_explanation && <p className="opacity-95">😄 Humor: {humor_explanation}</p>}
      {idiom_breakdown && <p className="opacity-95">📖 Idiom: {idiom_breakdown}</p>}
      {etiquette_warning && <p className="text-red-300 font-medium">⚠️ Etiquette: {etiquette_warning}</p>}
    </div>
  );
}

export default function ChatRoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const router = useRouter();

  const { token, user, logout, hasHydrated } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const {
    messages,
    drafts,
    isConnected,
    connect,
    disconnect,
    sendDraft,
    confirmDraft,
    sendMessage,
    removeDraft,
    updateDraftTranslation,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [myLang, setMyLang] = useState<string>('en');
  const [roomLangs, setRoomLangs] = useState<string[]>(['en', 'es']);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2600);
  };

  useEffect(() => {
    if (!hasHydrated) return;

    if (!token || !user) {
      router.push(`/?redirect=${encodeURIComponent(`/chat/${roomId}`)}`);
      return;
    }

    // Fetch room metadata and current language seat
    getRoom(token, roomId)
      .then((roomData) => {
        if (roomData) {
          const src = roomData.source_lang || 'en';
          const tgt = roomData.target_lang || 'es';
          setRoomLangs([src, tgt]);
          if (roomData.my_language) {
            setMyLang(roomData.my_language);
          }
        }
      })
      .catch(console.error);

    connect(roomId, token, user.email);
    return () => disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, hasHydrated, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, drafts.length]);

  const handleToggleLanguage = async (newLang: string) => {
    if (!token || newLang === myLang) return;
    try {
      await setMyLanguage(token, roomId, newLang);
      setMyLang(newLang);
      const langName = LANG_NAMES[newLang] || newLang.toUpperCase();
      showToast(`Speaking: ${langName}`);
    } catch (err) {
      console.error('Failed to change language seat:', err);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !isConnected) return;
    sendMessage(trimmed);
    setInput('');
  };

  const handleDraft = (e: React.MouseEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !isConnected) return;
    sendDraft(trimmed);
    setInput('');
    showToast('✨ Translating with Groq AI...');
  };

  const handleShareLink = async () => {
    try {
      const inviteUrl = `${window.location.origin}/chat/${roomId}`;
      await navigator.clipboard.writeText(inviteUrl);
      showToast('🔗 Room invite link copied');
    } catch {
      showToast(`🔗 ${roomId}`);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      showToast('📋 Room code copied');
    } catch {
      showToast(`📋 ${roomId}`);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(false);
    disconnect();
    logout();
    router.push('/');
  };

  if (!hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg)] text-[var(--muted)]">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Loading Chat Room...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const currentLangName = LANG_NAMES[myLang] || myLang.toUpperCase();

  return (
    <div className="min-h-screen h-[100dvh] flex flex-col p-2 sm:p-4 md:p-6 bg-[var(--chat-bg)] text-[var(--text)] transition-colors duration-200">
      <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col min-h-0 bg-[var(--chat-card)] border border-[var(--border)] rounded-2xl md:rounded-3xl shadow-xl overflow-hidden backdrop-blur-md">
        {/* HEADER BAR (Matching Image 1) */}
        <header className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-[var(--border)] bg-[var(--card)]/90 backdrop-blur-md flex items-center justify-between gap-3 flex-wrap">
          {/* Left: Back & Room info */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-subtle)] hover:bg-[var(--card)] text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] transition-all cursor-pointer"
              title="Back to Dashboard"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
              <span>Back</span>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg tracking-tight text-[var(--text)]">
                  Chat Room
                </h1>
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-xs' : 'bg-red-500 animate-ping'}`} />
                  <span className="hidden xs:inline">{isConnected ? 'Connected' : 'Connecting...'}</span>
                </div>
              </div>
              <p className="text-[11px] font-mono text-[var(--muted)] truncate max-w-[170px] sm:max-w-xs" title={roomId}>
                ID: {roomId}
              </p>
            </div>
          </div>

          {/* Right: Language selector & Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            {/* Speaking Language selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-subtle)] hover:bg-[var(--card)] text-xs font-semibold text-[var(--text)] transition-all cursor-pointer"
              >
                <span className="text-[var(--muted)]">Speaking:</span>
                <span>{currentLangName}</span>
                <span className="text-[var(--muted)] text-[10px]">⌄</span>
              </button>

              {isLangDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-40 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl py-1.5 z-50 text-xs font-medium max-h-60 overflow-y-auto">
                  {Object.entries(LANG_NAMES).map(([code, name]) => (
                    <button
                      key={code}
                      onClick={() => {
                        handleToggleLanguage(code);
                        setIsLangDropdownOpen(false);
                      }}
                      className={`w-full px-3.5 py-2 text-left flex items-center justify-between hover:bg-[var(--bg-subtle)] transition-colors ${
                        code === myLang ? 'text-[var(--accent)] font-bold' : 'text-[var(--text)]'
                      }`}
                    >
                      <span>{name}</span>
                      {code === myLang && <span>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Share Link Button */}
            <button
              onClick={handleShareLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs font-semibold hover:bg-indigo-500/20 transition-all cursor-pointer"
              title="Share Room Invite Link"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>
              <span>Share</span>
            </button>

            {/* Code Embed Button */}
            <button
              onClick={() => setShowCodeModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold hover:bg-emerald-500/20 transition-all cursor-pointer"
              title="View Room Code / Embed"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
              <span>Code</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 rounded-full border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-[var(--text)] transition-colors"
            >
              {theme === 'dark' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
              )}
            </button>

            {/* Logout button */}
            <button
              onClick={() => setShowLogoutModal(true)}
              className="px-3 py-1.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-semibold hover:bg-red-500/20 transition-all cursor-pointer"
            >
              Logout
            </button>
          </div>
        </header>

        {/* MESSAGES AREA */}
        <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.length === 0 && drafts.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center text-[var(--muted)] py-16 space-y-2">
              <span className="text-4xl">👋</span>
              <p className="font-medium text-sm">No messages yet — say hello 👋</p>
            </div>
          )}

          {/* Message List */}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.is_me ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[70%] p-3.5 sm:p-4 rounded-2xl shadow-xs ${
                  m.is_me
                    ? 'bg-[var(--chat-bubble-me)] text-[var(--chat-bubble-me-text)] rounded-br-xs'
                    : 'bg-[var(--chat-bubble-other)] text-[var(--chat-bubble-other-text)] rounded-bl-xs border border-[var(--border)]'
                }`}
              >
                {!m.is_me && (
                  <p className="text-xs font-bold mb-1 opacity-70">
                    {m.sender_email}
                  </p>
                )}

                <p className="text-sm sm:text-base leading-relaxed break-words font-medium">
                  {m.original_text}
                </p>

                {m.translated_text && (
                  <div className="mt-2.5 pt-2.5 border-t border-current/20 space-y-1">
                    {m.detected_lang && (
                      <p className="text-[11px] opacity-80 italic">
                        Detected: {LANG_NAMES[m.detected_lang] || m.detected_lang}
                      </p>
                    )}
                    <p className="text-sm font-semibold tracking-wide">
                      ✨ {m.translated_text}
                    </p>
                    <Footnotes footnotes={m.cultural_footnotes as CulturalFootnotes | undefined} />
                  </div>
                )}
              </div>
            </div>
          ))}


          {/* Draft Translation (Interactive preview with Groq) */}
          {drafts.map((d) => {
            const isTranslating = d.translated_text === null || d.translated_text === undefined;

            return (
              <div key={d.id} className="flex justify-end">
                <div className="max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-[var(--text)] shadow-md space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      ✨ Draft AI Translation
                    </span>
                    {isTranslating && (
                      <span className="text-xs text-amber-500 font-medium flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                        Translating with Groq...
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[var(--muted)] italic">
                    Original: {d.original_text}
                  </p>

                  <textarea
                    value={d.translated_text ?? ''}
                    onChange={(e) => updateDraftTranslation(d.id, e.target.value)}
                    rows={2}
                    placeholder={isTranslating ? 'Translating with Groq... (or type your translation)' : 'Edit translation before sending...'}
                    className="w-full bg-[var(--card)] border border-[var(--border)] p-2.5 rounded-xl text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none font-medium"
                  />

                  <Footnotes footnotes={d.cultural_footnotes as CulturalFootnotes | undefined} />

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => confirmDraft(d.id, d.translated_text || d.original_text)}
                      className="px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
                    >
                      Send
                    </button>
                    <button
                      onClick={() => confirmDraft(d.id, d.original_text)}
                      className="px-3.5 py-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] hover:text-[var(--text)] font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Send Original
                    </button>
                    <button
                      onClick={() => removeDraft(d.id)}
                      className="px-3.5 py-1.5 rounded-full text-red-500 hover:bg-red-500/10 font-semibold text-xs transition-colors cursor-pointer ml-auto"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </main>

        {/* MESSAGE COMPOSER */}
        <footer className="p-3 sm:p-4 border-t border-[var(--border)] bg-[var(--card)]/90 backdrop-blur-md">
          <form onSubmit={handleSend} className="flex gap-2 sm:gap-3 items-center">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isConnected
                  ? `Type in ${currentLangName}... (Enter to Send)`
                  : 'Connecting...'
              }
              disabled={!isConnected}
              className="flex-1 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-full px-4 py-3 text-sm sm:text-base text-[var(--text)] placeholder:text-[var(--muted)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-all"
            />

            <button
              type="submit"
              disabled={!isConnected || !input.trim()}
              className="px-5 py-3 rounded-full bg-[var(--chat-bubble-me)] text-white font-semibold text-sm hover:opacity-90 transition-all shadow-sm active:scale-95 disabled:opacity-40 cursor-pointer flex-none"
            >
              Send
            </button>

            <button
              type="button"
              onClick={handleDraft}
              disabled={!isConnected || !input.trim()}
              className="px-4 sm:px-5 py-3 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-sm hover:opacity-90 transition-all shadow-sm active:scale-95 disabled:opacity-40 cursor-pointer flex items-center gap-1 flex-none"
              title="Translate with Groq and preview before sending"
            >
              <span>✨</span>
              <span className="hidden sm:inline">Translate</span>
            </button>
          </form>
        </footer>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 sm:p-7 max-w-sm w-full shadow-2xl text-center">
            <div className="text-4xl mb-3">👋</div>
            <h3 className="text-lg font-bold text-[var(--text)] mb-2">Leave this room?</h3>
            <p className="text-sm text-[var(--muted)] mb-6">
              You will be returned to your dashboard.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="py-2.5 rounded-xl border border-[var(--border)] text-[var(--text)] font-semibold text-sm hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
              >
                Stay
              </button>
              <button
                onClick={handleLogout}
                className="py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Code Snippet Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[var(--text)]">📋 Room Details</h3>
              <button onClick={() => setShowCodeModal(false)} className="text-[var(--muted)] hover:text-[var(--text)] text-lg">✕</button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--muted)] uppercase">Room ID</label>
              <div className="p-3 bg-[var(--bg-subtle)] rounded-xl font-mono text-xs text-[var(--text)] break-all border border-[var(--border)]">
                {roomId}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--muted)] uppercase">Embed Code</label>
              <pre className="p-3 bg-[var(--bg-subtle)] rounded-xl font-mono text-xs text-[var(--text)] overflow-x-auto border border-[var(--border)]">
                {`<iframe\n  src="${typeof window !== 'undefined' ? window.location.origin : ''}/chat/${roomId}"\n  width="100%"\n  height="600"\n  frameborder="0"\n/>`}
              </pre>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={handleCopyCode}
                className="px-4 py-2 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-semibold hover:opacity-90 transition-all cursor-pointer"
              >
                Copy Room ID
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--card)] text-[var(--text)] border border-[var(--border)] px-4 py-2.5 rounded-full shadow-xl text-sm font-semibold flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
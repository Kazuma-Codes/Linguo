"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import { useThemeStore } from '@/store/useThemeStore';
import { getRoom, getMembers, setMyLanguage, updatePreferredLanguage } from '@/lib/api';
import { ChatMessageBubble } from '@/components/chat/ChatMessageBubble';
import { ChatDraftPreview } from '@/components/chat/ChatDraftPreview';
import { RoomDetailsModal, MemberInfo } from '@/components/chat/RoomDetailsModal';
import { LanguageSeatModal } from '@/components/chat/LanguageSeatModal';
import { LogoutConfirmModal } from '@/components/common/LogoutConfirmModal';
import { LANGUAGE_MAP as LANG_NAMES } from '@/lib/languages';

export default function ChatRoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const router = useRouter();

  const { token, user, updatePreferredLanguage: setStoreLang, logout, hasHydrated } = useAuthStore();
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
  const [roomTitle, setRoomTitle] = useState<string>('Chat Room');
  const [distinctLangs, setDistinctLangs] = useState<string[]>([]);
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [pendingLang, setPendingLang] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2600);
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!hasHydrated) return;

    if (!token || !user) {
      router.push(`/?redirect=${encodeURIComponent(`/chat/${roomId}`)}`);
      return;
    }

    // Fetch room metadata, seat languages, and member roster
    getRoom(token, roomId)
      .then((roomData) => {
        if (roomData) {
          if (roomData.title) setRoomTitle(roomData.title);
          if (roomData.my_language) setMyLang(roomData.my_language);
          if (roomData.distinct_langs) setDistinctLangs(roomData.distinct_langs);
          if (roomData.members) setMembers(roomData.members);
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

  const handleSelectLanguage = (newLang: string) => {
    setIsLangDropdownOpen(false);
    if (newLang === myLang) return;
    setPendingLang(newLang);
  };

  const handleConfirmGlobalLanguage = async () => {
    if (!pendingLang || !token) return;
    try {
      await setMyLanguage(token, roomId, pendingLang);
      await updatePreferredLanguage(token, pendingLang);
      setStoreLang(pendingLang);
      setMyLang(pendingLang);
      const langName = LANG_NAMES[pendingLang] || pendingLang.toUpperCase();
      showToast(`🌐 Set ${langName} as your default language across all rooms!`);
      // Refresh member seat info
      getMembers(token, roomId).then((data) => setMembers(data || [])).catch(console.error);
    } catch (err) {
      console.error('Failed to change language:', err);
      showToast('Failed to update language');
    } finally {
      setPendingLang(null);
    }
  };

  const handleConfirmRoomOnlyLanguage = async () => {
    if (!pendingLang || !token) return;
    try {
      await setMyLanguage(token, roomId, pendingLang);
      setMyLang(pendingLang);
      const langName = LANG_NAMES[pendingLang] || pendingLang.toUpperCase();
      showToast(`🗣️ Speaking ${langName} in this room (others see translates).`);
      // Refresh member seat info
      getMembers(token, roomId).then((data) => setMembers(data || [])).catch(console.error);
    } catch (err) {
      console.error('Failed to change language seat:', err);
      showToast('Failed to update room language');
    } finally {
      setPendingLang(null);
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
        
        {/* HEADER BAR */}
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
                  {roomTitle}
                </h1>
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-xs' : 'bg-red-500 animate-ping'}`} />
                  <span className="hidden sm:inline">{isConnected ? 'Connected' : 'Connecting...'}</span>
                </div>
              </div>
              
              {/* Language Chips & Member Count */}
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {distinctLangs.length > 0 && (
                  <div className="flex items-center gap-1">
                    {distinctLangs.map((lang) => (
                      <span key={lang} className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[var(--accent-light)] text-[var(--accent-text)] border border-[var(--accent)]/20">
                        {lang}
                      </span>
                    ))}
                  </div>
                )}
                <span className="text-[11px] text-[var(--muted)]">
                  {members.length > 0 ? `${members.length} member${members.length > 1 ? 's' : ''}` : `ID: ${roomId.slice(0, 8)}...`}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Language selector & Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            {/* Speaking Seat Language selector */}
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
                      onClick={() => handleSelectLanguage(code)}
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

            {/* Room Info / Members / Code Button */}
            <button
              onClick={() => setShowDetailsModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold hover:bg-emerald-500/20 transition-all cursor-pointer"
              title="View Room Members & Code"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              <span>Details</span>
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
              <p className="font-medium text-sm">No messages yet — start talking in your preferred language 👋</p>
            </div>
          )}

          {/* Message List */}
          {messages.map((m) => (
            <ChatMessageBubble
              key={m.id}
              message={m}
              myLang={myLang}
              isExpanded={expandedIds.has(m.id)}
              onToggleExpand={toggleExpanded}
              langNames={LANG_NAMES}
            />
          ))}

          {/* Draft Translation (Interactive preview with Groq) */}
          {drafts.map((d) => (
            <ChatDraftPreview
              key={d.id}
              draft={d}
              onUpdateDraftTranslation={updateDraftTranslation}
              onConfirmDraft={confirmDraft}
              onRemoveDraft={removeDraft}
            />
          ))}

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
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        title="Leave this room?"
        description="You will be returned to your dashboard."
      />

      {/* Room Details Modal */}
      <RoomDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        roomId={roomId}
        members={members}
        currentEmail={user.email}
        langNames={LANG_NAMES}
        onCopyCode={handleCopyCode}
      />

      {/* Language Preference Confirmation Modal */}
      <LanguageSeatModal
        pendingLang={pendingLang}
        langNames={LANG_NAMES}
        onConfirmGlobal={handleConfirmGlobalLanguage}
        onConfirmRoomOnly={handleConfirmRoomOnlyLanguage}
        onCancel={() => setPendingLang(null)}
      />

      {/* Toast notifications */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--card)] text-[var(--text)] border border-[var(--border)] px-4 py-2.5 rounded-full shadow-xl text-sm font-semibold flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
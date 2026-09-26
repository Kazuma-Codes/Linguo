"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import { useThemeStore } from '@/store/useThemeStore';
import { getRoom, getRoomMessages, getMembers, setMyLanguage, updatePreferredLanguage } from '@/lib/api';
import { MergedMessageBubble } from '@/components/chat/MergedMessageBubble';
import { MergedComposer } from '@/components/chat/MergedComposer';
import { ChatDraftPreview } from '@/components/chat/ChatDraftPreview';
import { RoomInfoDrawer, MemberInfo } from '@/components/chat/RoomInfoDrawer';
import { LanguageSeatModal } from '@/components/chat/LanguageSeatModal';
import { LogoutConfirmModal } from '@/components/common/LogoutConfirmModal';
import { MergedAvatar } from '@/components/common/MergedAvatar';
import { Icons } from '@/lib/icons';
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
    replyTo,
    typingUsers,
    setInitialMessages,
    setReplyTo,
    connect,
    disconnect,
    sendDraft,
    confirmDraft,
    sendMessage,
    sendTyping,
    removeDraft,
    updateDraftTranslation,
    deleteMessage,
  } = useChatStore();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [myLang, setMyLang] = useState<string>('en');
  const [roomTitle, setRoomTitle] = useState<string>('Chat Room');
  const [roomDetail, setRoomDetail] = useState<any | null>(null);
  const [distinctLangs, setDistinctLangs] = useState<string[]>([]);
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (!hasHydrated) return;

    if (!token || !user) {
      router.push(`/?redirect=${encodeURIComponent(`/chat/${roomId}`)}`);
      return;
    }

    // 1. Fetch room detail
    getRoom(token, roomId)
      .then((roomData) => {
        if (roomData) {
          setRoomDetail(roomData);
          if (roomData.title) setRoomTitle(roomData.title);
          if (roomData.my_language) setMyLang(roomData.my_language);
          if (roomData.distinct_langs) setDistinctLangs(roomData.distinct_langs);
          if (roomData.members) setMembers(roomData.members);
        }
      })
      .catch(console.error);

    // 2. Fetch history
    getRoomMessages(token, roomId)
      .then((history) => {
        if (Array.isArray(history)) {
          setInitialMessages(history);
        }
      })
      .catch(console.error);

    // 3. Connect socket
    connect(roomId, token, user.email);
    return () => disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, hasHydrated, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, drafts.length]);

  const handleConfirmGlobalLanguage = async () => {
    if (!pendingLang || !token) return;
    try {
      await setMyLanguage(token, roomId, pendingLang);
      await updatePreferredLanguage(token, pendingLang);
      setStoreLang(pendingLang);
      setMyLang(pendingLang);
      const langName = LANG_NAMES[pendingLang] || pendingLang.toUpperCase();
      showToast(`🌐 Set ${langName} as your default language across all rooms!`);
      getMembers(token, roomId).then((data) => setMembers(data || [])).catch(console.error);
    } catch (err) {
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
      showToast(`🗣️ Speaking ${langName} in this room.`);
      getMembers(token, roomId).then((data) => setMembers(data || [])).catch(console.error);
    } catch (err) {
      showToast('Failed to update room language');
    } finally {
      setPendingLang(null);
    }
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
    <div className="min-h-screen h-[100dvh] flex flex-col bg-[var(--chat-bg)] text-[var(--text)] transition-colors duration-200">
      <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col min-h-0 bg-[var(--chat-card)] border-x border-[var(--border)] shadow-2xl overflow-hidden backdrop-blur-md">
        
        {/* HEADER BAR */}
        <header className="px-4 py-3 sm:px-6 border-b border-[var(--border)] bg-[var(--card)]/90 backdrop-blur-md flex items-center justify-between gap-3 flex-none z-10">
          <div className="flex items-center gap-3 min-w-0">
            {/* Back button */}
            <button
              onClick={() => router.push('/')}
              className="p-2 rounded-full hover:bg-[var(--bg-subtle)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
              title="Back to Dashboard"
            >
              <Icons.back className="w-5 h-5" />
            </button>

            <MergedAvatar
              name={roomTitle}
              avatarUrl={roomDetail?.avatar_url}
              emoji={roomDetail?.emoji || '💬'}
              size="md"
            />

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg tracking-tight text-[var(--text)] truncate">
                  {roomTitle}
                </h1>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-emerald-500' : 'bg-red-500 animate-ping'
                  }`}
                  title={isConnected ? 'Connected' : 'Connecting...'}
                />
              </div>

              {/* Typing indicator or active members */}
              <p className="text-xs text-[var(--muted)] truncate">
                {Object.keys(typingUsers).length > 0 ? (
                  <span className="text-[var(--primary)] font-semibold animate-pulse">
                    {Object.values(typingUsers)[0].username || Object.values(typingUsers)[0].email.split('@')[0]} is typing...
                  </span>
                ) : (
                  `${members.length} participant${members.length > 1 ? 's' : ''}`
                )}
              </p>
            </div>
          </div>

          {/* Right: Language selector & Actions */}
          <div className="flex items-center gap-2">
            {/* Speaking Seat Language selector */}
            <button
              onClick={() => setPendingLang(myLang)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-subtle)] hover:bg-[var(--card)] text-xs font-semibold text-[var(--text)] transition-all cursor-pointer"
              title="Change your speaking language seat"
            >
              <span className="text-[var(--muted)] hidden sm:inline">Speaking:</span>
              <span className="font-bold text-[var(--primary)]">{currentLangName}</span>
            </button>

            {/* Share Link Button */}
            <button
              onClick={handleShareLink}
              className="p-2 rounded-full hover:bg-[var(--bg-subtle)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
              title="Share Room Invite Link"
            >
              <Icons.share className="w-4 h-4" />
            </button>

            {/* Room Info Details Button */}
            <button
              onClick={() => setShowDetailsDrawer(true)}
              className="p-2 rounded-full hover:bg-[var(--bg-subtle)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
              title="View Room Details"
            >
              <Icons.info className="w-4 h-4" />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-[var(--bg-subtle)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Icons.sun className="w-4 h-4 text-amber-400" /> : <Icons.moon className="w-4 h-4 text-indigo-500" />}
            </button>
          </div>
        </header>

        {/* MESSAGES AREA */}
        <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-2">
          {messages.length === 0 && drafts.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center text-[var(--muted)] py-16 space-y-2">
              <span className="text-4xl">👋</span>
              <p className="font-medium text-sm">No messages yet — start talking in {currentLangName} 👋</p>
            </div>
          )}

          {/* Message List */}
          {messages.map((m) => (
            <MergedMessageBubble
              key={m.id}
              message={m}
              allMessages={messages}
              myLang={myLang}
              isExpanded={expandedIds.has(m.id)}
              onToggleExpand={toggleExpanded}
              langNames={LANG_NAMES}
              onReply={(target) => setReplyTo(target)}
              onDelete={(id) => deleteMessage(id)}
              onJumpToReply={(replyId) => {
                const el = document.getElementById(`msg-${replyId}`);
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
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
        <MergedComposer
          currentLangName={currentLangName}
          isConnected={isConnected}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          onSend={(text, extra) => sendMessage(text, extra)}
          onDraft={(text, extra) => {
            sendDraft(text, extra);
            showToast('✨ Translating with Groq AI...');
          }}
          onTyping={(isTyping) => sendTyping(isTyping)}
        />
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        title="Leave this room?"
        description="You will be returned to your dashboard."
      />

      {/* Room Details Drawer */}
      <RoomInfoDrawer
        isOpen={showDetailsDrawer}
        onClose={() => setShowDetailsDrawer(false)}
        roomId={roomId}
        title={roomTitle}
        description={roomDetail?.description}
        emoji={roomDetail?.emoji}
        avatarUrl={roomDetail?.avatar_url}
        members={members}
        distinctLangs={distinctLangs}
        currentEmail={user.email}
        langNames={LANG_NAMES}
        onCopyCode={handleCopyCode}
        onShareLink={handleShareLink}
        onLeaveRoom={() => router.push('/')}
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--card)] text-[var(--text)] border border-[var(--border)] px-4 py-2.5 rounded-full shadow-2xl text-xs sm:text-sm font-semibold flex items-center gap-2 animate-bounce">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
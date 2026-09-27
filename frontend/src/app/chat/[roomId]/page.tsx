"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import { useThemeStore } from '@/store/useThemeStore';
import { getRoom, getRoomMessages, getMembers, getOrCreateDirectRoom, updateRoom } from '@/lib/api';
import { MergedMessageBubble } from '@/components/chat/MergedMessageBubble';
import { MergedComposer } from '@/components/chat/MergedComposer';
import { ChatDraftPreview } from '@/components/chat/ChatDraftPreview';
import { RoomInfoDrawer, MemberInfo } from '@/components/chat/RoomInfoDrawer';
import { UserDetailPopup } from '@/components/profile/UserDetailPopup';
import { LogoutConfirmModal } from '@/components/common/LogoutConfirmModal';
import { MergedAvatar } from '@/components/common/MergedAvatar';
import { Icons } from '@/lib/icons';
import { LANGUAGE_MAP as LANG_NAMES } from '@/lib/languages';

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
    replyTo,
    typingUsers,
    setInitialMessages,
    setReplyTo,
    connect,
    disconnect,
    sendDraft,
    confirmDraft,
    sendTyping,
    sendReadAck,
    removeDraft,
    updateDraftTranslation,
    deleteMessage,
  } = useChatStore();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  // Single source of truth: Settings preferred_language. No per-room seat picker here.
  const [myLang, setMyLang] = useState<string>(user?.preferred_language || 'en');
  const [roomTitle, setRoomTitle] = useState<string>('Chat Room');
  const [roomDetail, setRoomDetail] = useState<any | null>(null);
  const [distinctLangs, setDistinctLangs] = useState<string[]>([]);
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
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

    // Sync to global Settings default (single source of truth).
    if (user.preferred_language) setMyLang(user.preferred_language);

    // 1. Fetch room detail
    getRoom(token, roomId)
      .then((roomData) => {
        if (roomData) {
          setRoomDetail(roomData);
          if (roomData.title) setRoomTitle(roomData.title);
          // Fall back to room seat only if user has no global preference yet.
          if (!user.preferred_language && roomData.my_language) setMyLang(roomData.my_language);
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
    // Read receipts: ack latest incoming final message once visible.
    const lastIncoming = [...messages].reverse().find((m) => !m.is_me && m.delivery_status !== 'read');
    if (lastIncoming && isConnected) {
      sendReadAck(lastIncoming.id);
    }
  }, [messages.length, drafts.length]);

  // Sync if Settings default changes elsewhere (dashboard/profile).
  useEffect(() => {
    if (user?.preferred_language) setMyLang(user.preferred_language);
  }, [user?.preferred_language]);

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

  const handleSaveGroupSettings = async (data: { title: string; description: string; emoji: string }) => {
    if (!token) return;
    const updated = await updateRoom(token, roomId, data);
    setRoomDetail(updated);
    if (updated.title) setRoomTitle(updated.title);
    showToast('⚙️ Group settings saved');
  };

  const handleLogout = () => {
    setShowLogoutModal(false);
    disconnect();
    logout();
    router.push('/');
  };

  const handleOpenDirectChat = async (targetUserId: string) => {
    if (!token) return;
    try {
      const room = await getOrCreateDirectRoom(token, targetUserId);
      setSelectedUserId(null);
      router.push(`/chat/${room.id}`);
    } catch {
      showToast('Failed to open direct chat');
    }
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

            {/* Tap avatar: DM → other person's profile; group → room details */}
            <span
              onClick={() => {
                if (roomDetail?.room_type === 'direct') {
                  const other = members.find((m) => m.email !== user.email);
                  if (other?.user_id) setSelectedUserId(other.user_id);
                } else {
                  setShowDetailsDrawer(true);
                }
              }}
              className="cursor-pointer flex-none"
              title={roomDetail?.room_type === 'direct' ? 'View profile' : 'Room details'}
            >
              <MergedAvatar
                name={roomTitle}
                avatarUrl={roomDetail?.avatar_url}
                emoji={roomDetail?.emoji || '💬'}
                size="md"
              />
            </span>

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

              {/* Typing indicator or DM label / member count */}
              <p className="text-xs text-[var(--muted)] truncate">
                {Object.keys(typingUsers).length > 0 ? (
                  <span className="text-[var(--primary)] font-semibold animate-pulse">
                    {Object.values(typingUsers)[0].username || Object.values(typingUsers)[0].email.split('@')[0]} is typing...
                  </span>
                ) : roomDetail?.room_type === 'direct' ? (
                  'Direct message'
                ) : (
                  `${members.length} participant${members.length > 1 ? 's' : ''}`
                )}
              </p>
            </div>
          </div>

          {/* Right: Default language badge & Actions */}
          <div className="flex items-center gap-2">
            {/* Default language from Settings (read-only here) */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--text)]"
              title="Default language from Settings — change it in Settings"
            >
              <span className="text-[var(--muted)] hidden sm:inline">Default:</span>
              <span className="font-bold text-[var(--primary)]">{currentLangName}</span>
            </div>

            {/* Share Link Button — groups only */}
            {roomDetail?.room_type !== 'direct' && (
              <button
                onClick={handleShareLink}
                className="p-2 rounded-full hover:bg-[var(--bg-subtle)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                title="Share Room Invite Link"
              >
                <Icons.share className="w-4 h-4" />
              </button>
            )}

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

        {/* MESSAGE COMPOSER — all sends go through AI Draft preview */}
        <MergedComposer
          currentLangName={currentLangName}
          isConnected={isConnected}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          onSend={(text, extra) => {
            sendDraft(text, extra);
            showToast('✨ Translating with Groq AI...');
          }}
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
        isDirect={roomDetail?.room_type === 'direct'}
        onSelectMember={(uid) => setSelectedUserId(uid)}
        isAdmin={!!user && !!roomDetail?.creator_id && roomDetail.creator_id === user.id}
        onSaveSettings={handleSaveGroupSettings}
        onLeaveRoom={() => router.push('/')}
      />

      {/* User detail popup (DM avatar tap / roster tap) */}
      <UserDetailPopup
        token={token}
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
        onChat={(uid) => handleOpenDirectChat(uid)}
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
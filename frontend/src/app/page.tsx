"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore } from '@/store/useThemeStore';
import { useChatStore } from '@/store/useChatStore';
import {
  login,
  register,
  getMe,
  createRoom,
  joinRoom,
  listRooms,
  listDiscoverableRooms,
  getRoom,
  getRoomMessages,
  getMembers,
  updateRoom,
  updatePreferredLanguage,
  updateProfile,
  listContacts,
  addContact,
  listContactRequests,
  acceptContactRequest,
  declineContactRequest,
  getOrCreateDirectRoom,
} from '@/lib/api';
import { SUPPORTED_LANGUAGES, LANGUAGE_MAP as LANG_NAMES } from '@/lib/languages';
import { Icons } from '@/lib/icons';
import { MergedAvatar } from '@/components/common/MergedAvatar';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { MergedMessageBubble } from '@/components/chat/MergedMessageBubble';
import { MergedComposer } from '@/components/chat/MergedComposer';
import { ChatDraftPreview } from '@/components/chat/ChatDraftPreview';
import { RoomInfoDrawer, MemberInfo } from '@/components/chat/RoomInfoDrawer';
import { ContactsTab, ContactItem, ContactRequestItem } from '@/components/contacts/ContactsTab';
import { AddContactModal } from '@/components/contacts/AddContactModal';
import { GroupsTab } from '@/components/groups/GroupsTab';
import { CreateGroupModal } from '@/components/groups/CreateGroupModal';
import { ProfileModal } from '@/components/profile/ProfileModal';
import { SettingsTab } from '@/components/settings/SettingsTab';
import { SearchOverlay } from '@/components/search/SearchOverlay';
import { LogoutConfirmModal } from '@/components/common/LogoutConfirmModal';
import { UserDetailPopup } from '@/components/profile/UserDetailPopup';
import { AVATAR_PRESETS } from '@/lib/avatarPresets';

export default function HomePage() {
  const router = useRouter();
  const { token, user, setAuth, updatePreferredLanguage: setStoreLang, updateUserProfile, logout, hasHydrated } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  // Active Main Navigation Tab
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts' | 'groups' | 'settings'>('chats');
  const [isReplayingSkeletons, setIsReplayingSkeletons] = useState(false);

  // Selected Active Conversation
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activeRoomDetail, setActiveRoomDetail] = useState<any | null>(null);
  const [roomMembers, setRoomMembers] = useState<MemberInfo[]>([]);
  // Single source of truth: Settings preferred_language.
  const [mySeatLang, setMySeatLang] = useState<string>(user?.preferred_language || 'en');

  // Auth form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Data lists
  const [rooms, setRooms] = useState<any[]>([]);
  const [discoverRooms, setDiscoverRooms] = useState<any[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [contactRequests, setContactRequests] = useState<ContactRequestItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Panels
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [expandedBubbleIds, setExpandedBubbleIds] = useState<Set<string>>(new Set());

  // Chat Store
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

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  // Keyboard shortcut Ctrl+K / Cmd+K for global search
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearchOverlay((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Hydration & initial data loading
  useEffect(() => {
    if (token && user) {
      loadAllData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  const loadAllData = async () => {
    if (!token) return;
    try {
      const [rList, dList, cList, reqList] = await Promise.all([
        listRooms(token).catch(() => []),
        listDiscoverableRooms(token).catch(() => []),
        listContacts(token).catch(() => []),
        listContactRequests(token).catch(() => []),
      ]);
      setRooms(Array.isArray(rList) ? rList : rList?.rooms ?? []);
      setDiscoverRooms(Array.isArray(dList) ? dList : []);
      setContacts(Array.isArray(cList) ? cList : []);
      setContactRequests(Array.isArray(reqList) ? reqList : []);
    } catch (err) {
      console.error(err);
    }
  };

  // Room Connection & History loading when activeRoomId changes
  useEffect(() => {
    if (!token || !user || !activeRoomId) {
      disconnect();
      return;
    }

    // 1. Fetch Room Metadata — seat follows global Settings default
    getRoom(token, activeRoomId)
      .then((detail) => {
        if (detail) {
          setActiveRoomDetail(detail);
          setMySeatLang(user.preferred_language || detail.my_language || 'en');
          if (detail.members) setRoomMembers(detail.members);
        }
      })
      .catch(console.error);

    // 2. Fetch Historical Messages
    getRoomMessages(token, activeRoomId)
      .then((history) => {
        if (Array.isArray(history)) {
          setInitialMessages(history);
        }
      })
      .catch(console.error);

    // 3. Connect WebSocket
    connect(activeRoomId, token, user.email);

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoomId, token]);

  // Auto-scroll on new messages or drafts + read receipts
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    const lastIncoming = [...messages].reverse().find((m) => !m.is_me && m.delivery_status !== 'read');
    if (lastIncoming && isConnected) {
      sendReadAck(lastIncoming.id);
    }
  }, [messages.length, drafts.length]);

  // Keep seat in sync when Settings default changes
  useEffect(() => {
    if (user?.preferred_language) setMySeatLang(user.preferred_language);
  }, [user?.preferred_language]);

  // Auth Handling
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!email.trim() || !password) {
      setAuthError('Email and password are required.');
      return;
    }
    if (password.length < 8) {
      setAuthError('Password must be at least 8 characters.');
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
      showToast('✨ Welcome to Linguo!');
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSelectRoom = (roomId: string) => {
    setActiveRoomId(roomId);
  };

  const handleOpenDirectChat = async (targetUserId: string) => {
    if (!token) return;
    try {
      const room = await getOrCreateDirectRoom(token, targetUserId);
      await loadAllData();
      setSelectedUserId(null);
      setActiveRoomId(room.id);
      setActiveTab('chats');
    } catch (err: any) {
      showToast(err.message || 'Failed to open direct chat');
    }
  };

  const handleCreateGroup = async (data: { title: string; description: string; emoji: string; is_private: boolean }) => {
    if (!token) return;
    try {
      const myLang = user?.preferred_language || 'en';
      const room = await createRoom(token, data.title, myLang, 'es', {
        description: data.description,
        emoji: data.emoji,
        is_private: data.is_private,
      });
      await loadAllData();
      showToast(`✨ Group "${data.title}" created`);
      setActiveRoomId(room.id);
      setActiveTab('chats');
    } catch (err: any) {
      showToast(err.message || 'Failed to create group');
    }
  };

  const handleJoinPublicRoom = async (roomId: string) => {
    if (!token) return;
    try {
      await joinRoom(token, roomId);
      await loadAllData();
      showToast('🔗 Joined group community');
      setActiveRoomId(roomId);
      setActiveTab('chats');
    } catch (err: any) {
      showToast(err.message || 'Failed to join group');
    }
  };

  const handleAddContactUser = async (targetUserId: string) => {
    if (!token) return;
    try {
      await addContact(token, targetUserId);
      await loadAllData();
      showToast('👥 Contact added');
    } catch (err: any) {
      showToast(err.message || 'Failed to add contact');
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    if (!token) return;
    try {
      await acceptContactRequest(token, requestId);
      await loadAllData();
      showToast('🤝 Connection request accepted');
    } catch (err: any) {
      showToast('Failed to accept request');
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    if (!token) return;
    try {
      await declineContactRequest(token, requestId);
      await loadAllData();
      showToast('Request declined');
    } catch (err: any) {
      showToast('Failed to decline request');
    }
  };

  const handleUpdateProfile = async (profileData: { username?: string; avatar_url?: string; about?: string; phone?: string }) => {
    if (!token) return;
    try {
      const updated = await updateProfile(token, profileData);
      updateUserProfile(updated);
      showToast('Profile updated');
    } catch (err: any) {
      showToast('Failed to update profile');
    }
  };

  const handleUpdateDefaultLanguage = async (newLang: string) => {
    if (!token) return;
    try {
      await updatePreferredLanguage(token, newLang);
      setStoreLang(newLang);
      setMySeatLang(newLang);
      showToast(`Language set to ${LANG_NAMES[newLang] || newLang}`);
    } catch (err: any) {
      showToast('Failed to update language');
    }
  };

  const toggleBubbleExpanded = (id: string) => {
    setExpandedBubbleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleShareLink = async () => {
    if (!activeRoomId) return;
    try {
      const inviteUrl = `${window.location.origin}/chat/${activeRoomId}`;
      await navigator.clipboard.writeText(inviteUrl);
      showToast('🔗 Invite link copied to clipboard');
    } catch {
      showToast(`🔗 ${activeRoomId}`);
    }
  };

  const handleCopyCode = async () => {
    if (!activeRoomId) return;
    try {
      await navigator.clipboard.writeText(activeRoomId);
      showToast('📋 Room code copied');
    } catch {
      showToast(`📋 ${activeRoomId}`);
    }
  };

  const handleSaveGroupSettings = async (data: { title: string; description: string; emoji: string }) => {
    if (!token || !activeRoomId) return;
    const updated = await updateRoom(token, activeRoomId, data);
    setActiveRoomDetail(updated);
    showToast('⚙️ Group settings saved');
    await loadAllData();
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

  // 1. UNAUTHENTICATED: Editorial Auth Screen preserving /auth-art.png
  if (!user || !token) {
    return (
      <AuthScreen
        isLogin={isLogin}
        setIsLogin={setIsLogin}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        authError={authError}
        authLoading={authLoading}
        handleAuth={handleAuth}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    );
  }

  const currentSeatName = LANG_NAMES[mySeatLang] || mySeatLang.toUpperCase();

  const userAvatar =
    user.avatar_url ||
    (user.username?.toLowerCase().includes('kazuma') || user.email?.toLowerCase().includes('kazuma')
      ? AVATAR_PRESETS[0].dataUri
      : undefined);

  // Search items for Ctrl+K
  const searchItems = [
    ...rooms.map((r) => ({
      id: r.id,
      title: r.title,
      subtitle: r.room_type === 'direct' ? 'Direct Message' : 'Group Room',
      avatarUrl: r.avatar_url,
      emoji: r.emoji,
      type: 'room' as const,
    })),
    ...contacts.map((c) => ({
      id: c.user_id,
      title: c.username || c.email.split('@')[0],
      subtitle: c.about || c.email,
      avatarUrl: c.avatar_url,
      type: 'contact' as const,
    })),
  ];

  // 2. AUTHENTICATED: Master Responsive Unified Shell
  return (
    <div className="flex flex-col md:flex-row h-screen h-[100dvh] w-screen overflow-hidden bg-[var(--bg)] text-[var(--text)] transition-colors duration-200">
      
      {/* ========================================================================= */}
      {/* DESKTOP SIDEBAR NAVIGATION (Matches Image 2)                              */}
      {/* ========================================================================= */}
      <nav className="hidden md:flex flex-col justify-between w-60 py-5 px-3 bg-[var(--card)] border-r border-[var(--border)] z-20 flex-none select-none">
        <div className="space-y-6">
          {/* Top: Brand Logo */}
          <div className="flex items-center gap-3 px-3 py-1">
            <div className="w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-lg shadow-sm">
              <Icons.chat className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[var(--text)]">
              halo<span className="text-blue-600">.</span>
            </span>
          </div>

          {/* Navigation Links */}
          <div className="space-y-1">
            {/* Chats */}
            <button
              onClick={() => { setActiveTab('chats'); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'chats'
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 font-bold shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icons.chat className="w-5 h-5" />
                <span>Chats</span>
              </div>
              {rooms.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[11px] font-bold">
                  {rooms.length}
                </span>
              )}
            </button>

            {/* Contacts */}
            <button
              onClick={() => { setActiveTab('contacts'); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'contacts'
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 font-bold shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icons.users className="w-5 h-5" />
                <span>Contacts</span>
              </div>
              {contactRequests.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-bold">
                  {contactRequests.length}
                </span>
              )}
            </button>

            {/* Groups */}
            <button
              onClick={() => { setActiveTab('groups'); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'groups'
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 font-bold shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <Icons.spark className="w-5 h-5" />
              <span>Groups</span>
            </button>

            {/* Settings */}
            <button
              onClick={() => { setActiveTab('settings'); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 font-bold shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <Icons.sliders className="w-5 h-5" />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Bottom Profile Row (Matches Image 2) */}
        <div className="pt-3 border-t border-[var(--border)]">
          <button
            onClick={() => setShowProfileModal(true)}
            className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer text-left group"
            title="View Profile & Edit Picture"
          >
            <MergedAvatar
              name={user.username || user.email}
              avatarUrl={userAvatar}
              size="md"
              shape="circle"
              online={true}
            />
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold truncate text-[var(--text)] group-hover:text-blue-600 transition-colors">
                {user.username || 'Kazuma'}
              </h4>
              <p className="text-[11px] text-[var(--muted)] truncate">Online</p>
            </div>
          </button>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* MAIN VIEW AREA                                                            */}
      {/* ========================================================================= */}
      {activeTab === 'settings' ? (
        <main className="flex-1 flex flex-col min-w-0 bg-[var(--bg)] relative overflow-hidden">
          <SettingsTab
            currentLanguage={user.preferred_language || 'en'}
            onUpdateLanguage={handleUpdateDefaultLanguage}
            theme={theme}
            onToggleTheme={toggleTheme}
            onLogout={() => setShowLogoutModal(true)}
            onBack={() => setActiveTab('chats')}
            onReplaySkeletons={() => {
              setIsReplayingSkeletons(true);
              setActiveTab('chats');
              showToast('⏳ Replaying loading skeleton animations...');
              setTimeout(() => setIsReplayingSkeletons(false), 2000);
            }}
            onResetDemoData={() => {
              loadAllData();
              showToast('✨ Demo data restored');
            }}
            availableLanguages={SUPPORTED_LANGUAGES}
          />
        </main>
      ) : (
        <>
          {/* LIST COLUMN (Left side on desktop, main screen on mobile when no active room)*/}
          <aside
            className={`w-full md:w-80 lg:w-96 flex flex-col bg-[var(--card)] border-r border-[var(--border)] z-10 flex-1 md:flex-none min-h-0 ${
              activeRoomId ? 'hidden md:flex' : 'flex'
            }`}
          >
        {activeTab === 'contacts' ? (
          <ContactsTab
            contacts={contacts}
            requests={contactRequests}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onOpenDirectChat={handleOpenDirectChat}
            onAcceptRequest={handleAcceptRequest}
            onDeclineRequest={handleDeclineRequest}
            onOpenAddModal={() => setShowAddContactModal(true)}
            langNames={LANG_NAMES}
          />
        ) : activeTab === 'groups' ? (
          <GroupsTab
            myRooms={rooms}
            discoverableRooms={discoverRooms}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onEnterRoom={handleSelectRoom}
            onJoinRoom={handleJoinPublicRoom}
            onCreateGroupModal={() => setShowCreateGroupModal(true)}
          />
        ) : (
          /* CHATS TAB (Conversations List) */
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header with Search and New Chat button */}
            <div className="p-4 border-b border-[var(--border)] space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight text-[var(--text)]">Chats</h2>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowCreateGroupModal(true)}
                    className="p-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--card-hover)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                    title="New Group"
                  >
                    <Icons.plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowAddContactModal(true)}
                    className="p-2 rounded-xl bg-[var(--primary)] text-white hover:opacity-90 transition-opacity cursor-pointer"
                    title="Add Contact"
                  >
                    <Icons.userPlus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Search bar */}
              <div className="relative">
                <Icons.search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                />
              </div>
            </div>

            {/* Conversation Items List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {isReplayingSkeletons ? (
                <div className="p-3 space-y-3 animate-pulse">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                      <div className="w-10 h-10 rounded-full bg-[var(--border)] flex-none" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 bg-[var(--border)] rounded w-1/3" />
                        <div className="h-2.5 bg-[var(--border)] rounded w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : rooms.length === 0 ? (
                <div className="text-center py-16 text-[var(--muted)] space-y-3">
                  <span className="text-4xl block">💬</span>
                  <p className="text-sm font-medium">No conversations yet</p>
                  <button
                    onClick={() => setShowCreateGroupModal(true)}
                    className="text-xs font-bold text-[var(--primary)] hover:underline cursor-pointer"
                  >
                    + Create a translation group
                  </button>
                </div>
              ) : (
                rooms
                  .filter((r) => r.title.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((room) => {
                    const isSelected = activeRoomId === room.id;
                    return (
                      <div
                        key={room.id}
                        onClick={() => handleSelectRoom(room.id)}
                        className={`p-3 rounded-2xl transition-all flex items-center justify-between gap-3 cursor-pointer group select-none ${
                          isSelected
                            ? 'bg-[var(--primary)] text-white shadow-md'
                            : 'hover:bg-[var(--bg-subtle)] text-[var(--text)]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <MergedAvatar
                            name={room.title}
                            avatarUrl={room.avatar_url}
                            emoji={room.emoji || '💬'}
                            size="md"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold truncate">{room.title}</h4>
                              {room.room_type === 'group' && (
                                <span
                                  className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full ${
                                    isSelected
                                      ? 'bg-white/20 text-white'
                                      : 'bg-[var(--accent-light)] text-[var(--accent-text)]'
                                  }`}
                                >
                                  Group
                                </span>
                              )}
                            </div>
                            <p
                              className={`text-xs truncate mt-0.5 ${
                                isSelected ? 'text-white/80' : 'text-[var(--muted)]'
                              }`}
                            >
                              {room.last_message || room.description || 'Omni-language chat room'}
                            </p>
                          </div>
                        </div>

                        {room.unread_count > 0 && !isSelected && (
                          <span className="w-5 h-5 rounded-full bg-[var(--primary)] text-white text-[10px] font-bold flex items-center justify-center flex-none">
                            {room.unread_count}
                          </span>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}
      </aside>

      {/* ========================================================================= */}
      {/* ACTIVE CONVERSATION COLUMN                                                 */}
      {/* ========================================================================= */}
      <main
        className={`flex-1 flex flex-col min-w-0 bg-[var(--chat-bg)] relative ${
          activeRoomId ? 'flex' : 'hidden md:flex'
        }`}
      >
        {!activeRoomId ? (
          /* Empty State when no conversation is selected */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-4xl shadow-md">
              💬
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-[var(--text)] font-serif-display">
                Select a conversation
              </h2>
              <p className="text-sm text-[var(--muted)] max-w-sm mt-1">
                Chat in your native language — messages are automatically translated for everyone in real-time with Groq AI.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowCreateGroupModal(true)}
                className="px-4 py-2.5 rounded-full bg-[var(--primary)] text-white text-xs font-bold hover:opacity-90 transition-all shadow-md cursor-pointer"
              >
                + Create Group
              </button>
              <button
                onClick={() => setShowAddContactModal(true)}
                className="px-4 py-2.5 rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--text)] text-xs font-bold hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
              >
                + Add Contact
              </button>
            </div>
          </div>
        ) : (
          /* Active Chat View */
          <div className="flex-1 flex flex-col h-full min-h-0">
            {/* CHAT HEADER */}
            <header className="px-4 py-3 sm:px-6 border-b border-[var(--border)] bg-[var(--card)]/90 backdrop-blur-md flex items-center justify-between gap-3 flex-none z-10">
              <div className="flex items-center gap-3 min-w-0">
                {/* Back button for mobile */}
                <button
                  onClick={() => setActiveRoomId(null)}
                  className="md:hidden p-2 rounded-full hover:bg-[var(--bg-subtle)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                >
                  <Icons.back className="w-5 h-5" />
                </button>

                {/* Tap avatar: DM → other person's profile; group → room details */}
                <span
                  onClick={() => {
                    if (activeRoomDetail?.room_type === 'direct') {
                      const other = roomMembers.find((m) => m.email !== user.email);
                      if (other?.user_id) setSelectedUserId(other.user_id);
                    } else {
                      setShowInfoDrawer(true);
                    }
                  }}
                  className="cursor-pointer flex-none"
                  title={activeRoomDetail?.room_type === 'direct' ? 'View profile' : 'Room details'}
                >
                  <MergedAvatar
                    name={activeRoomDetail?.title || 'Chat'}
                    avatarUrl={activeRoomDetail?.avatar_url}
                    emoji={activeRoomDetail?.emoji || '💬'}
                    size="md"
                  />
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[var(--text)] truncate">
                      {activeRoomDetail?.title || 'Chat Room'}
                    </h3>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isConnected ? 'bg-emerald-500' : 'bg-red-500 animate-ping'
                      }`}
                      title={isConnected ? 'Connected' : 'Connecting...'}
                    />
                  </div>

                  {/* Typing Indicator, DM label, or Member count */}
                  <p className="text-xs text-[var(--muted)] truncate">
                    {Object.keys(typingUsers).length > 0 ? (
                      <span className="text-[var(--primary)] font-semibold animate-pulse">
                        {Object.values(typingUsers)[0].username || Object.values(typingUsers)[0].email.split('@')[0]} is typing...
                      </span>
                    ) : activeRoomDetail?.room_type === 'direct' ? (
                      'Direct message'
                    ) : (
                      `${roomMembers.length} participant${roomMembers.length > 1 ? 's' : ''}`
                    )}
                  </p>
                </div>
              </div>

              {/* Right Header Actions */}
              <div className="flex items-center gap-2">
                {/* Default language badge (Settings is source of truth) */}
                <button
                  onClick={() => setActiveTab('settings')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-subtle)] hover:bg-[var(--card)] text-xs font-semibold text-[var(--text)] transition-all cursor-pointer"
                  title="Default language from Settings — tap to change"
                >
                  <span className="text-[var(--muted)] hidden sm:inline">Default:</span>
                  <span className="font-bold text-[var(--primary)]">{currentSeatName}</span>
                </button>

                {/* Share Link — groups only; a 1:1 chat has no one to invite */}
                {activeRoomDetail?.room_type !== 'direct' && (
                  <button
                    onClick={handleShareLink}
                    className="p-2 rounded-full hover:bg-[var(--bg-subtle)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                    title="Share Invite Link"
                  >
                    <Icons.share className="w-4 h-4" />
                  </button>
                )}

                {/* Room Info Trigger (Drawer) */}
                <button
                  onClick={() => setShowInfoDrawer(true)}
                  className="p-2 rounded-full hover:bg-[var(--bg-subtle)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                  title="Room Information"
                >
                  <Icons.info className="w-4 h-4" />
                </button>
              </div>
            </header>

            {/* MESSAGES LIST AREA */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2 min-h-0">
              {messages.length === 0 && drafts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-[var(--muted)] py-16 space-y-2">
                  <span className="text-4xl">👋</span>
                  <p className="font-medium text-sm">
                    No messages yet — start typing in {currentSeatName} 👋
                  </p>
                </div>
              ) : null}

              {/* Finalized Messages */}
              {messages.map((m) => (
                <MergedMessageBubble
                  key={m.id}
                  message={m}
                  allMessages={messages}
                  myLang={mySeatLang}
                  isExpanded={expandedBubbleIds.has(m.id)}
                  onToggleExpand={toggleBubbleExpanded}
                  langNames={LANG_NAMES}
                  onReply={(target) => setReplyTo(target)}
                  onDelete={(id) => deleteMessage(id)}
                  onJumpToReply={(replyId) => {
                    const el = document.getElementById(`msg-${replyId}`);
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                />
              ))}

              {/* Interactive Draft Translations with Groq AI */}
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
            </div>

            {/* COMPOSER — all sends go through AI Draft preview */}
            <MergedComposer
              currentLangName={currentSeatName}
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
        )}
      </main>
        </>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR (< 768px) - pinned to viewport bottom */}
      {!activeRoomId && (
        <div className="md:hidden flex items-center justify-around py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] border-t border-[var(--border)] bg-[var(--card)] z-30 flex-none select-none">
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex flex-col items-center gap-1 p-1 text-xs font-semibold ${
              activeTab === 'chats' ? 'text-blue-600' : 'text-[var(--muted)]'
            }`}
          >
            <Icons.chat className="w-5 h-5" />
            <span>Chats</span>
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`relative flex flex-col items-center gap-1 p-1 text-xs font-semibold ${
              activeTab === 'contacts' ? 'text-blue-600' : 'text-[var(--muted)]'
            }`}
          >
            <Icons.users className="w-5 h-5" />
            <span>Contacts</span>
            {contactRequests.length > 0 && (
              <span className="absolute top-0 right-3 w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`flex flex-col items-center gap-1 p-1 text-xs font-semibold ${
              activeTab === 'groups' ? 'text-blue-600' : 'text-[var(--muted)]'
            }`}
          >
            <Icons.spark className="w-5 h-5" />
            <span>Groups</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-1 p-1 text-xs font-semibold ${
              activeTab === 'settings' ? 'text-blue-600' : 'text-[var(--muted)]'
            }`}
          >
            <Icons.sliders className="w-5 h-5" />
            <span>Settings</span>
          </button>
          <button
            onClick={() => setShowProfileModal(true)}
            className="flex flex-col items-center gap-1 p-1 text-xs font-semibold text-[var(--muted)]"
          >
            <MergedAvatar
              name={user.username || user.email}
              avatarUrl={userAvatar}
              size="xs"
              shape="circle"
            />
            <span>Profile</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SLIDE-IN MODALS & OVERLAYS                                                 */}
      {/* ========================================================================= */}

      {/* Room Details Drawer */}
      {activeRoomId && (
        <RoomInfoDrawer
          isOpen={showInfoDrawer}
          onClose={() => setShowInfoDrawer(false)}
          roomId={activeRoomId}
          title={activeRoomDetail?.title || 'Chat Room'}
          description={activeRoomDetail?.description}
          emoji={activeRoomDetail?.emoji}
          avatarUrl={activeRoomDetail?.avatar_url}
          members={roomMembers}
          distinctLangs={activeRoomDetail?.distinct_langs || []}
          currentEmail={user.email}
          langNames={LANG_NAMES}
          onCopyCode={handleCopyCode}
          onShareLink={handleShareLink}
          isDirect={activeRoomDetail?.room_type === 'direct'}
          onSelectMember={(uid) => setSelectedUserId(uid)}
          isAdmin={!!user && !!activeRoomDetail?.creator_id && activeRoomDetail.creator_id === user.id}
          creatorId={activeRoomDetail?.creator_id}
          onSaveSettings={handleSaveGroupSettings}
          onLeaveRoom={() => {
            setShowInfoDrawer(false);
            setActiveRoomId(null);
          }}
        />
      )}

      {/* User detail popup (DM avatar tap / roster tap) */}
      <UserDetailPopup
        token={token}
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
        onChat={(uid) => handleOpenDirectChat(uid)}
      />

      {/* Add Contact Modal */}
      <AddContactModal
        isOpen={showAddContactModal}
        onClose={() => setShowAddContactModal(false)}
        token={token}
        onAddContact={handleAddContactUser}
        onSendRequest={handleAddContactUser}
      />

      {/* Create Group Community Modal */}
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onCreate={handleCreateGroup}
      />

      {/* User Profile & Settings Modal (Image 3) */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
        onUpdateProfile={handleUpdateProfile}
        onUpdateLanguage={handleUpdateDefaultLanguage}
        availableLanguages={SUPPORTED_LANGUAGES}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={() => setShowLogoutModal(true)}
        chatsCount={rooms.length}
        contactsCount={contacts.length}
        groupsCount={rooms.filter((r) => r.room_type === 'group').length}
      />

      {/* Search Overlay (Ctrl+K) */}
      <SearchOverlay
        isOpen={showSearchOverlay}
        onClose={() => setShowSearchOverlay(false)}
        items={searchItems}
        onSelect={(item) => {
          if (item.type === 'room') {
            handleSelectRoom(item.id);
          } else {
            handleOpenDirectChat(item.id);
          }
        }}
      />

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => {
          setShowLogoutModal(false);
          logout();
        }}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--card)] text-[var(--text)] border border-[var(--border)] px-4 py-2.5 rounded-full shadow-2xl text-xs sm:text-sm font-semibold flex items-center gap-2 animate-bounce">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
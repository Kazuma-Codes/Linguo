import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore } from '@/store/useThemeStore';
import { Colors } from '@/constants/theme';
import {
  acceptContactRequest,
  addContact,
  createRoom,
  declineContactRequest,
  getMe,
  getOrCreateDirectRoom,
  googleLogin,
  joinRoom,
  listContactRequests,
  listContacts,
  listDiscoverableRooms,
  listRooms,
  login,
  register,
  searchUsers,
  updatePreferredLanguage,
  updateProfile,
} from '@/lib/api';
import { LANGUAGE_MAP, SUPPORTED_LANGUAGES } from '@/lib/languages';
import { AVATAR_PRESETS } from '@/lib/avatarPresets';
import { MergedAvatar } from '@/components/MergedAvatar';
import { Toast } from '@/components/Toast';
import { LogoutConfirmModal } from '@/components/LogoutConfirmModal';
import { AddContactModal } from '@/components/AddContactModal';
import { CreateGroupModal } from '@/components/CreateGroupModal';
import { EditAvatarModal } from '@/components/EditAvatarModal';
import { UserDetailPopup, } from '@/components/UserDetailPopup';
import { SearchOverlay, SearchItem } from '@/components/SearchOverlay';

type Tab = 'chats' | 'contacts' | 'groups' | 'settings' | 'profile';
type C = (typeof Colors)[keyof typeof Colors];

WebBrowser.maybeCompleteAuthSession();

function extractRoomId(input: string): string | null {
  if (!input) return null;
  const m = input.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
  return m ? m[0] : null;
}

export default function Home() {
  const { token, user, setAuth, setLang, updateUser, logout, hasHydrated } = useAuthStore();
  const systemScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const themeMode = useThemeStore((s) => s.mode);
  const resolved = useThemeStore((s) => s.resolved);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const scheme = resolved;
  const c = Colors[scheme];
  const s = makeStyles(c);

  const [tab, setTab] = useState<Tab>('chats');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rooms, setRooms] = useState<any[]>([]);
  const [discover, setDiscover] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [contactResults, setContactResults] = useState<any[]>([]);
  const [contactSearching, setContactSearching] = useState(false);
  const [contactsSub, setContactsSub] = useState<'all' | 'requests'>('all');
  const [groupsSub, setGroupsSub] = useState<'joined' | 'discover'>('joined');

  // Settings tab state (mirrors web SettingsTab)
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [enterToSend, setEnterToSend] = useState(true);
  const [demoMsg, setDemoMsg] = useState('');
  const [simulatedError, setSimulatedError] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [privacyExpanded, setPrivacyExpanded] = useState(false);
  const [isReplayingSkeletons, setIsReplayingSkeletons] = useState(false);

  // Profile tab state (mirrors web ProfileModal)
  const [profileSub, setProfileSub] = useState<'main' | 'edit' | 'security' | 'notifications' | 'privacy'>('main');
  const [editUsername, setEditUsername] = useState('');
  const [editAbout, setEditAbout] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveTick, setSaveTick] = useState('');

  // Modals & overlays (mirrors web page.tsx)
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showLogout, setShowLogout] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const myLang = user?.preferred_language || 'en';
  const myName = user?.username || user?.email?.split('@')[0] || 'T';
  const userAvatar =
    user?.avatar_url ||
    (user?.username?.toLowerCase().includes('kazuma') || user?.email?.toLowerCase().includes('kazuma')
      ? AVATAR_PRESETS[0].dataUri
      : undefined);

  const showToast = (msg: string) => setToastMsg(msg);

  useEffect(() => {
    hydrateTheme(systemScheme);
  }, []);

  useEffect(() => {
    if (themeMode === 'system') {
      useThemeStore.setState({ resolved: systemScheme });
    }
  }, [systemScheme]);

  const googleIdConfigured = !!(
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
  );
  // NOTE: hook must always run, but crashes on web when webClientId is
  // undefined. Pass a dummy so web (`expo start --web`) renders; the Google
  // button stays hidden via `googleIdConfigured` until real IDs are set.
  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || 'missing-android-client-id',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || 'missing-ios-client-id',
    webClientId:
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'missing-web-client-id.apps.googleusercontent.com',
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    if (googleResponse?.type !== 'success') {
      if (googleResponse?.type === 'error') setError('Google sign-in was cancelled or failed');
      return;
    }
    (async () => {
      setLoading(true);
      try {
        let idToken = (googleResponse.params as any)?.id_token as string | undefined;
        if (!idToken && googleResponse.params.code && googleRequest?.codeVerifier) {
          const cid =
            Platform.OS === 'android'
              ? process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
              : Platform.OS === 'ios'
                ? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
                : process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
          const exchanged: any = await AuthSession.exchangeCodeAsync(
            {
              clientId: cid || '',
              redirectUri: googleRequest.redirectUri,
              code: googleResponse.params.code,
              extraParams: { code_verifier: googleRequest.codeVerifier },
            },
            { tokenEndpoint: 'https://oauth2.googleapis.com/token' },
          );
          idToken = exchanged?.id_token;
        }
        if (!idToken) throw new Error('Google did not return a credential');
        const t = await googleLogin(idToken);
        const access = t.access_token || t.accessToken;
        const me = await getMe(access);
        await setAuth(access, {
          id: me.id,
          email: me.email,
          username: me.username,
          avatar_url: me.avatar_url,
          about: me.about,
          phone: me.phone,
          preferred_language: me.preferred_language || me.preferredLanguage || 'en',
          show_online: me.show_online,
          read_receipts: me.read_receipts,
        });
        showToast('✨ Welcome to Linguo!');
      } catch (e: any) {
        setError(e.message || 'Google sign-in failed');
      } finally {
        setLoading(false);
      }
    })();
  }, [googleResponse]);

  async function load() {
    if (!token) return;
    try {
      const [r, d, ct, rq] = await Promise.all([
        listRooms(token).catch(() => []),
        listDiscoverableRooms(token).catch(() => []),
        listContacts(token),
        listContactRequests(token),
      ]);
      const rList = Array.isArray(r) ? r : (r as any)?.rooms ?? [];
      setRooms(rList);
      setDiscover(Array.isArray(d) ? d : []);
      setContacts(Array.isArray(ct) ? ct : []);
      setRequests(Array.isArray(rq) ? rq : []);
    } catch {}
  }

  useEffect(() => {
    if (token) load();
  }, [token]);

  useEffect(() => {
    if (token && tab === 'contacts') load();
  }, [tab]);

  async function handleAuth() {
    setError('');
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        const t = await login(email.trim(), password);
        const access = t.access_token || t.accessToken;
        const me = await getMe(access);
        await setAuth(access, {
          id: me.id,
          email: me.email,
          username: me.username,
          avatar_url: me.avatar_url,
          about: me.about,
          phone: me.phone,
          preferred_language: me.preferred_language || me.preferredLanguage || 'en',
          show_online: me.show_online,
          read_receipts: me.read_receipts,
        });
      } else {
        await register(email.trim(), password, 'en');
        const t = await login(email.trim(), password);
        const access = t.access_token || t.accessToken;
        const me = await getMe(access);
        await setAuth(access, {
          id: me.id,
          email: me.email,
          username: me.username,
          avatar_url: me.avatar_url,
          about: me.about,
          phone: me.phone,
          preferred_language: 'en',
        });
      }
      setEmail('');
      setPassword('');
      showToast('✨ Welcome to Linguo!');
    } catch (e: any) {
      setError(e.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateGroup(data: { title: string; description: string; is_private: boolean }) {
    if (!token) return;
    try {
      const room = await createRoom(token, data.title, myLang, 'es', {
        description: data.description,
        is_private: data.is_private,
      });
      await load();
      showToast(`✨ Group "${data.title}" created`);
      setTab('chats');
      router.push(`/chat/${room.id}` as any);
    } catch (e: any) {
      setError(e.message);
      showToast(e.message || 'Failed to create group');
    }
  }

  async function handleJoin(id: string) {
    if (!token) return;
    try {
      await joinRoom(token, id);
      await load();
      showToast('🔗 Joined group community');
      router.push(`/chat/${id}` as any);
    } catch (e: any) {
      if (/already|conflict/i.test(e.message || '')) {
        router.push(`/chat/${id}` as any);
      } else {
        setError(e.message);
        showToast(e.message || 'Failed to join group');
      }
    }
  }

  async function handleJoinByCode() {
    if (!token || !inviteCode.trim()) return;
    const id = extractRoomId(inviteCode);
    if (!id) {
      showToast('That doesn’t look like an invite link or room code');
      return;
    }
    try {
      await joinRoom(token, id);
      await load();
      setInviteCode('');
      showToast('🔗 Joined group');
      router.push(`/chat/${id}` as any);
    } catch (e: any) {
      if (/already|conflict/i.test(e.message || '')) {
        setInviteCode('');
        router.push(`/chat/${id}` as any);
      } else {
        setError(e.message);
        showToast(e.message || 'Failed to join group');
      }
    }
  }

  async function handleLangChange(code: string) {
    if (!token) return;
    try {
      await updatePreferredLanguage(token, code);
      setLang(code);
      showToast(`Language set to ${LANGUAGE_MAP[code] || code}`);
    } catch (e: any) {
      setError(e.message);
      showToast('Failed to update language');
    }
  }

  async function handlePrivacyChange(patch: { show_online?: boolean; read_receipts?: boolean }) {
    if (!token) return;
    updateUser(patch);
    try {
      const updated = await updateProfile(token, patch);
      updateUser({
        show_online: updated.show_online ?? patch.show_online,
        read_receipts: updated.read_receipts ?? patch.read_receipts,
      });
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleRequest(id: string, accept: boolean) {
    if (!token) return;
    try {
      if (accept) await acceptContactRequest(token, id);
      else await declineContactRequest(token, id);
      await load();
      showToast(accept ? '🤝 Connection request accepted' : 'Request declined');
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleFindFriends() {
    if (!token || !contactSearch.trim()) {
      setContactResults([]);
      return;
    }
    setContactSearching(true);
    try {
      const res = await searchUsers(token, contactSearch.trim());
      setContactResults(Array.isArray(res) ? res : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setContactSearching(false);
    }
  }

  async function handleAddFriend(targetUserId: string) {
    if (!token) return;
    try {
      await addContact(token, targetUserId);
      setContactSearch('');
      setContactResults([]);
      await load();
      showToast('👥 Contact added');
    } catch (e: any) {
      setError(e.message);
      showToast(e.message || 'Failed to add contact');
    }
  }

  async function handleOpenDirectChat(friendUserId: string, directRoomId?: string) {
    if (!token) return;
    try {
      if (directRoomId) {
        router.push(`/chat/${directRoomId}` as any);
        return;
      }
      const room = await getOrCreateDirectRoom(token, friendUserId);
      await load();
      setSelectedUserId(null);
      setTab('chats');
      router.push(`/chat/${room.id}` as any);
    } catch (e: any) {
      setError(e.message);
      showToast(e.message || 'Failed to open direct chat');
    }
  }

  function openEditProfile() {
    setEditUsername(user?.username || user?.email?.split('@')[0] || '');
    setEditAbout(user?.about || '');
    setEditPhone(user?.phone || '');
    setSaveTick('');
    setProfileSub('edit');
  }

  async function handleSaveAvatarDirect(newUrl: string) {
    if (!token) return;
    updateUser({ avatar_url: newUrl });
    try {
      const updated = await updateProfile(token, { avatar_url: newUrl });
      updateUser({ avatar_url: updated.avatar_url ?? newUrl });
      setSaveTick('Photo updated ✓');
      showToast('Profile updated');
    } catch (e: any) {
      setSaveTick(e.message || 'Photo upload failed');
      showToast('Failed to update profile');
    }
  }

  async function handleSaveProfile() {
    if (!token) return;
    setSavingProfile(true);
    try {
      const updated = await updateProfile(token, {
        username: editUsername.trim(),
        about: editAbout.trim(),
        phone: editPhone.trim(),
      });
      updateUser({
        username: updated.username ?? editUsername.trim(),
        about: updated.about ?? editAbout.trim(),
        phone: updated.phone ?? editPhone.trim(),
      });
      setSaveTick('Saved ✓');
      showToast('Profile updated');
      setTimeout(() => setProfileSub('main'), 900);
    } catch (e: any) {
      setSaveTick(e.message || 'Save failed');
    } finally {
      setSavingProfile(false);
    }
  }

  if (!hasHydrated) {
    return (
      <SafeAreaView style={[{ flex: 1, alignItems: 'center', justifyContent: 'center' }, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.primary} />
        <Text style={{ color: c.textSecondary, marginTop: 8 }}>Loading Linguo...</Text>
      </SafeAreaView>
    );
  }

  if (!token || !user) {
    return (
      <SafeAreaView style={s.authWrap}>
        <Pressable style={s.themeFab} onPress={toggleTheme} accessibilityLabel="Toggle theme">
          <Ionicons name={scheme === 'dark' ? 'sunny-outline' : 'moon-outline'} size={18} color={c.text} />
        </Pressable>
        <Text style={s.brand}>
          halo<Text style={{ color: c.primary }}>.</Text>
        </Text>
        <Text style={s.sub}>Omni-language chat</Text>
        <View style={[s.quoteCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[s.quote, { color: c.text }]}>
            “One language sets you in a corridor for life. Two languages open every door along the way.”
          </Text>
          <Text style={[s.quoteBy, { color: c.textSecondary }]}>— THE MOSAIC COMMUNITY · 48 LANGUAGES</Text>
        </View>
        <Text style={s.fieldLabel}>Email</Text>
        <TextInput
          style={s.input}
          placeholder="you@mosaic.app"
          placeholderTextColor={c.textSecondary}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Text style={s.fieldLabel}>Password</Text>
        <View style={s.passRow}>
          <TextInput
            style={[s.input, { flex: 1 }]}
            placeholder="••••••••"
            placeholderTextColor={c.textSecondary}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={handleAuth}
          />
          <Pressable style={s.eye} onPress={() => setShowPassword((v) => !v)}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={c.textSecondary} />
          </Pressable>
        </View>
        {!!error && (
          <View style={s.errorBanner}>
            <Text style={s.errorText}>⚠️ {error}</Text>
          </View>
        )}
        <Pressable style={[s.primary, { opacity: loading ? 0.6 : 1 }]} onPress={handleAuth} disabled={loading}>
          <Text style={s.primaryText}>{loading ? 'Processing…' : isLogin ? 'Sign In' : 'Sign Up'}</Text>
        </Pressable>
        <Pressable onPress={() => setIsLogin((v) => !v)}>
          <Text style={s.link}>{isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign In'}</Text>
        </Pressable>
        {googleIdConfigured && (
          <>
            <View style={s.orRow}>
              <View style={s.orLine} />
              <Text style={s.sub}>or</Text>
              <View style={s.orLine} />
            </View>
            <Pressable style={s.googleBtn} onPress={() => googlePromptAsync()} disabled={!googleRequest || loading}>
              <Ionicons name="logo-google" size={18} color="#DB4437" />
              <Text style={s.googleBtnText}>Continue with Google</Text>
            </Pressable>
          </>
        )}
        <Toast message={toastMsg} onHide={() => setToastMsg(null)} />
      </SafeAreaView>
    );
  }

  const filteredRooms = rooms.filter((r) => (r.title || '').toLowerCase().includes(search.toLowerCase()));
  const filteredContacts = contacts.filter((ct: any) => {
    const q = search.toLowerCase();
    return (ct.email || '').toLowerCase().includes(q) || (ct.username || '').toLowerCase().includes(q);
  });
  const myGroups = rooms.filter((r) => r.room_type === 'group');
  const filteredMyGroups = myGroups.filter((r) => (r.title || '').toLowerCase().includes(search.toLowerCase()));
  const filteredDiscover = discover.filter((r) => (r.title || '').toLowerCase().includes(search.toLowerCase()));

  const searchItems: SearchItem[] = [
    ...rooms.map((r: any) => ({
      id: r.id,
      title: r.title,
      subtitle: r.room_type === 'direct' ? 'Direct Message' : 'Group Room',
      avatarUrl: r.avatar_url,
      type: 'room' as const,
    })),
    ...contacts.map((ct: any) => ({
      id: String(ct.user_id || ct.id),
      title: ct.username || (ct.email || '').split('@')[0],
      subtitle: ct.about || ct.email,
      avatarUrl: ct.avatar_url,
      type: 'contact' as const,
    })),
  ];

  const tabs: Array<{ key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
    { key: 'chats', label: 'Chats', icon: 'chatbubble-outline' },
    { key: 'contacts', label: 'Contacts', icon: 'people-outline' },
    { key: 'groups', label: 'Groups', icon: 'sparkles-outline' },
    { key: 'settings', label: 'Settings', icon: 'options-outline' },
  ];

  return (
    <SafeAreaView style={s.shell} edges={['top', 'left', 'right']}>
      <View style={s.body}>
        {tab === 'chats' && (
          <>
            <View style={s.headerRow}>
              <Text style={s.headerTitle}>Chats</Text>
              <View style={s.headerActions}>
                <Pressable style={s.iconBtn} onPress={() => setShowSearch(true)} accessibilityLabel="Global search">
                  <Ionicons name="search-outline" size={18} color={c.textSecondary} />
                </Pressable>
                <Pressable style={s.iconBtn} onPress={() => setShowCreateGroup(true)} accessibilityLabel="New group">
                  <Ionicons name="add" size={20} color={c.textSecondary} />
                </Pressable>
                <Pressable style={s.iconBtnPrimary} onPress={() => setTab('contacts')} accessibilityLabel="Add contact">
                  <Ionicons name="person-add-outline" size={16} color="#fff" />
                </Pressable>
              </View>
            </View>
            <View style={s.searchPill}>
              <Ionicons name="search-outline" size={15} color={c.textSecondary} />
              <TextInput
                style={s.searchInput}
                placeholder="Search conversations..."
                placeholderTextColor={c.textSecondary}
                value={search}
                onChangeText={setSearch}
              />
            </View>
            {!!error && <Text style={s.error}>{error}</Text>}
            {isReplayingSkeletons ? (
              <View style={{ gap: 8, paddingTop: 8 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <View key={i} style={[s.skelRow, { backgroundColor: c.backgroundElement, borderColor: c.border }]}>
                    <View style={[s.skelAvatar, { backgroundColor: c.border }]} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <View style={[s.skelLine, { backgroundColor: c.border, width: '40%' }]} />
                      <View style={[s.skelLineThin, { backgroundColor: c.border, width: '70%' }]} />
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <FlatList
                data={filteredRooms}
                keyExtractor={(r) => r.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <Pressable style={s.row} onPress={() => router.push(`/chat/${item.id}` as any)}>
                    <MergedAvatar name={item.title || '?'} avatarUrl={item.avatar_url} size="md" />
                    <View style={s.rowText}>
                      <View style={s.rowTitleRow}>
                        <Text style={s.rowTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        {item.room_type === 'group' && (
                          <View style={s.groupBadge}>
                            <Text style={s.groupBadgeText}>GROUP</Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.rowSub} numberOfLines={1}>
                        {item.last_message || item.description || 'Omni-language chat room'}
                      </Text>
                    </View>
                    {item.unread_count > 0 && (
                      <View style={s.unread}>
                        <Text style={s.unreadText}>{item.unread_count}</Text>
                      </View>
                    )}
                  </Pressable>
                )}
                ListEmptyComponent={
                  <View style={s.emptyWrap}>
                    <Text style={s.emptyEmoji}>💬</Text>
                    <Text style={[s.emptyTitle, { color: c.text }]}>No conversations yet</Text>
                    <Pressable onPress={() => setShowCreateGroup(true)}>
                      <Text style={[s.emptyLink, { color: c.primary }]}>+ Create a translation group</Text>
                    </Pressable>
                  </View>
                }
              />
            )}
          </>
        )}

        {tab === 'contacts' && (
          <>
            <Text style={s.headerTitle}>Contacts</Text>
            <View style={s.subTabs}>
              <Pressable
                style={[s.subTab, contactsSub === 'all' && { backgroundColor: c.card }]}
                onPress={() => setContactsSub('all')}
              >
                <Text style={[s.subTabText, { color: contactsSub === 'all' ? c.text : c.textSecondary }]}>
                  All Contacts ({contacts.length})
                </Text>
              </Pressable>
              <Pressable
                style={[s.subTab, contactsSub === 'requests' && { backgroundColor: c.card }]}
                onPress={() => setContactsSub('requests')}
              >
                <Text style={[s.subTabText, { color: contactsSub === 'requests' ? c.text : c.textSecondary }]}>
                  Requests{requests.length > 0 ? ` (${requests.length})` : ''}
                </Text>
                {requests.length > 0 && <View style={s.dot} />}
              </Pressable>
              <Pressable style={[s.miniPrimary, { marginLeft: 'auto' }]} onPress={() => setShowAddContact(true)}>
                <Text style={s.miniPrimaryText}>+ Add</Text>
              </Pressable>
            </View>
            <View style={s.searchPill}>
              <Ionicons name="search-outline" size={15} color={c.textSecondary} />
              <TextInput
                style={s.searchInput}
                placeholder="Find friends by name or email..."
                placeholderTextColor={c.textSecondary}
                value={contactSearch}
                onChangeText={setContactSearch}
                onSubmitEditing={handleFindFriends}
                returnKeyType="search"
              />
              <Pressable style={s.miniPrimary} onPress={handleFindFriends} disabled={contactSearching}>
                <Text style={s.miniPrimaryText}>{contactSearching ? '…' : 'Find'}</Text>
              </Pressable>
            </View>
            {contactResults.length > 0 && (
              <>
                <Text style={s.sectionLabel}>Results — tap + to add</Text>
                {contactResults.map((u: any) => {
                  const already = contacts.some((ct: any) => (ct.user_id || ct.id) === (u.id || u.user_id));
                  return (
                    <View key={u.id || u.user_id} style={s.row}>
                      <MergedAvatar name={u.username || u.email || '?'} avatarUrl={u.avatar_url} size="md" />
                      <View style={s.rowText}>
                        <Text style={s.rowTitle}>{u.username || u.email?.split('@')[0]}</Text>
                        <Text style={s.rowSub} numberOfLines={1}>
                          {u.about || u.email}
                        </Text>
                      </View>
                      {!already && (
                        <Pressable style={s.miniPrimary} onPress={() => handleAddFriend(u.id || u.user_id)}>
                          <Text style={s.miniPrimaryText}>+ Add</Text>
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </>
            )}
            {contactsSub === 'requests' ? (
              requests.length === 0 ? (
                <Text style={s.empty}>💌 No pending contact requests</Text>
              ) : (
                <FlatList
                  data={requests}
                  keyExtractor={(rq: any) => String(rq.id)}
                  renderItem={({ item: rq }: any) => (
                    <View style={[s.cardRow, { backgroundColor: c.card, borderColor: c.border }]}>
                      <MergedAvatar
                        name={rq.from_username || rq.from_email || '?'}
                        avatarUrl={rq.from_user_avatar_url || rq.from_avatar_url}
                        size="md"
                      />
                      <View style={s.rowText}>
                        <Text style={s.rowTitle}>{rq.from_username || rq.from_email?.split('@')[0]}</Text>
                        <Text style={s.rowSub}>{rq.from_email}</Text>
                        {!!rq.content && (
                          <Text style={[s.rowSub, { fontStyle: 'italic' }]}>“{rq.content}”</Text>
                        )}
                        <View style={s.reqRow}>
                          <Pressable style={s.miniPrimary} onPress={() => handleRequest(rq.id, true)}>
                            <Text style={s.miniPrimaryText}>Accept</Text>
                          </Pressable>
                          <Pressable style={s.miniGhost} onPress={() => handleRequest(rq.id, false)}>
                            <Text style={[s.miniGhostText, { color: c.textSecondary }]}>Decline</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  )}
                />
              )
            ) : (
              <>
                <Text style={s.sectionLabel}>My friends ({filteredContacts.length})</Text>
                <FlatList
                  data={filteredContacts}
                  keyExtractor={(ct: any) => String(ct.user_id || ct.id)}
                  renderItem={({ item }: any) => (
                    <Pressable
                      style={s.row}
                      onPress={() => handleOpenDirectChat(String(item.user_id || item.id), item.direct_room_id)}
                    >
                      <MergedAvatar name={item.username || item.email || '?'} avatarUrl={item.avatar_url} size="md" />
                      <View style={s.rowText}>
                        <Text style={s.rowTitle}>{item.username || item.email?.split('@')[0]}</Text>
                        <Text style={s.rowSub} numberOfLines={1}>
                          {item.about || item.email}
                        </Text>
                      </View>
                      {!!item.preferred_language && (
                        <View style={s.langBadge}>
                          <Text style={s.langBadgeText}>{LANGUAGE_MAP[item.preferred_language] || item.preferred_language}</Text>
                        </View>
                      )}
                      <Ionicons name="chevron-forward" size={18} color={c.textSecondary} />
                    </Pressable>
                  )}
                  ListEmptyComponent={<Text style={s.empty}>No friends yet — search above to add people.</Text>}
                />
              </>
            )}
          </>
        )}

        {tab === 'groups' && (
          <>
            <Text style={s.headerTitle}>Groups</Text>
            <View style={s.subTabs}>
              <Pressable
                style={[s.subTab, groupsSub === 'joined' && { backgroundColor: c.card }]}
                onPress={() => setGroupsSub('joined')}
              >
                <Text style={[s.subTabText, { color: groupsSub === 'joined' ? c.text : c.textSecondary }]}>
                  My Groups ({filteredMyGroups.length})
                </Text>
              </Pressable>
              <Pressable
                style={[s.subTab, groupsSub === 'discover' && { backgroundColor: c.card }]}
                onPress={() => setGroupsSub('discover')}
              >
                <Text style={[s.subTabText, { color: groupsSub === 'discover' ? c.text : c.textSecondary }]}>
                  Discover ({discover.length})
                </Text>
              </Pressable>
              <Pressable style={[s.miniPrimary, { marginLeft: 'auto' }]} onPress={() => setShowCreateGroup(true)}>
                <Text style={s.miniPrimaryText}>+ New</Text>
              </Pressable>
            </View>
            <View style={s.searchPill}>
              <Ionicons name="search-outline" size={15} color={c.textSecondary} />
              <TextInput
                style={s.searchInput}
                placeholder="Search group communities..."
                placeholderTextColor={c.textSecondary}
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <View style={s.joinRow}>
              <TextInput
                style={[s.input, { flex: 1 }]}
                placeholder="Paste invite link or room code…"
                placeholderTextColor={c.textSecondary}
                value={inviteCode}
                onChangeText={setInviteCode}
                autoCapitalize="none"
                onSubmitEditing={handleJoinByCode}
                returnKeyType="join"
              />
              <Pressable style={s.miniPrimary} onPress={handleJoinByCode}>
                <Text style={s.miniPrimaryText}>Join</Text>
              </Pressable>
            </View>
            {groupsSub === 'joined' ? (
              <FlatList
                data={filteredMyGroups}
                keyExtractor={(r) => r.id}
                renderItem={({ item }) => (
                  <Pressable style={[s.cardRow, { backgroundColor: c.card, borderColor: c.border }]} onPress={() => router.push(`/chat/${item.id}` as any)}>
                    <MergedAvatar name={item.title || '?'} avatarUrl={item.avatar_url} size="md" />
                    <View style={s.rowText}>
                      <View style={s.rowTitleRow}>
                        <Text style={s.rowTitle} numberOfLines={1}>{item.title}</Text>
                        <View style={s.omniBadge}>
                          <Text style={s.omniText}>OMNI</Text>
                        </View>
                      </View>
                      <Text style={s.rowSub} numberOfLines={1}>
                        {item.last_message || item.description || 'Omni-language chat room'}
                      </Text>
                    </View>
                    <View style={[s.miniPrimary, { backgroundColor: c.primary }]}>
                      <Text style={s.miniPrimaryText}>Open →</Text>
                    </View>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <View style={s.emptyWrap}>
                    <Text style={s.emptyEmoji}>🌐</Text>
                    <Text style={[s.emptyTitle, { color: c.textSecondary }]}>You have not joined any group rooms yet</Text>
                    <Pressable onPress={() => setGroupsSub('discover')}>
                      <Text style={[s.emptyLink, { color: c.primary }]}>Browse public rooms · Create a new group</Text>
                    </Pressable>
                  </View>
                }
              />
            ) : (
              <FlatList
                data={filteredDiscover}
                keyExtractor={(r) => r.id}
                renderItem={({ item }) => (
                  <View style={[s.cardRow, { backgroundColor: c.card, borderColor: c.border }]}>
                    <MergedAvatar name={item.title || '?'} avatarUrl={item.avatar_url} size="md" />
                    <View style={s.rowText}>
                      <Text style={s.rowTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={s.rowSub} numberOfLines={1}>
                        {item.description || 'Public cross-language discussion group'}
                      </Text>
                      {!!item.members_count && (
                        <Text style={[s.rowSub, { marginTop: 2 }]}>{item.members_count} members</Text>
                      )}
                    </View>
                    <Pressable style={s.miniPrimary} onPress={() => handleJoin(item.id)}>
                      <Text style={s.miniPrimaryText}>Join</Text>
                    </Pressable>
                  </View>
                )}
                ListEmptyComponent={<Text style={s.empty}>🔍 No discoverable public groups right now</Text>}
              />
            )}
          </>
        )}

        {tab === 'settings' && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 16 }}>
            <Text style={s.headerTitle}>Settings</Text>
            {!!demoMsg && <Text style={s.demoMsg}>{demoMsg}</Text>}
            {simulatedError && (
              <View style={s.errorCard}>
                <Text style={s.errorTitle}>Simulated Connection Error</Text>
                <Text style={s.errorSub}>Previewing error boundary & retry UI state.</Text>
                <Pressable style={s.retryBtn} onPress={() => setSimulatedError(false)}>
                  <Text style={s.retryText}>Dismiss / Retry</Text>
                </Pressable>
              </View>
            )}

            <Text style={s.sectionLabel}>Preferences</Text>
            <View style={s.menuCard}>
              <Pressable style={s.menuRow} onPress={toggleTheme}>
                <View style={[s.menuIcon, { backgroundColor: c.primarySoft }]}>
                  <Ionicons name="contrast-outline" size={20} color={c.primary} />
                </View>
                <View style={s.menuText}>
                  <Text style={s.menuTitle}>Appearance</Text>
                  <Text style={s.menuSub}>{scheme === 'dark' ? 'Dark mode' : 'Light mode'} (tap to toggle)</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={c.textSecondary} />
              </Pressable>
              <View style={s.menuDivider} />
              <View style={s.menuRow}>
                <View style={[s.menuIcon, { backgroundColor: c.primarySoft }]}>
                  <Ionicons name="notifications-outline" size={20} color={c.primary} />
                </View>
                <View style={s.menuText}>
                  <Text style={s.menuTitle}>Notifications</Text>
                  <Text style={s.menuSub}>{notificationsOn ? 'On' : 'Muted'}</Text>
                </View>
                <Switch value={notificationsOn} onValueChange={setNotificationsOn} trackColor={{ true: c.primary }} />
              </View>
              <View style={s.menuDivider} />
              <Pressable style={s.menuRow} onPress={() => setPrivacyExpanded((v) => !v)}>
                <View style={[s.menuIcon, { backgroundColor: c.primarySoft }]}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={c.primary} />
                </View>
                <View style={s.menuText}>
                  <Text style={s.menuTitle}>Privacy</Text>
                  <Text style={s.menuSub}>
                    {(user?.show_online !== false ? 'Online' : 'Hidden')} · Receipts {(user?.read_receipts !== false ? 'on' : 'off')}
                  </Text>
                </View>
                <Ionicons name={privacyExpanded ? 'chevron-down' : 'chevron-forward'} size={18} color={c.textSecondary} />
              </Pressable>
              {privacyExpanded && (
                <View style={{ paddingHorizontal: 14, paddingBottom: 12, gap: 10 }}>
                  <View style={s.menuRow}>
                    <View style={s.menuText}>
                      <Text style={s.menuTitle}>Online presence</Text>
                      <Text style={s.menuSub}>Show green badge when online</Text>
                    </View>
                    <Switch
                      value={user?.show_online !== false}
                      onValueChange={(v) => handlePrivacyChange({ show_online: v })}
                      trackColor={{ true: c.primary }}
                    />
                  </View>
                  <View style={s.menuRow}>
                    <View style={s.menuText}>
                      <Text style={s.menuTitle}>Read receipts</Text>
                      <Text style={s.menuSub}>Off also stops sending them</Text>
                    </View>
                    <Switch
                      value={user?.read_receipts !== false}
                      onValueChange={(v) => handlePrivacyChange({ read_receipts: v })}
                      trackColor={{ true: c.primary }}
                    />
                  </View>
                </View>
              )}
              <View style={s.menuDivider} />
              <View style={s.menuRow}>
                <View style={[s.menuIcon, { backgroundColor: c.primarySoft }]}>
                  <Ionicons name="chatbubble-outline" size={20} color={c.primary} />
                </View>
                <View style={s.menuText}>
                  <Text style={s.menuTitle}>Chat</Text>
                  <Text style={s.menuSub}>{enterToSend ? 'Enter to send' : 'Manual send'}</Text>
                </View>
                <Switch value={enterToSend} onValueChange={setEnterToSend} trackColor={{ true: c.primary }} />
              </View>
            </View>

            <Text style={s.sectionLabel}>Language</Text>
            <View style={s.menuCard}>
              <View style={s.menuRow}>
                <View style={[s.menuIcon, { backgroundColor: c.primarySoft }]}>
                  <Ionicons name="language-outline" size={20} color={c.primary} />
                </View>
                <View style={s.menuText}>
                  <Text style={s.menuTitle}>Translation language</Text>
                  <Text style={s.menuSub}>Every message is translated to this</Text>
                </View>
              </View>
              <View style={s.chipWrap}>
                {SUPPORTED_LANGUAGES.map((l) => {
                  const selected = myLang === l.code;
                  return (
                    <Pressable
                      key={l.code}
                      style={[s.chip, selected && { backgroundColor: c.primary, borderColor: c.primary }]}
                      onPress={() => handleLangChange(l.code)}
                    >
                      <Text style={[s.chipText, selected && { color: '#fff' }]}>{l.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Text style={s.sectionLabel}>Demo Tools</Text>
            <View style={s.menuCard}>
              <Pressable
                style={s.menuRow}
                onPress={() => {
                  setIsReplayingSkeletons(true);
                  setTab('chats');
                  showToast('⏳ Replaying loading skeleton animations...');
                  load();
                  setTimeout(() => setIsReplayingSkeletons(false), 2000);
                }}
              >
                <View style={[s.menuIcon, { backgroundColor: c.primarySoft }]}>
                  <Ionicons name="refresh-outline" size={20} color={c.primary} />
                </View>
                <View style={s.menuText}>
                  <Text style={s.menuTitle}>Replay loading skeletons</Text>
                  <Text style={s.menuSub}>See the loading states again</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={c.textSecondary} />
              </Pressable>
              <View style={s.menuDivider} />
              <Pressable style={s.menuRow} onPress={() => setSimulatedError(true)}>
                <View style={[s.menuIcon, { backgroundColor: 'rgba(244,63,94,0.12)' }]}>
                  <Ionicons name="alert-circle-outline" size={20} color="#f43f5e" />
                </View>
                <View style={s.menuText}>
                  <Text style={s.menuTitle}>Simulate an error state</Text>
                  <Text style={s.menuSub}>Preview the failure + retry UI</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={c.textSecondary} />
              </Pressable>
              <View style={s.menuDivider} />
              <Pressable style={s.menuRow} onPress={() => setShowResetConfirm(true)}>
                <View style={[s.menuIcon, { backgroundColor: 'rgba(220,38,38,0.1)' }]}>
                  <Ionicons name="trash-outline" size={20} color="#dc2626" />
                </View>
                <View style={s.menuText}>
                  <Text style={[s.menuTitle, { color: '#dc2626' }]}>Reset demo data</Text>
                  <Text style={s.menuSub}>Reload rooms and contacts</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={c.textSecondary} />
              </Pressable>
            </View>

            <Text style={s.sectionLabel}>About</Text>
            <View style={s.menuCard}>
              <View style={s.menuRow}>
                <View style={[s.menuIcon, { backgroundColor: c.backgroundElement }]}>
                  <Ionicons name="information-circle-outline" size={20} color={c.textSecondary} />
                </View>
                <View style={s.menuText}>
                  <Text style={s.menuTitle}>About Halo</Text>
                  <Text style={s.menuSub}>Version 1.0.0</Text>
                </View>
              </View>
            </View>

            <Pressable style={s.logoutBtn} onPress={() => setShowLogout(true)}>
              <Ionicons name="log-out-outline" size={18} color="#dc2626" />
              <Text style={s.logoutText}>Log Out</Text>
            </Pressable>
          </ScrollView>
        )}

        {tab === 'profile' && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>
            {profileSub !== 'main' && (
              <Pressable style={s.backRow} onPress={() => setProfileSub('main')}>
                <Ionicons name="arrow-back" size={18} color={c.textSecondary} />
                <Text style={[s.backText, { color: c.textSecondary }]}>Back</Text>
              </Pressable>
            )}

            {profileSub === 'main' && (
              <>
                <View style={s.menuCard}>
                  <View style={[s.banner, { backgroundColor: c.primarySoft }]} />
                  <View style={s.profileHero}>
                    <Pressable onPress={() => setShowAvatarModal(true)}>
                      <MergedAvatar name={myName} avatarUrl={userAvatar} size="2xl" online={user?.show_online !== false} />
                    </Pressable>
                    <Text style={s.profileName}>{user.username || myName}</Text>
                    <Text style={s.sub}>{user.email}</Text>
                    <Text style={s.bio}>{user.about || 'Hey there! I am using Linguo.'}</Text>
                    <View style={s.statsRow}>
                      <View style={s.statPill}>
                        <Text style={s.statNum}>{rooms.length}</Text>
                        <Text style={s.statLabel}>Chats</Text>
                      </View>
                      <View style={s.statPill}>
                        <Text style={s.statNum}>{contacts.length}</Text>
                        <Text style={s.statLabel}>Contacts</Text>
                      </View>
                      <View style={s.statPill}>
                        <Text style={s.statNum}>{rooms.filter((r) => r.room_type === 'group').length}</Text>
                        <Text style={s.statLabel}>Groups</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={s.menuCard}>
                  <Pressable style={s.menuRow} onPress={openEditProfile}>
                    <View style={[s.menuIcon, { backgroundColor: c.primarySoft }]}>
                      <Ionicons name="person-outline" size={20} color={c.primary} />
                    </View>
                    <View style={s.menuText}>
                      <Text style={s.menuTitle}>Edit profile</Text>
                      <Text style={s.menuSub}>Photo, username, about</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={c.textSecondary} />
                  </Pressable>
                  <View style={s.menuDivider} />
                  <Pressable style={s.menuRow} onPress={() => setProfileSub('security')}>
                    <View style={[s.menuIcon, { backgroundColor: c.backgroundElement }]}>
                      <Ionicons name="lock-closed-outline" size={20} color={c.textSecondary} />
                    </View>
                    <View style={s.menuText}>
                      <Text style={s.menuTitle}>Security</Text>
                      <Text style={s.menuSub}>Password, email, sessions</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={c.textSecondary} />
                  </Pressable>
                  <View style={s.menuDivider} />
                  <Pressable style={s.menuRow} onPress={() => setProfileSub('notifications')}>
                    <View style={[s.menuIcon, { backgroundColor: c.backgroundElement }]}>
                      <Ionicons name="notifications-outline" size={20} color={c.textSecondary} />
                    </View>
                    <View style={s.menuText}>
                      <Text style={s.menuTitle}>Notifications</Text>
                      <Text style={s.menuSub}>Message & group alerts</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={c.textSecondary} />
                  </Pressable>
                  <View style={s.menuDivider} />
                  <Pressable style={s.menuRow} onPress={toggleTheme}>
                    <View style={[s.menuIcon, { backgroundColor: c.backgroundElement }]}>
                      <Ionicons name="contrast-outline" size={20} color={c.textSecondary} />
                    </View>
                    <View style={s.menuText}>
                      <Text style={s.menuTitle}>Appearance</Text>
                      <Text style={s.menuSub}>{scheme === 'dark' ? 'Dark mode' : 'Light mode'} (tap to toggle)</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={c.textSecondary} />
                  </Pressable>
                  <View style={s.menuDivider} />
                  <Pressable style={s.menuRow} onPress={() => setProfileSub('privacy')}>
                    <View style={[s.menuIcon, { backgroundColor: c.backgroundElement }]}>
                      <Ionicons name="shield-checkmark-outline" size={20} color={c.textSecondary} />
                    </View>
                    <View style={s.menuText}>
                      <Text style={s.menuTitle}>Privacy</Text>
                      <Text style={s.menuSub}>Last seen, online status, requests</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={c.textSecondary} />
                  </Pressable>
                </View>

                <Pressable style={s.logoutBtn} onPress={() => setShowLogout(true)}>
                  <Ionicons name="log-out-outline" size={18} color="#dc2626" />
                  <Text style={s.logoutText}>Log Out</Text>
                </Pressable>
              </>
            )}

            {profileSub === 'edit' && (
              <View style={{ gap: 12 }}>
                <View style={s.menuCard}>
                  <View style={s.menuRow}>
                    <MergedAvatar name={myName} avatarUrl={userAvatar} size="lg" online />
                    <View style={s.menuText}>
                      <Text style={s.menuTitle}>Profile Photo</Text>
                      <Text style={s.menuSub}>Visible to all contacts</Text>
                    </View>
                    <Pressable style={s.miniPrimary} onPress={() => setShowAvatarModal(true)} disabled={savingProfile}>
                      <Text style={s.miniPrimaryText}>{savingProfile ? '…' : 'Change'}</Text>
                    </Pressable>
                  </View>
                </View>
                <Text style={s.fieldLabel}>Display Name / Username</Text>
                <TextInput style={s.input} value={editUsername} onChangeText={setEditUsername} placeholder="Username" placeholderTextColor={c.textSecondary} />
                <Text style={s.fieldLabel}>About / Bio</Text>
                <TextInput
                  style={[s.input, { minHeight: 70, textAlignVertical: 'top' }]}
                  value={editAbout}
                  onChangeText={setEditAbout}
                  placeholder="About you"
                  placeholderTextColor={c.textSecondary}
                  multiline
                />
                <Text style={s.fieldLabel}>Phone Number</Text>
                <TextInput
                  style={s.input}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="+1 (555) 234-5678"
                  placeholderTextColor={c.textSecondary}
                  keyboardType="phone-pad"
                />
                <Text style={s.fieldLabel}>Account Email</Text>
                <TextInput style={[s.input, { opacity: 0.6 }]} value={user.email} editable={false} />
                {!!saveTick && <Text style={s.sub}>{saveTick}</Text>}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable style={[s.miniGhost, { flex: 1, alignItems: 'center' }]} onPress={() => setProfileSub('main')}>
                    <Text style={[s.miniGhostText, { color: c.text }]}>Cancel</Text>
                  </Pressable>
                  <Pressable style={[s.miniPrimary, { flex: 1, alignItems: 'center' }]} onPress={handleSaveProfile} disabled={savingProfile}>
                    <Text style={s.miniPrimaryText}>{savingProfile ? 'Saving…' : 'Save Changes'}</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {profileSub === 'security' && (
              <View style={{ gap: 12 }}>
                <View style={s.infoCard}>
                  <Text style={s.menuTitle}>Active Account</Text>
                  <Text style={s.menuSub}>Logged in as {user.email}</Text>
                  <Text style={[s.menuSub, { color: '#10b981', fontWeight: '700', marginTop: 6 }]}>
                    ● Session Verified & Encrypted
                  </Text>
                </View>
                <View style={s.infoCard}>
                  <Text style={s.menuTitle}>Password & Authentication</Text>
                  <Text style={s.menuSub}>Password was set during registration. Tokens expire periodically and auto-refresh.</Text>
                </View>
              </View>
            )}

            {profileSub === 'notifications' && (
              <View style={s.infoCard}>
                <View style={s.menuRow}>
                  <View style={s.menuText}>
                    <Text style={s.menuTitle}>Message Alerts</Text>
                    <Text style={s.menuSub}>Sound and preview when receiving messages</Text>
                  </View>
                  <Switch value={notificationsOn} onValueChange={setNotificationsOn} trackColor={{ true: c.primary }} />
                </View>
              </View>
            )}

            {profileSub === 'privacy' && (
              <View style={{ gap: 12 }}>
                <View style={s.infoCard}>
                  <View style={s.menuRow}>
                    <View style={s.menuText}>
                      <Text style={s.menuTitle}>Online Presence</Text>
                      <Text style={s.menuSub}>Display badge when online</Text>
                    </View>
                    <Switch
                      value={user?.show_online !== false}
                      onValueChange={(v) => handlePrivacyChange({ show_online: v })}
                      trackColor={{ true: c.primary }}
                    />
                  </View>
                </View>
                <View style={s.infoCard}>
                  <View style={s.menuRow}>
                    <View style={s.menuText}>
                      <Text style={s.menuTitle}>Read Receipts</Text>
                      <Text style={s.menuSub}>Off also stops sending them</Text>
                    </View>
                    <Switch
                      value={user?.read_receipts !== false}
                      onValueChange={(v) => handlePrivacyChange({ read_receipts: v })}
                      trackColor={{ true: c.primary }}
                    />
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      <SafeAreaView style={s.tabbar} edges={['bottom']}>
        <View style={s.tabbarRow}>
          {tabs.map((t) => {
            const active = tab === t.key;
            return (
              <Pressable
                key={t.key}
                style={s.tabBtn}
                onPress={() => {
                  setProfileSub('main');
                  setError('');
                  setTab(t.key);
                }}
              >
                <Ionicons name={active ? (t.icon.replace('-outline', '') as any) : t.icon} size={22} color={active ? c.primary : c.textSecondary} />
                <Text style={[s.tabLabel, { color: active ? c.primary : c.textSecondary }]}>{t.label}</Text>
                {t.key === 'contacts' && requests.length > 0 && <View style={s.tabDot} />}
              </Pressable>
            );
          })}
          <Pressable style={s.tabBtn} onPress={() => setTab('profile')}>
            <MergedAvatar name={myName} avatarUrl={userAvatar} size="xs" online={user?.show_online !== false} />
            <Text style={[s.tabLabel, { color: tab === 'profile' ? c.primary : c.textSecondary }]}>Profile</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <AddContactModal visible={showAddContact} onClose={() => setShowAddContact(false)} token={token} onAddContact={handleAddFriend} />
      <CreateGroupModal visible={showCreateGroup} onClose={() => setShowCreateGroup(false)} onCreate={handleCreateGroup} />
      <EditAvatarModal
        visible={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        currentAvatarUrl={user.avatar_url}
        name={myName}
        onSaveAvatar={handleSaveAvatarDirect}
      />
      <UserDetailPopup token={token} userId={selectedUserId} onClose={() => setSelectedUserId(null)} onChat={(uid) => handleOpenDirectChat(uid)} />
      <SearchOverlay
        visible={showSearch}
        onClose={() => setShowSearch(false)}
        items={searchItems}
        onSelect={(item) => {
          if (item.type === 'room') router.push(`/chat/${item.id}` as any);
          else handleOpenDirectChat(item.id);
        }}
      />
      <LogoutConfirmModal
        visible={showLogout}
        onClose={() => setShowLogout(false)}
        onConfirm={() => {
          setShowLogout(false);
          logout();
        }}
      />
      <Modal visible={showResetConfirm} transparent animationType="fade" onRequestClose={() => setShowResetConfirm(false)}>
        <View style={stylesModal.backdrop}>
          <View style={[stylesModal.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[stylesModal.title, { color: c.text }]}>Reset demo data?</Text>
            <Text style={[stylesModal.sub, { color: c.textSecondary }]}>This will reload fresh rooms and contacts from the server.</Text>
            <View style={stylesModal.row}>
              <Pressable style={[stylesModal.btn, { borderColor: c.border, borderWidth: 1 }]} onPress={() => setShowResetConfirm(false)}>
                <Text style={[stylesModal.btnText, { color: c.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[stylesModal.btn, { backgroundColor: '#dc2626' }]}
                onPress={() => {
                  setShowResetConfirm(false);
                  load();
                  setDemoMsg('✨ Data reloaded from server.');
                  showToast('✨ Demo data restored');
                }}
              >
                <Text style={[stylesModal.btnText, { color: '#fff' }]}>Reset</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Toast message={toastMsg} onHide={() => setToastMsg(null)} />
    </SafeAreaView>
  );
}

const stylesModal = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 340, borderWidth: 1, borderRadius: 20, padding: 20, gap: 8 },
  title: { fontSize: 16, fontWeight: '800' },
  sub: { fontSize: 12, lineHeight: 17 },
  row: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  btnText: { fontWeight: '800', fontSize: 13 },
});

function makeStyles(c: C) {
  return StyleSheet.create({
    shell: { flex: 1, backgroundColor: c.background },
    body: { flex: 1, paddingHorizontal: 16, paddingTop: 8, gap: 10 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    authWrap: { flex: 1, padding: 24, gap: 10, backgroundColor: c.background, justifyContent: 'center' },
    brand: { fontSize: 34, fontWeight: '800', color: c.text, textAlign: 'center' },
    themeFab: { position: 'absolute', top: 54, right: 20, width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: c.border, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
    quoteCard: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 6, marginVertical: 4 },
    quote: { fontSize: 13, fontStyle: 'italic', lineHeight: 19 },
    quoteBy: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    passRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    eye: { padding: 10 },
    errorBanner: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 10, padding: 10 },
    errorText: { color: '#ef4444', fontSize: 13 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: c.text },
    headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    iconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: c.backgroundElement, alignItems: 'center', justifyContent: 'center' },
    iconBtnPrimary: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
    searchPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.backgroundElement, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9 },
    searchInput: { flex: 1, fontSize: 13, color: c.text, padding: 0 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, borderRadius: 16, marginBottom: 8 },
    rowText: { flex: 1, minWidth: 0 },
    rowTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    rowTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    rowSub: { fontSize: 12, color: c.textSecondary, marginTop: 1 },
    groupBadge: { backgroundColor: c.primarySoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    groupBadgeText: { fontSize: 9, fontWeight: '800', color: c.primary },
    omniBadge: { backgroundColor: c.primarySoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    omniText: { fontSize: 9, fontWeight: '800', color: c.primary },
    unread: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
    unreadText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    langBadge: { backgroundColor: c.primarySoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
    langBadgeText: { fontSize: 10, fontWeight: '800', color: c.primary, textTransform: 'uppercase' },
    empty: { textAlign: 'center', marginTop: 32, color: c.textSecondary },
    emptyWrap: { alignItems: 'center', paddingVertical: 40, gap: 6 },
    emptyEmoji: { fontSize: 36 },
    emptyTitle: { fontSize: 14, fontWeight: '700' },
    emptyLink: { fontSize: 12, fontWeight: '800', marginTop: 4 },
    error: { color: '#dc2626', fontSize: 12 },
    sub: { fontSize: 12, color: c.textSecondary },
    sectionLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', color: c.textSecondary, marginTop: 8 },
    subTabs: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.backgroundElement, borderRadius: 12, padding: 4 },
    subTab: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 6 },
    subTabText: { fontSize: 12, fontWeight: '800' },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
    tabDot: { position: 'absolute', top: 2, right: 14, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
    reqRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
    miniPrimary: { backgroundColor: c.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
    miniPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 12 },
    miniGhost: { borderWidth: 1, borderColor: c.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
    miniGhostText: { fontWeight: '700', fontSize: 12 },
    skelRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 12 },
    skelAvatar: { width: 40, height: 40, borderRadius: 20 },
    skelLine: { height: 12, borderRadius: 6 },
    skelLineThin: { height: 9, borderRadius: 5 },
    profileName: { fontSize: 20, fontWeight: '800', color: c.text },
    demoMsg: { fontSize: 12, color: c.primary, fontWeight: '600' },
    errorCard: { backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 14, padding: 12, gap: 4 },
    errorTitle: { fontSize: 12, fontWeight: '800', color: '#ef4444', textTransform: 'uppercase' },
    errorSub: { fontSize: 12, color: c.textSecondary },
    retryBtn: { backgroundColor: '#ef4444', borderRadius: 10, padding: 10, alignItems: 'center', marginTop: 6 },
    retryText: { color: '#fff', fontWeight: '800', fontSize: 12 },
    menuCard: { backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 16, overflow: 'hidden' },
    menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
    menuDivider: { height: 1, backgroundColor: c.border, marginLeft: 66 },
    menuIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    menuText: { flex: 1, minWidth: 0 },
    menuTitle: { fontSize: 14, fontWeight: '700', color: c.text },
    menuSub: { fontSize: 12, color: c.textSecondary, marginTop: 1 },
    infoCard: { backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 14 },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14, paddingTop: 4 },
    chip: { borderWidth: 1, borderColor: c.border, backgroundColor: c.backgroundElement, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
    chipText: { fontSize: 12, fontWeight: '700', color: c.text },
    banner: { height: 72 },
    profileHero: { alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingBottom: 16, marginTop: -38 },
    bio: { fontSize: 12, color: c.text, opacity: 0.9, textAlign: 'center' },
    statsRow: { flexDirection: 'row', gap: 10, marginTop: 10, width: '100%' },
    statPill: { flex: 1, backgroundColor: c.backgroundElement, borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingVertical: 10, alignItems: 'center' },
    statNum: { fontSize: 16, fontWeight: '800', color: c.text },
    statLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: c.textSecondary },
    backRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    backText: { fontSize: 13, fontWeight: '600' },
    fieldLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', color: c.textSecondary },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(220,38,38,0.3)', backgroundColor: 'rgba(220,38,38,0.06)', borderRadius: 14, padding: 14 },
    logoutText: { color: '#dc2626', fontWeight: '800', fontSize: 14 },
    primary: { backgroundColor: c.primary, borderRadius: 10, padding: 12, alignItems: 'center' },
    primaryText: { color: '#fff', fontWeight: '800' },
    link: { color: c.primary, textAlign: 'center', marginTop: 6 },
    orRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
    orLine: { flex: 1, height: 1, backgroundColor: c.border },
    googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: c.border, backgroundColor: c.card, borderRadius: 10, padding: 12 },
    googleBtnText: { color: c.text, fontWeight: '700', fontSize: 15 },
    input: { borderWidth: 1, borderColor: c.border, backgroundColor: c.card, color: c.text, borderRadius: 10, padding: 10, fontSize: 15 },
    joinRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    tabbar: { backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.border },
    tabbarRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },
    tabBtn: { alignItems: 'center', gap: 3, minWidth: 56 },
    tabLabel: { fontSize: 10, fontWeight: '600' },
  });
}

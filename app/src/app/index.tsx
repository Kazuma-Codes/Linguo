import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { useAuthStore } from '@/store/useAuthStore';
import { Colors } from '@/constants/theme';
import {
  acceptContactRequest,
  addContact,
  createRoom,
  declineContactRequest,
  getMe,
  getOrCreateDirectRoom,
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
import { API_BASE_URL } from '@/lib/config';

type Tab = 'chats' | 'contacts' | 'groups' | 'settings' | 'profile';
type C = (typeof Colors)[keyof typeof Colors];

const AVATAR_COLORS = ['#3b82f6', '#ec4899', '#6C5CE7', '#10b981', '#f59e0b', '#ef4444'];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function RoomAvatar({ title, emoji, size = 44 }: { title: string; emoji?: string; size?: number }) {
  const bg = avatarColor(title);
  return (
    <View style={[styles.avatar, { backgroundColor: bg, width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.42 }]}>{emoji || title.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

export default function Home() {
  const { token, user, setAuth, setLang, updateUser, logout, hasHydrated } = useAuthStore();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const c = Colors[scheme];
  const s = makeStyles(c);

  const [tab, setTab] = useState<Tab>('chats');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rooms, setRooms] = useState<any[]>([]);
  const [discover, setDiscover] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [roomTitle, setRoomTitle] = useState('');
  const [search, setSearch] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [contactResults, setContactResults] = useState<any[]>([]);
  const [contactSearching, setContactSearching] = useState(false);

  // Settings tab state (mirrors web SettingsTab)
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [enterToSend, setEnterToSend] = useState(true);
  const [demoMsg, setDemoMsg] = useState('');

  // Profile tab state (mirrors web ProfileModal)
  const [profileSub, setProfileSub] = useState<'main' | 'edit' | 'security' | 'notifications' | 'privacy'>('main');
  const [editUsername, setEditUsername] = useState('');
  const [editAbout, setEditAbout] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveTick, setSaveTick] = useState('');
  const [onlinePublic, setOnlinePublic] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);

  const myLang = user?.preferred_language || 'en';
  const myName = user?.username || user?.email?.split('@')[0] || 'T';

  async function load() {
    if (!token) return;
    try {
      const [r, d, ct, rq] = await Promise.all([
        listRooms(token).catch(() => []),
        listDiscoverableRooms(token).catch(() => []),
        listContacts(token),
        listContactRequests(token),
      ]);
      setRooms(Array.isArray(r) ? r : []);
      setDiscover(Array.isArray(d) ? d : []);
      setContacts(Array.isArray(ct) ? ct : []);
      setRequests(Array.isArray(rq) ? rq : []);
    } catch {}
  }

  useEffect(() => {
    if (token) load();
  }, [token]);

  // Refresh friends every time the Contacts tab opens (added on web/another
  // device show up immediately instead of staying stale from login time).
  useEffect(() => {
    if (token && tab === 'contacts') load();
  }, [tab]);

  async function handleAuth() {
    setError('');
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
          preferred_language: me.preferred_language || me.preferredLanguage || 'en',
        });
      } else {
        await register(email.trim(), password, 'en');
        const t = await login(email.trim(), password);
        const access = t.access_token || t.accessToken;
        const me = await getMe(access);
        await setAuth(access, { id: me.id, email: me.email, username: me.username, preferred_language: 'en' });
      }
    } catch (e: any) {
      setError(e.message || 'Auth failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateRoom() {
    if (!token || !roomTitle.trim()) return;
    try {
      const room = await createRoom(token, roomTitle.trim(), myLang);
      setRoomTitle('');
      await load();
      router.push(`/chat/${room.id}` as any);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleJoin(id: string) {
    if (!token) return;
    try {
      await joinRoom(token, id);
      await load();
      router.push(`/chat/${id}` as any);
    } catch (e: any) {
      setError(e.message);
    }
  }

  /** Join by pasted invite link or raw room code. */
  async function handleJoinByCode() {
    if (!token || !inviteCode.trim()) return;
    const m = inviteCode.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
    if (!m) {
      setError('That doesn’t look like an invite link or room code');
      return;
    }
    const id = m[0];
    try {
      await joinRoom(token, id);
      await load();
      setInviteCode('');
      router.push(`/chat/${id}` as any);
    } catch (e: any) {
      if (/already|conflict/i.test(e.message || '')) {
        setInviteCode('');
        router.push(`/chat/${id}` as any);
      } else {
        setError(e.message);
      }
    }
  }

  async function handleLangChange(code: string) {
    if (!token) return;
    try {
      await updatePreferredLanguage(token, code);
      setLang(code);
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
    } catch (e: any) {
      setError(e.message);
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
      router.push(`/chat/${room.id}` as any);
    } catch (e: any) {
      setError(e.message);
    }
  }

  function openEditProfile() {
    setEditUsername(user?.username || user?.email?.split('@')[0] || '');
    setEditAbout(user?.about || '');
    setEditPhone(user?.phone || '');
    setSaveTick('');
    setProfileSub('edit');
  }
async function handleChangePhoto() {
  if (!token) return;
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    setSaveTick('Photo permission denied — allow it in system settings.');
    return;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,   // square crop, same on every device
    aspect: [1, 1],
    quality: 0.5,          // keeps the base64 small (~100–200KB)
    base64: true,
  });
  if (result.canceled || !result.assets?.[0]?.base64) return;
  const asset = result.assets[0];
  const mime = asset.mimeType || 'image/jpeg';
  const dataUrl = `data:${mime};base64,${asset.base64}`;
  setSavingProfile(true);
  try {
    const updated = await updateProfile(token, { avatar_url: dataUrl });
    updateUser({ avatar_url: updated.avatar_url ?? dataUrl });
    setSaveTick('Photo updated ✓');
  } catch (e: any) {
    setSaveTick(e.message || 'Photo upload failed');
  } finally {
    setSavingProfile(false);
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
      setTimeout(() => setProfileSub('main'), 900);
    } catch (e: any) {
      setSaveTick(e.message || 'Save failed');
    } finally {
      setSavingProfile(false);
    }
  }

  if (!hasHydrated) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.primary} />
      </SafeAreaView>
    );
  }

  if (!token || !user) {
    return (
      <SafeAreaView style={s.authWrap}>
        <Text style={s.brand}>
          halo<Text style={{ color: c.primary }}>.</Text>
        </Text>
        <Text style={s.sub}>Omni-language chat</Text>
        <TextInput
          style={s.input}
          placeholder="Email"
          placeholderTextColor={c.textSecondary}
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={s.input}
          placeholder="Password"
          placeholderTextColor={c.textSecondary}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {!!error && <Text style={s.error}>{error}</Text>}
        <Pressable style={s.primary} onPress={handleAuth} disabled={loading}>
          <Text style={s.primaryText}>{loading ? 'Please wait…' : isLogin ? 'Log in' : 'Sign up'}</Text>
        </Pressable>
        <Pressable onPress={() => setIsLogin((v) => !v)}>
          <Text style={s.link}>{isLogin ? 'Need an account? Sign up' : 'Have an account? Log in'}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const filteredRooms = rooms.filter((r) => (r.title || '').toLowerCase().includes(search.toLowerCase()));

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
                <Pressable style={s.iconBtn} onPress={handleCreateRoom} accessibilityLabel="New group">
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
            <FlatList
              data={filteredRooms}
              keyExtractor={(r) => r.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable style={s.row} onPress={() => router.push(`/chat/${item.id}` as any)}>
                  <RoomAvatar title={item.title || '?'} emoji={item.emoji} />
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
                      {item.last_message || 'No messages yet'}
                    </Text>
                  </View>
                </Pressable>
              )}
              ListEmptyComponent={<Text style={s.empty}>No conversations yet</Text>}
            />
          </>
        )}

        {tab === 'contacts' && (
          <>
            <Text style={s.headerTitle}>Contacts</Text>
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
                      <RoomAvatar title={u.username || u.email || '?'} />
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
            {requests.length > 0 && (
              <>
                <Text style={s.sectionLabel}>Requests</Text>
                {requests.map((rq: any) => (
                  <View key={rq.id} style={s.row}>
                    <RoomAvatar title={rq.from_username || rq.from_email || '?'} />
                    <View style={s.rowText}>
                      <Text style={s.rowTitle}>{rq.from_username || rq.from_email}</Text>
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
                ))}
              </>
            )}
            <Text style={s.sectionLabel}>My friends ({contacts.length})</Text>
            <FlatList
              data={contacts}
              keyExtractor={(ct: any) => String(ct.user_id || ct.id)}
              renderItem={({ item }: any) => (
                <Pressable
                  style={s.row}
                  onPress={() => handleOpenDirectChat(String(item.user_id || item.id), item.direct_room_id)}
                >
                  <RoomAvatar title={item.username || item.email || '?'} />
                  <View style={s.rowText}>
                    <Text style={s.rowTitle}>{item.username || item.email?.split('@')[0]}</Text>
                    <Text style={s.rowSub} numberOfLines={1}>
                      {item.about || item.email}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={c.textSecondary} />
                </Pressable>
              )}
              ListEmptyComponent={<Text style={s.empty}>No friends yet — search above to add people.</Text>}
            />
          </>
        )}

        {tab === 'groups' && (
          <>
            <Text style={s.headerTitle}>Groups</Text>
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
            <FlatList
              data={discover}
              keyExtractor={(r) => r.id}
              renderItem={({ item }) => (
                <View style={s.row}>
                  <RoomAvatar title={item.title || '?'} emoji={item.emoji} />
                  <View style={s.rowText}>
                    <Text style={s.rowTitle}>{item.title}</Text>
                    <Text style={s.rowSub} numberOfLines={1}>
                      {item.description || 'Public group'}
                    </Text>
                  </View>
                  <Pressable style={s.miniPrimary} onPress={() => handleJoin(item.id)}>
                    <Text style={s.miniPrimaryText}>Join</Text>
                  </Pressable>
                </View>
              )}
              ListEmptyComponent={<Text style={s.empty}>No public groups found</Text>}
            />
          </>
        )}

        {tab === 'settings' && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 16 }}>
            <Text style={s.headerTitle}>Settings</Text>
            {!!demoMsg && <Text style={s.demoMsg}>{demoMsg}</Text>}

            <Text style={s.sectionLabel}>Preferences</Text>
            <View style={s.menuCard}>
              <View style={s.menuRow}>
                <View style={[s.menuIcon, { backgroundColor: c.primarySoft }]}>
                  <Ionicons name="contrast-outline" size={20} color={c.primary} />
                </View>
                <View style={s.menuText}>
                  <Text style={s.menuTitle}>Appearance</Text>
                  <Text style={s.menuSub}>{scheme === 'dark' ? 'Dark mode (system)' : 'Light mode (system)'}</Text>
                </View>
              </View>
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
              <View style={s.menuRow}>
                <View style={[s.menuIcon, { backgroundColor: c.primarySoft }]}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={c.primary} />
                </View>
                <View style={s.menuText}>
                  <Text style={s.menuTitle}>Privacy</Text>
                  <Text style={s.menuSub}>Last seen, online status</Text>
                </View>
              </View>
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
                  setDemoMsg('⏳ Loading states preview — pull to refresh chats to replay.');
                  setTab('chats');
                  load();
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
              <Pressable style={s.menuRow} onPress={() => setDemoMsg('⚠️ Simulated error — this is a preview of the failure + retry UI. Chats reload fixes it.')}>
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
              <Pressable
                style={s.menuRow}
                onPress={() => {
                  load();
                  setDemoMsg('✨ Data reloaded from server.');
                }}
              >
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

            <Pressable style={s.logoutBtn} onPress={logout}>
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
                    <View style={[styles.avatar, { backgroundColor: c.primary, width: 76, height: 76, borderRadius: 38 }]}>
                      <Text style={[styles.avatarText, { fontSize: 30 }]}>{myName.charAt(0).toUpperCase()}</Text>
                    </View>
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
                  <View style={s.menuRow}>
                    <View style={[s.menuIcon, { backgroundColor: c.backgroundElement }]}>
                      <Ionicons name="contrast-outline" size={20} color={c.textSecondary} />
                    </View>
                    <View style={s.menuText}>
                      <Text style={s.menuTitle}>Appearance</Text>
                      <Text style={s.menuSub}>{scheme === 'dark' ? 'Dark mode (system)' : 'Light mode (system)'}</Text>
                    </View>
                  </View>
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

                <Pressable style={s.logoutBtn} onPress={logout}>
                  <Ionicons name="log-out-outline" size={18} color="#dc2626" />
                  <Text style={s.logoutText}>Log Out</Text>
                </Pressable>
              </>
            )}

            {profileSub === 'edit' && (
              
              <View style={{ gap: 12 }}>
                <View style={s.menuCard}>
                  <View style={s.menuRow}>
                    {user.avatar_url ? (
                      <Image source={{ uri: user.avatar_url }} style={{ width: 56, height: 56, borderRadius: 28 }} />
                    ) : (
                      <View style={[styles.avatar, { backgroundColor: c.primary, width: 56, height: 56, borderRadius: 28 }]}>
                        <Text style={[styles.avatarText, { fontSize: 22 }]}>{myName.charAt(0).toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={s.menuText}>
                      <Text style={s.menuTitle}>Profile Photo</Text>
                      <Text style={s.menuSub}>Visible to all contacts</Text>
                    </View>
                    <Pressable style={s.miniPrimary} onPress={handleChangePhoto} disabled={savingProfile}>
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
                    <Switch value={onlinePublic} onValueChange={setOnlinePublic} trackColor={{ true: c.primary }} />
                  </View>
                </View>
                <View style={s.infoCard}>
                  <View style={s.menuRow}>
                    <View style={s.menuText}>
                      <Text style={s.menuTitle}>Read Receipts</Text>
                      <Text style={s.menuSub}>Show checks on delivery</Text>
                    </View>
                    <Switch value={readReceipts} onValueChange={setReadReceipts} trackColor={{ true: c.primary }} />
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
                  setTab(t.key);
                }}
              >
                <Ionicons name={active ? (t.icon.replace('-outline', '') as any) : t.icon} size={22} color={active ? c.primary : c.textSecondary} />
                <Text style={[s.tabLabel, { color: active ? c.primary : c.textSecondary }]}>{t.label}</Text>
              </Pressable>
            );
          })}
          <Pressable style={s.tabBtn} onPress={() => setTab('profile')}>
            <View style={[styles.avatar, { backgroundColor: tab === 'profile' ? c.primary : '#8b5cf6', width: 24, height: 24, borderRadius: 12 }]}>
              <Text style={[styles.avatarText, { fontSize: 12 }]}>{myName.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={[s.tabLabel, { color: tab === 'profile' ? c.primary : c.textSecondary }]}>Profile</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

function makeStyles(c: C) {
  return StyleSheet.create({
    shell: { flex: 1, backgroundColor: c.background },
    body: { flex: 1, paddingHorizontal: 16, paddingTop: 8, gap: 10 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    authWrap: { flex: 1, padding: 24, gap: 10, backgroundColor: c.background, justifyContent: 'center' },
    brand: { fontSize: 34, fontWeight: '800', color: c.text, textAlign: 'center' },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: c.text },
    headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    iconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: c.backgroundElement, alignItems: 'center', justifyContent: 'center' },
    iconBtnPrimary: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
    searchPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.backgroundElement, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9 },
    searchInput: { flex: 1, fontSize: 13, color: c.text, padding: 0 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
    rowText: { flex: 1, minWidth: 0 },
    rowTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    rowTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    rowSub: { fontSize: 12, color: c.textSecondary, marginTop: 1 },
    groupBadge: { backgroundColor: c.primarySoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    groupBadgeText: { fontSize: 9, fontWeight: '800', color: c.primary },
    empty: { textAlign: 'center', marginTop: 32, color: c.textSecondary },
    error: { color: '#dc2626', fontSize: 12 },
    sub: { fontSize: 12, color: c.textSecondary },
    sectionLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', color: c.textSecondary, marginTop: 8 },
    reqRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
    miniPrimary: { backgroundColor: c.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
    miniPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 12 },
    miniGhost: { borderWidth: 1, borderColor: c.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
    miniGhostText: { fontWeight: '700', fontSize: 12 },
    langRow: { borderWidth: 1, borderColor: c.border, backgroundColor: c.card, borderRadius: 12, padding: 12, marginVertical: 4 },
    profileName: { fontSize: 20, fontWeight: '800', color: c.text },
    danger: { backgroundColor: '#dc2626', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 16, minWidth: 200 },
    demoMsg: { fontSize: 12, color: c.primary, fontWeight: '600' },
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
    input: { borderWidth: 1, borderColor: c.border, backgroundColor: c.card, color: c.text, borderRadius: 10, padding: 10, fontSize: 15 },
    joinRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    tabbar: { backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.border },
    tabbarRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },
    tabBtn: { alignItems: 'center', gap: 3, minWidth: 56 },
    tabLabel: { fontSize: 10, fontWeight: '600' },
  });
}

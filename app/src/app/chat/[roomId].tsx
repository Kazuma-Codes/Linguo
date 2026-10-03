import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore } from '@/store/useThemeStore';
import { useChatStore } from '@/store/useChatStore';
import { Colors } from '@/constants/theme';
import { getOrCreateDirectRoom, getRoom, getRoomMessages, updateRoom } from '@/lib/api';
import { LANGUAGE_MAP } from '@/lib/languages';
import { MessageBubble } from '@/components/MessageBubble';
import { DraftPreview } from '@/components/DraftPreview';
import { Composer } from '@/components/Composer';
import { MergedAvatar } from '@/components/MergedAvatar';
import { Toast } from '@/components/Toast';
import { RoomInfoDrawer, MemberInfo } from '@/components/RoomInfoDrawer';
import { UserDetailPopup } from '@/components/UserDetailPopup';

export default function ChatRoom() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { token, user } = useAuthStore();
  const {
    messages,
    drafts,
    isConnected,
    replyTo,
    typingUsers,
    typingUser,
    setInitialMessages,
    setReplyTo,
    connect,
    disconnect,
    sendDraft,
    confirmDraft,
    updateDraftTranslation,
    sendTyping,
    sendReadAck,
    deleteMessage,
    removeDraft,
  } = useChatStore();
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const resolved = useThemeStore((s) => s.resolved);
  const systemScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const scheme = resolved || systemScheme;
  const C = Colors[scheme];
  const styles = makeStyles(C);

  const [title, setTitle] = useState('Chat');
  const [detail, setDetail] = useState<any | null>(null);
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [distinctLangs, setDistinctLangs] = useState<string[]>([]);
  const [isDirect, setIsDirect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [jumpHighlight, setJumpHighlight] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  const myLang = user?.preferred_language || 'en';
  const currentLangName = LANGUAGE_MAP[myLang] || myLang.toUpperCase();
  const showToast = (m: string) => setToastMsg(m);

  useEffect(() => {
    if (!token || !user || !roomId) return;
    setLoading(true);
    Promise.all([
      getRoom(token, roomId as string).catch(() => null),
      getRoomMessages(token, roomId as string).catch(() => []),
    ]).then(([roomDetail, history]) => {
      if (roomDetail?.title) setTitle(roomDetail.title);
      if (roomDetail) {
        setDetail(roomDetail);
        if (roomDetail.room_type === 'direct') setIsDirect(true);
        if (roomDetail.members) setMembers(roomDetail.members);
        if (roomDetail.distinct_langs) setDistinctLangs(roomDetail.distinct_langs);
      }
      setInitialMessages(history, user.email);
      setLoading(false);
    });
    connect(roomId as string, token, user.email);
    return () => disconnect();
  }, [roomId, token]);

  useEffect(() => {
    if (!isConnected) return;
    messages
      .filter((m) => !m.is_me && m.status === 'final' && m.delivery_status !== 'read')
      .forEach((m) => sendReadAck(m.id));
  }, [messages.length, isConnected]);

  useEffect(() => {
    if (messages.length > 0 || drafts.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length, drafts.length]);

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleJumpToReply(replyId: string) {
    const idx = messages.findIndex((m) => m.id === replyId);
    if (idx >= 0) {
      try {
        listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.3 });
      } catch {
        listRef.current?.scrollToEnd({ animated: true });
      }
      setJumpHighlight(replyId);
      setTimeout(() => setJumpHighlight(null), 1600);
    }
  }

  async function handleShareLink() {
    if (!roomId) return;
    const inviteUrl = `mosaic://chat/${roomId}`;
    try {
      await Share.share({ message: `Join my Linguo room: ${inviteUrl} (code: ${roomId})` });
    } catch {
      try {
        await Clipboard.setStringAsync(inviteUrl);
        showToast('🔗 Invite link copied to clipboard');
      } catch {
        showToast(`🔗 ${roomId}`);
      }
    }
  }

  async function handleCopyCode() {
    if (!roomId) return;
    try {
      await Clipboard.setStringAsync(roomId as string);
      showToast('📋 Room code copied');
    } catch {
      showToast(`📋 ${roomId}`);
    }
  }

  async function handleSaveGroupSettings(data: { title: string; description: string; avatarUrl: string }) {
    if (!token || !roomId) return;
    const updated = await updateRoom(token, roomId as string, data);
    setDetail(updated);
    if (updated.title) setTitle(updated.title);
    if (updated.avatar_url) setDetail((d: any) => ({ ...d, avatar_url: updated.avatar_url }));
    showToast('⚙️ Group settings saved');
  }

  async function handleOpenDirectChat(targetUserId: string) {
    if (!token) return;
    try {
      const room = await getOrCreateDirectRoom(token, targetUserId);
      setSelectedUserId(null);
      router.push(`/chat/${room.id}` as any);
    } catch {
      showToast('Failed to open direct chat');
    }
  }

  function handleAvatarTap() {
    if (detail?.room_type === 'direct') {
      const other = members.find((m) => m.email !== user?.email);
      if (other?.user_id) setSelectedUserId(other.user_id);
    } else {
      setShowDrawer(true);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={C.primary} />
        <Text style={{ color: C.textSecondary, marginTop: 8 }}>Connecting…</Text>
      </SafeAreaView>
    );
  }

  const typingList = Object.values(typingUsers);
  const typingLabel =
    typingList.length > 0
      ? `${typingList[0].username || typingList[0].email.split('@')[0]} is typing...`
      : typingUser
        ? `${typingUser} is typing…`
        : null;

  const allItems = [...messages];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={20} color={C.textSecondary} />
        </Pressable>
        <Pressable onPress={handleAvatarTap} style={{ flexShrink: 0 }}>
          <MergedAvatar name={title} avatarUrl={detail?.avatar_url} size="md" />
        </Pressable>
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <View style={[styles.dot, { backgroundColor: isConnected ? '#10b981' : '#ef4444' }]} />
          </View>
          <Text style={styles.subtitle} numberOfLines={1}>
            {typingLabel ? (
              <Text style={{ color: C.primary, fontWeight: '700' }}>{typingLabel}</Text>
            ) : isDirect ? (
              'Direct message'
            ) : (
              `${members.length} participant${members.length === 1 ? '' : 's'}`
            )}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.langBadge} onPress={() => router.push('/' as any)} accessibilityLabel="Default language">
            <Text style={styles.langBadgeText}>{currentLangName}</Text>
          </Pressable>
          {!isDirect && (
            <Pressable onPress={handleShareLink} style={styles.iconBtn} accessibilityLabel="Share invite">
              <Ionicons name="share-outline" size={18} color={C.textSecondary} />
            </Pressable>
          )}
          <Pressable onPress={() => setShowDrawer(true)} style={styles.iconBtn} accessibilityLabel="Room info">
            <Ionicons name="information-circle-outline" size={20} color={C.textSecondary} />
          </Pressable>
          <Pressable onPress={toggleTheme} style={styles.iconBtn} accessibilityLabel="Toggle theme">
            <Ionicons name={scheme === 'dark' ? 'sunny-outline' : 'moon-outline'} size={18} color={C.textSecondary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.listWrap}>
        {messages.length === 0 && drafts.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>👋</Text>
            <Text style={[styles.emptyText, { color: C.textSecondary }]}>
              No messages yet — start typing in {currentLangName} 👋
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={allItems}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => (
              <View style={jumpHighlight === item.id ? styles.highlight : undefined}>
                <MessageBubble
                  message={item}
                  allMessages={messages}
                  myLang={myLang}
                  isExpanded={expandedIds.has(item.id)}
                  onToggleExpand={toggleExpanded}
                  onReply={(t) => {
                    setReplyTo(t);
                    showToast(`Replying to ${t.sender_username || t.sender_email}`);
                  }}
                  onDelete={(id) => deleteMessage(id)}
                  onJumpToReply={handleJumpToReply}
                />
              </View>
            )}
            contentContainerStyle={{ padding: 12, paddingBottom: 4 }}
            onScrollToIndexFailed={() => listRef.current?.scrollToEnd({ animated: true })}
          />
        )}
        {drafts.length > 0 && (
          <View style={{ paddingHorizontal: 12 }}>
            {drafts.map((d) => (
              <DraftPreview
                key={d.id}
                draft={d}
                onUpdateTranslation={updateDraftTranslation}
                onConfirm={(id, edited) => {
                  confirmDraft(id, edited);
                  showToast('Message sent ✓');
                }}
                onCancel={(id) => removeDraft(id)}
              />
            ))}
          </View>
        )}
      </View>

      <Composer
        currentLangName={currentLangName}
        isConnected={isConnected}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onSend={(text, extra) => {
          sendDraft(text, extra);
        }}
        onTyping={(t) => sendTyping(t)}
      />
      <Text style={styles.hint}>Every send goes through AI translation preview, then Send.</Text>

      <RoomInfoDrawer
        visible={showDrawer}
        onClose={() => setShowDrawer(false)}
        roomId={(roomId as string) || ''}
        title={title}
        description={detail?.description}
        avatarUrl={detail?.avatar_url}
        members={members}
        distinctLangs={distinctLangs}
        currentEmail={user?.email}
        langNames={LANGUAGE_MAP}
        onCopyCode={handleCopyCode}
        onShareLink={handleShareLink}
        isDirect={isDirect}
        onSelectMember={(uid) => setSelectedUserId(uid)}
        isAdmin={!!user && !!detail?.creator_id && detail.creator_id === user.id}
        creatorId={detail?.creator_id}
        onSaveSettings={handleSaveGroupSettings}
        onLeaveRoom={() => {
          setShowDrawer(false);
          router.back();
        }}
      />
      <UserDetailPopup
        token={token}
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
        onChat={handleOpenDirectChat}
      />
      <Toast message={toastMsg} onHide={() => setToastMsg(null)} />
    </SafeAreaView>
  );
}

function makeStyles(C: (typeof Colors)[keyof typeof Colors]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.chatBg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.chatBg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      backgroundColor: C.chatCard,
    },
    backBtn: { padding: 6 },
    headerText: { flex: 1, minWidth: 0 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    title: { fontSize: 16, fontWeight: '800', color: C.text, flexShrink: 1 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    subtitle: { fontSize: 12, color: C.textSecondary, marginTop: 1 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    langBadge: { borderWidth: 1, borderColor: C.border, backgroundColor: C.backgroundElement, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
    langBadgeText: { fontSize: 11, fontWeight: '800', color: C.primary },
    iconBtn: { padding: 7 },
    listWrap: { flex: 1 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 32 },
    emptyEmoji: { fontSize: 36 },
    emptyText: { fontSize: 13, textAlign: 'center' },
    highlight: { backgroundColor: 'rgba(108,92,231,0.12)', borderRadius: 12 },
    hint: { fontSize: 10, opacity: 0.6, textAlign: 'center', color: C.text, paddingBottom: 8, paddingTop: 2 },
  });
}

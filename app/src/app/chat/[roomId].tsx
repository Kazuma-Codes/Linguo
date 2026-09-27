import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import { Colors } from '@/constants/theme';
import { getRoom, getRoomMessages } from '@/lib/api';
import { LANGUAGE_MAP } from '@/lib/languages';
import { MessageBubble } from '@/components/MessageBubble';
import { DraftPreview } from '@/components/DraftPreview';

export default function ChatRoom() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { token, user } = useAuthStore();
  const { messages, drafts, isConnected, typingUser, setInitialMessages, connect, disconnect, sendDraft, confirmDraft, sendTyping, sendReadAck, removeDraft } =
    useChatStore();
  const [text, setText] = useState('');
  const [title, setTitle] = useState('Chat');
  const [isDirect, setIsDirect] = useState(false);
  const [loading, setLoading] = useState(true);
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const C = Colors[scheme];
  const styles = makeStyles(C);

  const myLang = user?.preferred_language || 'en';

  useEffect(() => {
    if (!token || !user || !roomId) return;
    setLoading(true);
    Promise.all([getRoom(token, roomId as string).catch(() => null), getRoomMessages(token, roomId as string).catch(() => [])]).then(
      ([detail, history]) => {
        if (detail?.title) setTitle(detail.title);
        if (detail?.room_type === 'direct') setIsDirect(true);
        setInitialMessages(history, user.email);
        setLoading(false);
      },
    );
    connect(roomId as string, token, user.email);
    return () => disconnect();
  }, [roomId, token]);

  useEffect(() => {
    // Acknowledge every unread incoming message (backend marks each one read,
    // then broadcasts read_ack so the sender's ticks turn green).
    if (!isConnected) return;
    messages
      .filter((m) => !m.is_me && m.status === 'final' && m.delivery_status !== 'read')
      .forEach((m) => sendReadAck(m.id));
  }, [messages.length, isConnected]);

  function handleDraft() {
    if (!text.trim()) return;
    sendDraft(text);
    setText('');
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
        <Text>Connecting…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title} numberOfLines={1}>
        {title} {isConnected ? '●' : '○'}
      </Text>
      <Text style={styles.subtitle} numberOfLines={1}>
        {isDirect ? 'Direct message' : `${LANGUAGE_MAP[myLang] || myLang} · auto-translated`}
      </Text>
      {!!typingUser && <Text style={styles.typing}>{typingUser} is typing…</Text>}
      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <MessageBubble message={item} myLang={myLang} />}
        contentContainerStyle={{ paddingVertical: 8 }}
      />
      {drafts.map((d) => (
        <DraftPreview
          key={d.id}
          draft={d}
          onConfirm={(id, edited) => confirmDraft(id, edited)}
          onCancel={(id) => removeDraft(id)}
        />
      ))}
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder={`Type in ${LANGUAGE_MAP[myLang] || myLang}…`}
          value={text}
          onChangeText={(v) => {
            setText(v);
            sendTyping(true);
          }}
          multiline
        />
        <Pressable style={styles.send} onPress={handleDraft}>
          <Text style={styles.sendText}>AI Draft</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>Every send goes through AI translation preview, then Confirm & Send.</Text>
    </SafeAreaView>
  );
}

function makeStyles(C: (typeof Colors)[keyof typeof Colors]) {
  return StyleSheet.create({
    container: { flex: 1, padding: 12, backgroundColor: C.chatBg, gap: 6 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.chatBg },
    title: { fontSize: 16, fontWeight: '800', color: C.text },
    subtitle: { fontSize: 12, color: C.textSecondary },
    typing: { fontSize: 12, color: C.primary },
    composer: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', backgroundColor: C.chatCard, padding: 8, borderRadius: 14, borderWidth: 1, borderColor: C.border },
    input: { flex: 1, borderWidth: 1, borderColor: C.border, backgroundColor: C.backgroundElement, color: C.text, borderRadius: 12, padding: 10, fontSize: 15, maxHeight: 120 },
    send: { backgroundColor: C.primary, borderRadius: 12, padding: 12, alignItems: 'center' },
    sendText: { color: '#fff', fontWeight: '800' },
    hint: { fontSize: 10, opacity: 0.6, textAlign: 'center', color: C.text },
  });
}

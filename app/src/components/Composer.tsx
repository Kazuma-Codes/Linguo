import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useRef, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import type { ChatMessage } from '@/store/useChatStore';

const COMMON_EMOJIS = ['😊', '😂', '🔥', '👍', '❤️', '🎉', '✨', '🙏', '🙌', '💡', '🚀', '💯'];

export function Composer({
  currentLangName,
  isConnected,
  replyTo,
  onCancelReply,
  onSend,
  onTyping,
}: {
  currentLangName: string;
  isConnected: boolean;
  replyTo: ChatMessage | null;
  onCancelReply: () => void;
  onSend: (text: string, extra?: { reply_to_id?: string; attachment_url?: string; attachment_name?: string; attachment_size?: number; message_type?: string }) => void;
  onTyping: (isTyping: boolean) => void;
}) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const C = Colors[scheme];
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [attachment, setAttachment] = useState<{ url: string; name: string; size: number; type: string } | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(v: string) {
    setText(v);
    onTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => onTyping(false), 1800);
  }

  function handleSend() {
    const trimmed = text.trim();
    if ((!trimmed && !attachment) || !isConnected) return;
    onSend(trimmed, {
      reply_to_id: replyTo?.id,
      attachment_url: attachment?.url,
      attachment_name: attachment?.name,
      attachment_size: attachment?.size,
      message_type: attachment?.type || 'text',
    });
    setText('');
    setAttachment(null);
    setShowEmoji(false);
    onCancelReply();
    onTyping(false);
  }

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: true });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    // For parity with web demo: use local uri for preview; backend fans out translations regardless.
    setAttachment({ url: a.uri, name: a.fileName || 'photo.jpg', size: (a as any).fileSize || 0, type: 'image' });
  }

  async function pickFile() {
    try {
      const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return;
      const f = res.assets[0];
      setAttachment({ url: f.uri, name: f.name, size: f.size || 0, type: 'file' });
    } catch {}
  }

  function openAttachSheet() {
    setAttachSheet(true);
  }

  const [attachSheet, setAttachSheet] = useState(false);

  return (
    <View style={[styles.wrap, { backgroundColor: C.chatCard, borderColor: C.border }]}>
      {!!replyTo && (
        <View style={[styles.replyBar, { backgroundColor: C.backgroundElement, borderLeftColor: C.primary }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.replyTitle, { color: C.text }]}>
              Replying to {replyTo.is_me ? 'yourself' : replyTo.sender_username || replyTo.sender_email}
            </Text>
            <Text style={[styles.replyText, { color: C.textSecondary }]} numberOfLines={1}>{replyTo.original_text}</Text>
          </View>
          <Pressable onPress={onCancelReply} style={styles.x}>
            <Ionicons name="close" size={16} color={C.textSecondary} />
          </Pressable>
        </View>
      )}

      {!!attachment && (
        <View style={[styles.attachBar, { backgroundColor: C.backgroundElement, borderColor: C.border }]}>
          {attachment.type === 'image' ? (
            <Image source={{ uri: attachment.url }} style={{ width: 32, height: 32, borderRadius: 8 }} />
          ) : (
            <Ionicons name="attach-outline" size={18} color={C.primary} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.attachName, { color: C.text }]} numberOfLines={1}>{attachment.name}</Text>
            {!!attachment.size && (
              <Text style={[styles.attachSize, { color: C.textSecondary }]}>{(attachment.size / 1024).toFixed(1)} KB</Text>
            )}
          </View>
          <Pressable onPress={() => setAttachment(null)}>
            <Ionicons name="close" size={16} color={C.textSecondary} />
          </Pressable>
        </View>
      )}

      {showEmoji && (
        <View style={[styles.emojiRow, { backgroundColor: C.card, borderColor: C.border }]}>
          {COMMON_EMOJIS.map((e) => (
            <Pressable key={e} style={styles.emoji} onPress={() => setText((p) => p + e)}>
              <Text style={{ fontSize: 20 }}>{e}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.row}>
        <Pressable
          style={[styles.circleBtn, { backgroundColor: C.backgroundElement, borderColor: C.border }]}
          onPress={openAttachSheet}
          accessibilityLabel="Attach"
        >
          <Ionicons name="attach-outline" size={19} color={C.textSecondary} />
        </Pressable>
        <Pressable
          style={[styles.circleBtn, { backgroundColor: C.backgroundElement, borderColor: C.border }]}
          onPress={() => setShowEmoji((v) => !v)}
          accessibilityLabel="Emoji"
        >
          <Ionicons name="happy-outline" size={19} color={C.textSecondary} />
        </Pressable>
        <TextInput
          style={[styles.input, { borderColor: C.border, backgroundColor: C.backgroundElement, color: C.text }]}
          placeholder={isConnected ? `Type in ${currentLangName}...` : 'Connecting...'}
          placeholderTextColor={C.textSecondary}
          value={text}
          onChangeText={handleChange}
          multiline
          editable={isConnected}
          onSubmitEditing={handleSend}
        />
        <Pressable
          style={[styles.send, { backgroundColor: C.primary, opacity: !isConnected || (!text.trim() && !attachment) ? 0.45 : 1 }]}
          onPress={handleSend}
          disabled={!isConnected || (!text.trim() && !attachment)}
          accessibilityLabel="Send via AI preview"
        >
          <Ionicons name="send" size={16} color="#fff" />
        </Pressable>
      </View>

      <Modal visible={attachSheet} transparent animationType="fade" onRequestClose={() => setAttachSheet(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setAttachSheet(false)}>
          <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.border }]}>
            <Pressable
              style={styles.sheetRow}
              onPress={() => {
                setAttachSheet(false);
                pickImage();
              }}
            >
              <Ionicons name="image-outline" size={18} color={C.primary} />
              <Text style={[styles.sheetText, { color: C.text }]}>Photo / Image</Text>
            </Pressable>
            <Pressable
              style={styles.sheetRow}
              onPress={() => {
                setAttachSheet(false);
                pickFile();
              }}
            >
              <Ionicons name="document-outline" size={18} color={C.primary} />
              <Text style={[styles.sheetText, { color: C.text }]}>Document / File</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: 1, paddingHorizontal: 10, paddingVertical: 10, gap: 8 },
  replyBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderLeftWidth: 4, borderRadius: 10, padding: 8 },
  replyTitle: { fontSize: 12, fontWeight: '800' },
  replyText: { fontSize: 11, marginTop: 1 },
  x: { padding: 4 },
  attachBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, padding: 8 },
  attachName: { fontSize: 12, fontWeight: '700' },
  attachSize: { fontSize: 10 },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, borderWidth: 1, borderRadius: 14, padding: 8 },
  emoji: { padding: 6 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  circleBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, maxHeight: 120 },
  send: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', padding: 16 },
  sheet: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  sheetText: { fontSize: 14, fontWeight: '700' },
});

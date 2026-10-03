import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { Image, Linking, Modal, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ChatMessage } from '@/store/useChatStore';
import { LANGUAGE_MAP } from '@/lib/languages';
import { Colors } from '@/constants/theme';
import { Footnotes } from './Footnotes';
import { MergedAvatar } from './MergedAvatar';

function formatTime(timestamp?: number | string) {
  if (timestamp == null) return '';
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function MessageBubble({
  message,
  allMessages = [],
  myLang,
  isExpanded,
  onToggleExpand,
  onReply,
  onDelete,
  onJumpToReply,
}: {
  message: ChatMessage;
  allMessages?: ChatMessage[];
  myLang: string;
  isExpanded?: boolean;
  onToggleExpand?: (id: string) => void;
  onReply?: (message: ChatMessage) => void;
  onDelete?: (messageId: string) => void;
  onJumpToReply?: (replyId: string) => void;
}) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const C = Colors[scheme];
  const [menuVisible, setMenuVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = onToggleExpand ? !!isExpanded : localExpanded;
  const toggle = () => {
    if (onToggleExpand) onToggleExpand(message.id);
    else setLocalExpanded((v) => !v);
  };

  const primary = message.is_me
    ? message.original_text
    : message.translations?.[myLang] || message.translated_text || message.original_text;
  const listenerTranslation = message.translations?.[myLang] || message.translated_text;
  const currentLangName = LANGUAGE_MAP[myLang] || myLang.toUpperCase();
  const replied = message.reply_to_id ? allMessages.find((m) => m.id === message.reply_to_id) : null;

  const meText = C.bubbleMeText;
  const otherText = C.bubbleOtherText;
  const bodyColor = message.is_me ? meText : otherText;
  const faintColor = message.is_me ? meText : C.textSecondary;

  async function handleCopy() {
    try {
      await Clipboard.setStringAsync(primary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
    setMenuVisible(false);
  }

  const isImage =
    !!message.attachment_url &&
    (message.message_type === 'image' || /\.(jpeg|jpg|gif|png|webp)(\?|$)/i.test(message.attachment_url));

  return (
    <View style={[styles.wrap, message.is_me ? styles.me : styles.other]}>
      {!message.is_me && (
        <View style={{ marginRight: 6, marginBottom: 2 }}>
          <MergedAvatar name={message.sender_username || message.sender_email} avatarUrl={message.sender_avatar_url} size="sm" />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: message.is_me ? C.bubbleMe : C.bubbleOther,
            borderColor: C.border,
            borderWidth: message.is_me ? 0 : 1,
          },
        ]}
      >
        <View style={styles.headerRow}>
          {!message.is_me ? (
            <Text style={[styles.sender, { color: otherText }]} numberOfLines={1}>
              {message.sender_username || message.sender_email}
            </Text>
          ) : (
            <Text style={[styles.you, { color: bodyColor }]}>YOU</Text>
          )}
          <View style={styles.headerActions}>
            <Pressable onPress={toggle} style={styles.iconBtn} accessibilityLabel="Details">
              <Ionicons name="information-circle-outline" size={15} color={faintColor} />
            </Pressable>
            <Pressable onPress={() => setMenuVisible(true)} style={styles.iconBtn} accessibilityLabel="Options">
              <Ionicons name="chevron-down" size={15} color={faintColor} />
            </Pressable>
          </View>
        </View>

        {!!replied && (
          <Pressable
            style={[styles.quote, { borderLeftColor: C.primary, backgroundColor: 'rgba(0,0,0,0.08)' }]}
            onPress={() => replied && onJumpToReply?.(replied.id)}
          >
            <Text style={[styles.quoteName, { color: bodyColor }]} numberOfLines={1}>
              {replied.is_me ? 'You' : replied.sender_username || replied.sender_email}
            </Text>
            <Text style={[styles.quoteText, { color: bodyColor }]} numberOfLines={1}>{replied.original_text}</Text>
          </Pressable>
        )}

        {!!message.attachment_url && (
          <View style={{ marginBottom: 6 }}>
            {isImage ? (
              <Pressable onPress={() => Linking.openURL(message.attachment_url!)}>
                <Image source={{ uri: message.attachment_url! }} style={{ width: '100%', height: 180, borderRadius: 10 }} resizeMode="cover" />
              </Pressable>
            ) : (
              <Pressable
                style={[styles.fileRow, { backgroundColor: 'rgba(0,0,0,0.08)' }]}
                onPress={() => Linking.openURL(message.attachment_url!)}
              >
                <Ionicons name="attach-outline" size={16} color={bodyColor} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fileName, { color: bodyColor }]} numberOfLines={1}>
                    {message.attachment_name || 'Attachment File'}
                  </Text>
                  {!!message.attachment_size && (
                    <Text style={[styles.fileSize, { color: faintColor }]}>
                      {(message.attachment_size / 1024).toFixed(1)} KB
                    </Text>
                  )}
                </View>
              </Pressable>
            )}
          </View>
        )}

        <Text style={[styles.text, { color: bodyColor }]}>{primary}</Text>
        {!message.is_me && message.detected_lang && message.detected_lang !== myLang && !expanded && (
          <Text style={[styles.hint, { color: faintColor }]}>
            Translated from {LANGUAGE_MAP[message.detected_lang] || message.detected_lang}
          </Text>
        )}
        <View style={styles.footer}>
          <Text style={[styles.time, { color: faintColor }]}>{formatTime(message.created_at)}</Text>
          {message.is_me &&
            (message.delivery_status === 'read' ? (
              <Ionicons name="checkmark-done" size={14} color="#34d399" />
            ) : message.delivery_status === 'delivered' ? (
              <Ionicons name="checkmark-done" size={14} color={faintColor} />
            ) : (
              <Ionicons name="checkmark" size={14} color={faintColor} />
            ))}
        </View>

        {expanded && (
          <View style={styles.drawer}>
            <View style={[styles.drawerBox, { backgroundColor: 'rgba(0,0,0,0.08)' }]}>
              <Text style={[styles.drawerLabel, { color: faintColor }]}>
                Original{message.detected_lang ? ` · Detected: ${LANGUAGE_MAP[message.detected_lang] || message.detected_lang}` : ''}
              </Text>
              <Text style={[styles.drawerText, { color: bodyColor }]}>{message.original_text}</Text>
            </View>
            {!message.is_me && !!listenerTranslation && listenerTranslation !== message.original_text && (
              <View style={[styles.drawerBox, { backgroundColor: 'rgba(0,0,0,0.08)' }]}>
                <Text style={[styles.drawerLabel, { color: faintColor }]}>{currentLangName} Translation</Text>
                <Text style={[styles.drawerText, { color: bodyColor }]}>{listenerTranslation}</Text>
              </View>
            )}
            {message.is_me && message.translations && Object.keys(message.translations).length > 0 && (
              <View style={[styles.drawerBox, { backgroundColor: 'rgba(0,0,0,0.08)' }]}>
                <Text style={[styles.drawerLabel, { color: faintColor }]}>Translations Sent:</Text>
                {Object.entries(message.translations).map(([lang, text]) => (
                  <Text key={lang} style={[styles.drawerText, { color: bodyColor }]}>
                    <Text style={{ fontWeight: '800' }}>{lang.toUpperCase()}: </Text>
                    {text}
                  </Text>
                ))}
              </View>
            )}
            <Footnotes footnotes={message.cultural_footnotes} />
          </View>
        )}
      </View>

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menu, { backgroundColor: C.card, borderColor: C.border }]}>
            {!!onReply && (
              <Pressable
                style={styles.menuRow}
                onPress={() => {
                  setMenuVisible(false);
                  onReply(message);
                }}
              >
                <Ionicons name="arrow-undo-outline" size={15} color={C.primary} />
                <Text style={[styles.menuText, { color: C.text }]}>Reply</Text>
              </Pressable>
            )}
            <Pressable style={styles.menuRow} onPress={handleCopy}>
              <Ionicons name="copy-outline" size={15} color="#10b981" />
              <Text style={[styles.menuText, { color: C.text }]}>{copied ? 'Copied!' : 'Copy'}</Text>
            </Pressable>
            {message.is_me && !!onDelete && (
              <Pressable
                style={styles.menuRow}
                onPress={() => {
                  setMenuVisible(false);
                  onDelete(message.id);
                }}
              >
                <Ionicons name="trash-outline" size={15} color="#ef4444" />
                <Text style={[styles.menuText, { color: '#ef4444' }]}>Delete</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginVertical: 4, flexDirection: 'row', alignItems: 'flex-end' },
  me: { justifyContent: 'flex-end' },
  other: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '86%', borderRadius: 14, padding: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  sender: { fontSize: 11, fontWeight: '800', opacity: 0.85, flex: 1 },
  you: { fontSize: 10, fontWeight: '800', opacity: 0.7, letterSpacing: 0.5 },
  headerActions: { flexDirection: 'row', gap: 2 },
  iconBtn: { padding: 4 },
  text: { fontSize: 15, lineHeight: 21, fontWeight: '500' },
  hint: { fontSize: 10, fontStyle: 'italic', marginTop: 4, opacity: 0.8 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 },
  time: { fontSize: 10, opacity: 0.8 },
  drawer: { marginTop: 8, gap: 6 },
  drawerBox: { borderRadius: 10, padding: 8, gap: 4 },
  drawerLabel: { fontSize: 11, fontWeight: '800', opacity: 0.7 },
  drawerText: { fontSize: 13, lineHeight: 18 },
  quote: { borderLeftWidth: 3, borderRadius: 8, padding: 8, marginBottom: 6, gap: 2 },
  quoteName: { fontSize: 11, fontWeight: '800' },
  quoteText: { fontSize: 11, opacity: 0.8 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 10 },
  fileName: { fontSize: 12, fontWeight: '700' },
  fileSize: { fontSize: 10, opacity: 0.7 },
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  menu: { width: 220, borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  menuText: { fontSize: 13, fontWeight: '700' },
});

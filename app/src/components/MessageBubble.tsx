import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import type { ChatMessage } from '@/store/useChatStore';
import { LANGUAGE_MAP } from '@/lib/languages';
import { Colors } from '@/constants/theme';
import { Footnotes } from './Footnotes';

export function MessageBubble({ message, myLang }: { message: ChatMessage; myLang: string }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const C = Colors[scheme];
  const [expanded, setExpanded] = useState(false);
  // Translated-first: recipients see Settings default translation, senders see original.
  const primary = message.is_me
    ? message.original_text
    : message.translations?.[myLang] || message.translated_text || message.original_text;

  return (
    <View style={[styles.wrap, message.is_me ? styles.me : styles.other]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: message.is_me ? C.primary : C.card,
            borderColor: C.border,
            borderWidth: message.is_me ? 0 : 1,
          },
        ]}
      >
        {!message.is_me && (
          <Text style={[styles.sender, { color: C.textSecondary }]} numberOfLines={1}>
            {message.sender_username || message.sender_email}
          </Text>
        )}
        <Text style={[styles.text, { color: message.is_me ? '#ffffff' : C.text }]}>{primary}</Text>
        {!message.is_me && message.detected_lang && message.detected_lang !== myLang && (
          <Text style={[styles.hint, { color: C.textSecondary }]}>
            Translated from {LANGUAGE_MAP[message.detected_lang] || message.detected_lang}
          </Text>
        )}
        <Pressable onPress={() => setExpanded((v) => !v)} style={styles.infoBtn}>
          <Text style={[styles.infoText, { color: C.primary }]}>
            {expanded ? 'Hide details ▲' : 'ⓘ Original & cultural notes'}
          </Text>
        </Pressable>
        {expanded && (
          <View style={styles.drawer}>
            <Text style={[styles.drawerLabel, { color: C.textSecondary }]}>
              Original ({LANGUAGE_MAP[message.detected_lang || ''] || message.detected_lang || 'auto'})
            </Text>
            <Text style={[styles.drawerText, { color: message.is_me ? '#ffffff' : C.text }]}>
              {message.original_text}
            </Text>
            <Footnotes footnotes={message.cultural_footnotes} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginVertical: 4, flexDirection: 'row' },
  me: { justifyContent: 'flex-end' },
  other: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '88%', borderRadius: 14, padding: 10 },
  sender: { fontSize: 11, fontWeight: '800', marginBottom: 3, opacity: 0.7 },
  text: { fontSize: 15, lineHeight: 21 },
  hint: { fontSize: 10, fontStyle: 'italic', marginTop: 4, opacity: 0.7 },
  infoBtn: { marginTop: 6 },
  infoText: { fontSize: 11, fontWeight: '700' },
  drawer: { marginTop: 8, gap: 4 },
  drawerLabel: { fontSize: 11, fontWeight: '800', opacity: 0.7 },
  drawerText: { fontSize: 13, lineHeight: 18 },
});

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import type { ChatMessage } from '@/store/useChatStore';
import { Colors } from '@/constants/theme';
import { Footnotes } from './Footnotes';

export function DraftPreview({
  draft,
  onUpdateTranslation,
  onConfirm,
  onCancel,
}: {
  draft: ChatMessage;
  onUpdateTranslation?: (id: string, translated: string) => void;
  onConfirm: (id: string, edited: string) => void;
  onCancel: (id: string) => void;
}) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const C = Colors[scheme];
  const isTranslating = draft.translated_text == null && !draft.translations;
  const firstTranslation =
    (draft.translations && Object.values(draft.translations)[0]) || draft.translated_text || '';
  const [edited, setEdited] = useState(firstTranslation);

  useEffect(() => {
    setEdited(firstTranslation);
  }, [draft.id, draft.translated_text, firstTranslation]);

  function handleChange(text: string) {
    setEdited(text);
    onUpdateTranslation?.(draft.id, text);
  }

  return (
    <View style={[styles.card, { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.45)' }]}>
      <View style={styles.header}>
        <Text style={styles.amberTitle}>✨ Draft AI Translation</Text>
        {isTranslating && (
          <View style={styles.translating}>
            <ActivityIndicator size="small" color="#f59e0b" />
            <Text style={styles.translatingText}>Translating with Groq...</Text>
          </View>
        )}
      </View>
      <Text style={[styles.originalLabel, { color: C.textSecondary }]}>Original: {draft.original_text}</Text>
      <TextInput
        value={edited}
        onChangeText={handleChange}
        multiline
        placeholder={isTranslating ? 'Translating with Groq... (or type your translation)' : 'Edit translation before sending...'}
        placeholderTextColor={C.textSecondary}
        style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.card }]}
      />
      <Footnotes footnotes={draft.cultural_footnotes} />
      <View style={styles.row}>
        <Pressable style={[styles.sendBtn, { backgroundColor: '#059669' }]} onPress={() => onConfirm(draft.id, edited || draft.original_text)}>
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
        <Pressable style={[styles.ghostBtn, { borderColor: C.border, backgroundColor: C.card }]} onPress={() => onConfirm(draft.id, draft.original_text)}>
          <Text style={[styles.ghostText, { color: C.textSecondary }]}>Send Original</Text>
        </Pressable>
        <Pressable style={styles.cancelBtn} onPress={() => onCancel(draft.id)}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 2, borderRadius: 14, padding: 12, marginVertical: 6, gap: 8, alignSelf: 'flex-end', maxWidth: '92%', width: '92%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amberTitle: { fontSize: 11, fontWeight: '800', color: '#b45309', textTransform: 'uppercase', letterSpacing: 0.5 },
  translating: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  translatingText: { fontSize: 11, color: '#b45309', fontWeight: '600' },
  originalLabel: { fontSize: 11, fontStyle: 'italic' },
  input: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 14, minHeight: 64, textAlignVertical: 'top', fontWeight: '500' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  sendBtn: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9 },
  sendText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  ghostBtn: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  ghostText: { fontWeight: '700', fontSize: 12 },
  cancelBtn: { marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 8 },
  cancelText: { color: '#ef4444', fontWeight: '700', fontSize: 12 },
});

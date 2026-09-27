import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import type { ChatMessage } from '@/store/useChatStore';
import { Colors } from '@/constants/theme';
import { Footnotes } from './Footnotes';

export function DraftPreview({
  draft,
  onConfirm,
  onCancel,
}: {
  draft: ChatMessage;
  onConfirm: (id: string, edited: string) => void;
  onCancel: (id: string) => void;
}) {
  const firstTranslation =
    (draft.translations && Object.values(draft.translations)[0]) || draft.translated_text || '';
  const [edited, setEdited] = useState(firstTranslation);
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const C = Colors[scheme];

  React.useEffect(() => {
    setEdited(firstTranslation);
  }, [draft.id]);

  return (
    <View style={[styles.card, { backgroundColor: C.primarySoft, borderColor: C.primary }]}>
      <Text style={[styles.title, { color: C.text }]}>AI Draft — review before sending</Text>
      <Text style={[styles.label, { color: C.textSecondary }]}>Original</Text>
      <Text style={[styles.original, { color: C.text }]}>{draft.original_text}</Text>
      <Text style={[styles.label, { color: C.textSecondary }]}>Translation (editable)</Text>
      <TextInput
        value={edited}
        onChangeText={setEdited}
        multiline
        style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.card }]}
      />
      <Footnotes footnotes={draft.cultural_footnotes} />
      <View style={styles.row}>
        <Pressable style={[styles.btn, { backgroundColor: C.primary }]} onPress={() => onConfirm(draft.id, edited)}>
          <Text style={styles.btnText}>Confirm & Send</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, { backgroundColor: C.textSecondary }]}
          onPress={() => onCancel(draft.id)}
        >
          <Text style={styles.btnText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 12, marginVertical: 6 },
  title: { fontSize: 13, fontWeight: '800', marginBottom: 6 },
  label: { fontSize: 11, fontWeight: '700', opacity: 0.6, marginTop: 6 },
  original: { fontSize: 14 },
  input: { borderWidth: 1, borderRadius: 10, padding: 8, marginTop: 4, fontSize: 14, minHeight: 60 },
  row: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btn: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800' },
});

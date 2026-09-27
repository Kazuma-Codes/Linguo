import React from 'react';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';
import type { Footnotes as FN } from '@/store/useChatStore';
import { Colors } from '@/constants/theme';

export function Footnotes({ footnotes }: { footnotes?: FN | null }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const C = Colors[scheme];
  if (!footnotes) return null;
  const rows: Array<[string, string | undefined]> = [
    ['Humor', footnotes.humor_explanation],
    ['Idiom', footnotes.idiom_breakdown],
    ['Etiquette', footnotes.etiquette_warning],
  ].filter(([, v]) => !!v) as Array<[string, string]>;
  if (!rows.length) return null;
  return (
    <View style={[styles.box, { backgroundColor: C.primarySoft, borderColor: C.border, borderWidth: 1 }]}>
      <Text style={[styles.title, { color: C.text }]}>Cultural notes</Text>
      {rows.map(([k, v]) => (
        <Text key={k} style={[styles.row, { color: C.text }]}>
          <Text style={styles.key}>{k}: </Text>
          {v}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: 8, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 10, padding: 8, gap: 4 },
  title: { fontSize: 11, fontWeight: '800', opacity: 0.7 },
  row: { fontSize: 12, lineHeight: 17 },
  key: { fontWeight: '700' },
});

import React, { useEffect } from 'react';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';

export function Toast({ message, onHide }: { message: string | null; onHide: () => void }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const C = Colors[scheme];
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onHide, 2800);
    return () => clearTimeout(t);
  }, [message]);
  if (!message) return null;
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <View style={[styles.pill, { backgroundColor: C.card, borderColor: C.border }]}>
        <Text style={[styles.text, { color: C.text }]}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 88, alignItems: 'center', zIndex: 60 },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, maxWidth: '90%' },
  text: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
});

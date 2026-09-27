import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { MergedAvatar } from './MergedAvatar';

export interface SearchItem {
  id: string;
  title: string;
  subtitle?: string;
  avatarUrl?: string;
  type: 'room' | 'contact';
}

export function SearchOverlay({
  visible,
  onClose,
  items,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  items: SearchItem[];
  onSelect: (item: SearchItem) => void;
}) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const C = Colors[scheme];
  const [query, setQuery] = useState('');

  const filtered = items.filter((i) => {
    const q = query.toLowerCase();
    return i.title.toLowerCase().includes(q) || (i.subtitle || '').toLowerCase().includes(q);
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={[styles.searchBar, { borderColor: C.border }]}>
            <Ionicons name="search-outline" size={18} color={C.textSecondary} />
            <TextInput
              style={[styles.input, { color: C.text }]}
              placeholder="Search rooms & contacts..."
              placeholderTextColor={C.textSecondary}
              value={query}
              onChangeText={setQuery}
              autoFocus
              autoCapitalize="none"
            />
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={18} color={C.textSecondary} />
            </Pressable>
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(i) => `${i.type}-${i.id}`}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={styles.row}
                onPress={() => {
                  onSelect(item);
                  setQuery('');
                  onClose();
                }}
              >
                <MergedAvatar name={item.title} avatarUrl={item.avatarUrl} size="md" />
                <View style={styles.text}>
                  <Text style={[styles.title, { color: C.text }]} numberOfLines={1}>{item.title}</Text>
                  {!!item.subtitle && (
                    <Text style={[styles.sub, { color: C.textSecondary }]} numberOfLines={1}>{item.subtitle}</Text>
                  )}
                </View>
                <View style={[styles.badge, { backgroundColor: C.backgroundElement }]}>
                  <Text style={[styles.badgeText, { color: C.textSecondary }]}>{item.type}</Text>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={[styles.empty, { color: C.textSecondary }]}>No results for “{query}”</Text>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', padding: 16, paddingTop: 64 },
  card: { borderWidth: 1, borderRadius: 20, overflow: 'hidden', maxHeight: '70%' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1 },
  input: { flex: 1, fontSize: 15, padding: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  text: { flex: 1 },
  title: { fontSize: 14, fontWeight: '800' },
  sub: { fontSize: 12, marginTop: 1 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  empty: { textAlign: 'center', fontSize: 12, paddingVertical: 28 },
});

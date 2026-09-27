import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { searchUsers } from '@/lib/api';
import { MergedAvatar } from './MergedAvatar';

export function AddContactModal({
  visible,
  onClose,
  token,
  onAddContact,
}: {
  visible: boolean;
  onClose: () => void;
  token: string | null;
  onAddContact: (userId: string) => Promise<void> | void;
}) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const C = Colors[scheme];
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [addedMap, setAddedMap] = useState<Record<string, boolean>>({});

  async function handleSearch() {
    if (!query.trim() || !token) return;
    setLoading(true);
    try {
      const data = await searchUsers(token, query.trim());
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(userId: string) {
    await onAddContact(userId);
    setAddedMap((p) => ({ ...p, [userId]: true }));
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={[styles.icon, { backgroundColor: C.primarySoft }]}>
                <Ionicons name="person-add-outline" size={20} color={C.primary} />
              </View>
              <Text style={[styles.title, { color: C.text }]}>Add New Contact</Text>
            </View>
            <Pressable onPress={onClose} style={styles.x}>
              <Ionicons name="close" size={20} color={C.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.searchRow}>
            <View style={[styles.searchBox, { backgroundColor: C.backgroundElement, borderColor: C.border }]}>
              <Ionicons name="search-outline" size={15} color={C.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: C.text }]}
                placeholder="Search by email or username..."
                placeholderTextColor={C.textSecondary}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                autoCapitalize="none"
              />
            </View>
            <Pressable style={[styles.searchBtn, { backgroundColor: C.primary }]} onPress={handleSearch} disabled={loading || !query.trim()}>
              <Text style={styles.searchBtnText}>{loading ? '…' : 'Search'}</Text>
            </Pressable>
          </View>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={C.primary} />
              <Text style={[styles.sub, { color: C.textSecondary }]}>Searching directory...</Text>
            </View>
          ) : results.length === 0 ? (
            <Text style={[styles.empty, { color: C.textSecondary }]}>
              {query ? 'No matching users found' : 'Type a name or email to search'}
            </Text>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(u: any) => String(u.id)}
              renderItem={({ item: u }: any) => (
                <View style={[styles.resultRow, { borderColor: C.border, backgroundColor: C.backgroundElement }]}>
                  <MergedAvatar name={u.username || u.email} avatarUrl={u.avatar_url} size="md" />
                  <View style={styles.resultText}>
                    <Text style={[styles.resultName, { color: C.text }]} numberOfLines={1}>
                      {u.username || u.email?.split('@')[0]}
                    </Text>
                    <Text style={[styles.resultSub, { color: C.textSecondary }]} numberOfLines={1}>{u.email}</Text>
                  </View>
                  <Pressable
                    style={[styles.addBtn, addedMap[u.id] ? styles.added : { backgroundColor: C.primary }]}
                    onPress={() => handleAdd(u.id)}
                    disabled={!!addedMap[u.id]}
                  >
                    <Text style={[styles.addText, { color: addedMap[u.id] ? '#10b981' : '#fff' }]}>
                      {addedMap[u.id] ? 'Added ✓' : 'Add'}
                    </Text>
                  </Pressable>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  card: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 18, gap: 12, maxHeight: '85%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '800' },
  x: { padding: 6 },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },
  searchBtn: { borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  center: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  sub: { fontSize: 12 },
  empty: { textAlign: 'center', fontSize: 12, paddingVertical: 24 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, padding: 10, marginBottom: 8 },
  resultText: { flex: 1 },
  resultName: { fontSize: 13, fontWeight: '800' },
  resultSub: { fontSize: 11, marginTop: 1 },
  addBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  added: { backgroundColor: 'rgba(16,185,129,0.12)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  addText: { fontWeight: '800', fontSize: 12 },
});

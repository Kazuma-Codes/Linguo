import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { getUserById } from '@/lib/api';
import { LANGUAGE_MAP } from '@/lib/languages';
import { MergedAvatar } from './MergedAvatar';

export function UserDetailPopup({
  token,
  userId,
  onClose,
  onChat,
}: {
  token: string | null;
  userId: string | null;
  onClose: () => void;
  onChat: (userId: string) => void;
}) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const C = Colors[scheme];
  const [detail, setDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || !userId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    getUserById(token, userId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [token, userId]);

  const displayName = detail?.username || detail?.email?.split('@')[0] || 'User';
  const langName = detail?.preferred_language
    ? LANGUAGE_MAP[detail.preferred_language] || detail.preferred_language.toUpperCase()
    : '';

  return (
    <Modal visible={!!userId} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]} onPress={() => {}}>
          <View style={[styles.banner, { backgroundColor: C.primarySoft }]} />
          <View style={styles.body}>
            {loading || !detail ? (
              <View style={styles.center}>
                <ActivityIndicator color={C.primary} />
                <Text style={[styles.sub, { color: C.textSecondary }]}>Loading profile…</Text>
              </View>
            ) : (
              <>
                <View style={styles.avatarWrap}>
                  <MergedAvatar name={displayName} avatarUrl={detail.avatar_url} size="xl" />
                </View>
                <Text style={[styles.name, { color: C.text }]}>{displayName}</Text>
                <Text style={[styles.sub, { color: C.textSecondary }]}>{detail.email}</Text>
                {!!detail.about && <Text style={[styles.about, { color: C.text }]}>{detail.about}</Text>}
                {!!langName && (
                  <View style={[styles.langPill, { backgroundColor: C.primarySoft }]}>
                    <Text style={[styles.langText, { color: C.primary }]}>Speaks {langName}</Text>
                  </View>
                )}
                <View style={styles.row}>
                  <Pressable style={[styles.btn, { borderColor: C.border }]} onPress={onClose}>
                    <Text style={[styles.btnText, { color: C.text }]}>Close</Text>
                  </Pressable>
                  <Pressable style={[styles.btn, { backgroundColor: C.primary }]} onPress={() => detail?.id && onChat(detail.id)}>
                    <Ionicons name="chatbubble-outline" size={15} color="#fff" />
                    <Text style={[styles.btnText, { color: '#fff' }]}>Chat</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 320, borderWidth: 1, borderRadius: 24, overflow: 'hidden' },
  banner: { height: 64 },
  body: { alignItems: 'center', padding: 18, marginTop: -32, gap: 4 },
  avatarWrap: { borderWidth: 4, borderRadius: 999, borderColor: 'transparent' },
  center: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  name: { fontSize: 18, fontWeight: '800', marginTop: 8 },
  sub: { fontSize: 12 },
  about: { fontSize: 12, textAlign: 'center', marginTop: 6 },
  langPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginTop: 8 },
  langText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  row: { flexDirection: 'row', gap: 10, marginTop: 14, width: '100%' },
  btn: { flex: 1, flexDirection: 'row', borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnText: { fontWeight: '800', fontSize: 13 },
});

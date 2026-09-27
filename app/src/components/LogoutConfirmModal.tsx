import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

export function LogoutConfirmModal({
  visible,
  title,
  description,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
}) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const C = Colors[scheme];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.title, { color: C.text }]}>{title || 'Log out?'}</Text>
          <Text style={[styles.sub, { color: C.textSecondary }]}>
            {description || 'You will need to sign in again to continue chatting.'}
          </Text>
          <View style={styles.row}>
            <Pressable style={[styles.btn, { borderColor: C.border }]} onPress={onClose}>
              <Text style={[styles.btnText, { color: C.text }]}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.danger]} onPress={onConfirm}>
              <Ionicons name="log-out-outline" size={16} color="#fff" />
              <Text style={[styles.btnText, { color: '#fff' }]}>Confirm</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 360, borderWidth: 1, borderRadius: 20, padding: 20, gap: 8 },
  title: { fontSize: 17, fontWeight: '800' },
  sub: { fontSize: 13, lineHeight: 18 },
  row: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn: { flex: 1, flexDirection: 'row', borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center', justifyContent: 'center', gap: 6 },
  danger: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
  btnText: { fontWeight: '800', fontSize: 13 },
});

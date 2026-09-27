import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, TextInput, View, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

export function CreateGroupModal({
  visible,
  onClose,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (data: { title: string; description: string; is_private: boolean }) => Promise<void> | void;
}) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const C = Colors[scheme];
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onCreate({ title: title.trim(), description: description.trim(), is_private: isPrivate });
      setTitle('');
      setDescription('');
      setIsPrivate(false);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: C.text }]}>Create Group Community</Text>
            <Pressable onPress={onClose} style={styles.x}>
              <Ionicons name="close" size={20} color={C.textSecondary} />
            </Pressable>
          </View>
          <Text style={[styles.label, { color: C.textSecondary }]}>Group Title</Text>
          <TextInput
            style={[styles.input, { borderColor: C.border, backgroundColor: C.backgroundElement, color: C.text }]}
            placeholder="e.g. Polyglot Founders, Tokyo Coffee Talk"
            placeholderTextColor={C.textSecondary}
            value={title}
            onChangeText={setTitle}
          />
          <Text style={[styles.label, { color: C.textSecondary }]}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, { borderColor: C.border, backgroundColor: C.backgroundElement, color: C.text, minHeight: 64, textAlignVertical: 'top' }]}
            placeholder="What is this group about?"
            placeholderTextColor={C.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <View style={styles.privateRow}>
            <Switch value={isPrivate} onValueChange={setIsPrivate} trackColor={{ true: C.primary }} />
            <Text style={[styles.privateText, { color: C.textSecondary }]}>
              Private room (only accessible via direct room code or invite link)
            </Text>
          </View>
          <Pressable
            style={[styles.create, { backgroundColor: C.primary, opacity: !title.trim() || saving ? 0.6 : 1 }]}
            onPress={handleSubmit}
            disabled={!title.trim() || saving}
          >
            <Text style={styles.createText}>{saving ? 'Creating…' : 'Create Group'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  card: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 17, fontWeight: '800' },
  x: { padding: 6 },
  label: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginTop: 6 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14 },
  privateRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 4 },
  privateText: { flex: 1, fontSize: 12, lineHeight: 17 },
  create: { borderRadius: 999, padding: 14, alignItems: 'center', marginTop: 8 },
  createText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});

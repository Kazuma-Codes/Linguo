import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { FlatList, Image, Modal, Pressable, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { AVATAR_PRESETS } from '@/lib/avatarPresets';
import { MergedAvatar } from './MergedAvatar';

type Tab = 'upload' | 'presets' | 'url';

export function EditAvatarModal({
  visible,
  onClose,
  currentAvatarUrl,
  name,
  onSaveAvatar,
}: {
  visible: boolean;
  onClose: () => void;
  currentAvatarUrl?: string;
  name: string;
  onSaveAvatar: (url: string) => Promise<void> | void;
}) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const C = Colors[scheme];
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [selected, setSelected] = useState(currentAvatarUrl || '');
  const [urlInput, setUrlInput] = useState((currentAvatarUrl || '').startsWith('http') ? currentAvatarUrl || '' : '');
  const [error, setError] = useState('');
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handlePick() {
    setError('');
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Photo permission denied — allow it in system settings.');
      return;
    }
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
      if (result.canceled || !result.assets?.[0]?.base64) return;
      const asset = result.assets[0];
      const mime = (asset as any).mimeType || 'image/jpeg';
      setSelected(`data:${mime};base64,${asset.base64}`);
    } finally {
      setPicking(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSaveAvatar(selected);
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
            <View style={styles.titleRow}>
              <View style={[styles.icon, { backgroundColor: C.primarySoft }]}>
                <Ionicons name="camera-outline" size={20} color={C.primary} />
              </View>
              <View>
                <Text style={[styles.title, { color: C.text }]}>Edit Profile Picture</Text>
                <Text style={[styles.sub, { color: C.textSecondary }]}>Upload a photo or choose a preset</Text>
              </View>
            </View>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={20} color={C.textSecondary} />
            </Pressable>
          </View>

          <View style={[styles.preview, { backgroundColor: C.backgroundElement, borderColor: C.border }]}>
            <MergedAvatar name={name} avatarUrl={selected} size="2xl" online />
            <Text style={[styles.previewTitle, { color: C.text }]}>
              {selected ? 'Selected Avatar Preview' : 'Initials Default Preview'}
            </Text>
            <Text style={[styles.sub, { color: C.textSecondary }]}>Shown across chats & your profile</Text>
            {!!selected && (
              <Pressable onPress={() => setSelected('')}>
                <Text style={styles.remove}>Remove custom photo</Text>
              </Pressable>
            )}
          </View>

          <View style={[styles.tabs, { backgroundColor: C.backgroundElement, borderColor: C.border }]}>
            {(['upload', 'presets', 'url'] as Tab[]).map((t) => (
              <Pressable
                key={t}
                style={[styles.tab, activeTab === t && { backgroundColor: C.card }]}
                onPress={() => setActiveTab(t)}
              >
                <Text style={[styles.tabText, { color: activeTab === t ? C.text : C.textSecondary }]}>
                  {t === 'upload' ? 'Upload' : t === 'presets' ? 'Presets' : 'Link'}
                </Text>
              </Pressable>
            ))}
          </View>

          {activeTab === 'upload' && (
            <Pressable
              style={[styles.drop, { borderColor: C.border }]}
              onPress={handlePick}
              disabled={picking}
            >
              <View style={[styles.dropIcon, { backgroundColor: C.primarySoft }]}>
                <Ionicons name="cloud-upload-outline" size={24} color={C.primary} />
              </View>
              <Text style={[styles.dropTitle, { color: C.text }]}>
                {picking ? 'Opening gallery…' : 'Tap to upload a picture'}
              </Text>
              <Text style={[styles.sub, { color: C.textSecondary }]}>PNG, JPG, or WebP. Square crop applied.</Text>
            </Pressable>
          )}

          {activeTab === 'presets' && (
            <View style={{ maxHeight: 220 }}>
              <FlatList
                data={AVATAR_PRESETS}
                numColumns={3}
                keyExtractor={(p) => p.id}
                renderItem={({ item: p }) => {
                  const isSel = selected === p.dataUri;
                  return (
                    <Pressable
                      style={[
                        styles.preset,
                        { borderColor: isSel ? C.primary : C.border, backgroundColor: isSel ? C.primarySoft : 'transparent' },
                      ]}
                      onPress={() => setSelected(p.dataUri)}
                    >
                      <Image source={{ uri: p.dataUri }} style={{ width: 48, height: 48, borderRadius: 24 }} />
                      <Text style={[styles.presetName, { color: C.text }]} numberOfLines={1}>
                        {p.name.split(' ')[0]}
                      </Text>
                    </Pressable>
                  );
                }}
              />
            </View>
          )}

          {activeTab === 'url' && (
            <View style={styles.urlRow}>
              <TextInput
                style={[styles.urlInput, { borderColor: C.border, backgroundColor: C.backgroundElement, color: C.text }]}
                placeholder="https://example.com/avatar.jpg"
                placeholderTextColor={C.textSecondary}
                value={urlInput}
                onChangeText={setUrlInput}
                autoCapitalize="none"
              />
              <Pressable style={[styles.apply, { backgroundColor: C.primary }]} onPress={() => setSelected(urlInput.trim())}>
                <Text style={styles.applyText}>Apply</Text>
              </Pressable>
            </View>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.actions}>
            <Pressable style={[styles.actionBtn, { borderColor: C.border }]} onPress={onClose}>
              <Text style={[styles.actionText, { color: C.text }]}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, { backgroundColor: C.primary }]} onPress={handleSave} disabled={saving}>
              <Text style={[styles.actionText, { color: '#fff' }]}>{saving ? 'Saving…' : 'Save Avatar'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  card: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 18, gap: 12, maxHeight: '90%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '800' },
  sub: { fontSize: 11, textAlign: 'center' },
  preview: { alignItems: 'center', borderWidth: 1, borderRadius: 16, padding: 16, gap: 4 },
  previewTitle: { fontSize: 12, fontWeight: '700' },
  remove: { fontSize: 12, color: '#ef4444', fontWeight: '700', marginTop: 4 },
  tabs: { flexDirection: 'row', borderWidth: 1, borderRadius: 12, padding: 4, gap: 4 },
  tab: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  tabText: { fontSize: 12, fontWeight: '800', textTransform: 'capitalize' },
  drop: { borderWidth: 2, borderStyle: 'dashed', borderRadius: 16, padding: 22, alignItems: 'center', gap: 6 },
  dropIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  dropTitle: { fontSize: 13, fontWeight: '800' },
  preset: { flex: 1, borderWidth: 1.5, borderRadius: 14, padding: 8, alignItems: 'center', gap: 4, margin: 4 },
  presetName: { fontSize: 11, fontWeight: '700' },
  urlRow: { flexDirection: 'row', gap: 8 },
  urlInput: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 10, fontSize: 13 },
  apply: { borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center' },
  applyText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  error: { color: '#ef4444', fontSize: 12, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 2 },
  actionBtn: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  actionText: { fontWeight: '800', fontSize: 13 },
});

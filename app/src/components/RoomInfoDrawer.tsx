import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { MergedAvatar } from './MergedAvatar';

export interface MemberInfo {
  user_id?: string;
  email: string;
  username?: string;
  avatar_url?: string;
  language: string;
  joined_at?: string;
}

export function RoomInfoDrawer({
  visible,
  onClose,
  roomId,
  title,
  description,
  avatarUrl,
  members,
  distinctLangs,
  currentEmail,
  langNames,
  onCopyCode,
  onShareLink,
  onLeaveRoom,
  isDirect = false,
  onSelectMember,
  isAdmin = false,
  creatorId,
  onSaveSettings,
}: {
  visible: boolean;
  onClose: () => void;
  roomId: string;
  title: string;
  description?: string;
  avatarUrl?: string;
  members: MemberInfo[];
  distinctLangs: string[];
  currentEmail?: string;
  langNames: Record<string, string>;
  onCopyCode: () => void;
  onShareLink: () => void;
  onLeaveRoom?: () => void;
  isDirect?: boolean;
  onSelectMember?: (userId: string) => void;
  isAdmin?: boolean;
  creatorId?: string;
  onSaveSettings?: (data: { title: string; description: string; avatarUrl: string }) => Promise<void>;
}) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const C = Colors[scheme];
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editDescription, setEditDescription] = useState(description || '');
  const [editAvatar, setEditAvatar] = useState(avatarUrl || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setEditing(false);
    setEditTitle(title);
    setEditDescription(description || '');
    setEditAvatar(avatarUrl || '');
    setError('');
  }, [roomId, title, description, avatarUrl]);

  const canEdit = isAdmin && !isDirect && !!onSaveSettings;

  async function handleAvatarPick() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Photo permission denied.');
      return;
    }
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
    setEditAvatar(`data:${mime};base64,${asset.base64}`);
  }

  async function handleSave() {
    if (!onSaveSettings || !editTitle.trim()) return;
    setSaving(true);
    setError('');
    try {
      await onSaveSettings({ title: editTitle.trim(), description: editDescription.trim(), avatarUrl: editAvatar.trim() });
      setEditing(false);
    } catch (e: any) {
      setError(e.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.header}>
            <Text style={[styles.kicker, { color: C.textSecondary }]}>{isDirect ? 'CONTACT INFO' : 'ROOM DETAILS'}</Text>
            <Pressable onPress={onClose} style={styles.x}>
              <Ionicons name="close" size={20} color={C.textSecondary} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 8 }}>
            <View style={styles.hero}>
              <MergedAvatar name={title} avatarUrl={avatarUrl} size="xl" />
              <Text style={[styles.heroTitle, { color: C.text }]}>{title}</Text>
              {!!description && <Text style={[styles.heroSub, { color: C.textSecondary }]}>{description}</Text>}
              <View style={styles.actions}>
                {!isDirect && (
                  <>
                    <Pressable style={[styles.pill, { backgroundColor: C.primarySoft }]} onPress={onShareLink}>
                      <Ionicons name="share-outline" size={14} color={C.primary} />
                      <Text style={[styles.pillText, { color: C.primary }]}>Share Invite</Text>
                    </Pressable>
                    <Pressable style={[styles.pill, { backgroundColor: C.backgroundElement, borderColor: C.border, borderWidth: 1 }]} onPress={onCopyCode}>
                      <Ionicons name="copy-outline" size={14} color={C.textSecondary} />
                      <Text style={[styles.pillText, { color: C.text }]}>Copy Code</Text>
                    </Pressable>
                  </>
                )}
                {canEdit && (
                  <Pressable
                    style={[styles.pill, editing ? { backgroundColor: C.primary } : { backgroundColor: C.backgroundElement, borderWidth: 1, borderColor: C.border }]}
                    onPress={() => setEditing((v) => !v)}
                  >
                    <Ionicons name="settings-outline" size={14} color={editing ? '#fff' : C.text} />
                    <Text style={[styles.pillText, { color: editing ? '#fff' : C.text }]}>Settings</Text>
                  </Pressable>
                )}
              </View>
            </View>

            {canEdit && editing && (
              <View style={[styles.editor, { borderColor: C.border, backgroundColor: C.backgroundElement }]}>
                <View style={styles.editorAvatarRow}>
                  <MergedAvatar name={editTitle || title} avatarUrl={editAvatar || undefined} size="lg" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.editorLabel, { color: C.text }]}>Group photo</Text>
                    <Pressable style={[styles.changePhoto, { backgroundColor: C.primarySoft }]} onPress={handleAvatarPick}>
                      <Text style={[styles.changePhotoText, { color: C.primary }]}>Change photo</Text>
                    </Pressable>
                    <Text style={[styles.hint, { color: C.textSecondary }]}>Square crop applied on pick.</Text>
                  </View>
                </View>
                <Text style={[styles.editorLabel, { color: C.textSecondary }]}>Group name</Text>
                <TextInput
                  style={[styles.editorInput, { borderColor: C.border, backgroundColor: C.card, color: C.text }]}
                  value={editTitle}
                  onChangeText={setEditTitle}
                />
                <Text style={[styles.editorLabel, { color: C.textSecondary }]}>Description</Text>
                <TextInput
                  style={[styles.editorInput, { borderColor: C.border, backgroundColor: C.card, color: C.text }]}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="What is this group about?"
                  placeholderTextColor={C.textSecondary}
                />
                {!!error && <Text style={styles.error}>{error}</Text>}
                <View style={styles.editorRow}>
                  <Pressable style={[styles.editorBtn, { borderColor: C.border, borderWidth: 1 }]} onPress={() => setEditing(false)}>
                    <Text style={[styles.editorBtnText, { color: C.text }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.editorBtn, { backgroundColor: C.primary, opacity: saving || !editTitle.trim() ? 0.6 : 1 }]}
                    onPress={handleSave}
                    disabled={saving || !editTitle.trim()}
                  >
                    <Text style={[styles.editorBtnText, { color: '#fff' }]}>{saving ? 'Saving…' : 'Save'}</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {distinctLangs.length > 0 && (
              <View>
                <Text style={[styles.section, { color: C.textSecondary }]}>ACTIVE LANGUAGES ({distinctLangs.length})</Text>
                <View style={styles.chips}>
                  {distinctLangs.map((code) => (
                    <View key={code} style={[styles.chip, { backgroundColor: C.primarySoft }]}>
                      <Text style={[styles.chipText, { color: C.primary }]}>{langNames[code] || code}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View>
              <Text style={[styles.section, { color: C.textSecondary }]}>
                {isDirect ? 'PEOPLE' : `PARTICIPANTS (${members.length})`}
              </Text>
              {members.map((m) => (
                <Pressable
                  key={m.email}
                  style={[styles.member, { borderColor: C.border, backgroundColor: C.backgroundElement }]}
                  onPress={() => m.user_id && onSelectMember?.(m.user_id)}
                >
                  <MergedAvatar name={m.username || m.email} avatarUrl={m.avatar_url} size="sm" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.memberName, { color: C.text }]} numberOfLines={1}>
                      {m.username || m.email.split('@')[0]}
                      {m.email === currentEmail ? ' (You)' : ''}
                    </Text>
                    <View style={styles.memberSubRow}>
                      <Text style={[styles.memberSub, { color: C.textSecondary }]} numberOfLines={1}>{m.email}</Text>
                      {!!creatorId && m.user_id === creatorId && (
                        <View style={styles.adminBadge}>
                          <Text style={styles.adminText}>ADMIN</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={[styles.langBadge, { backgroundColor: C.primarySoft }]}>
                    <Text style={[styles.langBadgeText, { color: C.primary }]}>{langNames[m.language] || m.language}</Text>
                  </View>
                </Pressable>
              ))}
            </View>

            {!isDirect && (
              <View>
                <Text style={[styles.section, { color: C.textSecondary }]}>ROOM UUID</Text>
                <View style={[styles.uuidBox, { backgroundColor: C.backgroundElement, borderColor: C.border }]}>
                  <Text style={[styles.uuid, { color: C.text }]}>{roomId}</Text>
                  <Pressable style={[styles.copyBtn, { backgroundColor: C.primary }]} onPress={onCopyCode}>
                    <Text style={styles.copyText}>Copy</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {!!onLeaveRoom && (
              <Pressable style={styles.leave} onPress={onLeaveRoom}>
                <Ionicons name="log-out-outline" size={16} color="#ef4444" />
                <Text style={styles.leaveText}>Leave Conversation</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  card: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 18, maxHeight: '92%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  x: { padding: 6 },
  hero: { alignItems: 'center', gap: 6, paddingBottom: 8 },
  heroTitle: { fontSize: 19, fontWeight: '800', textAlign: 'center' },
  heroSub: { fontSize: 12, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  pillText: { fontSize: 12, fontWeight: '800' },
  editor: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 8 },
  editorAvatarRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  editorLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  changePhoto: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, marginTop: 6, alignSelf: 'flex-start' },
  changePhotoText: { fontSize: 12, fontWeight: '800' },
  hint: { fontSize: 10, marginTop: 4 },
  editorInput: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 14 },
  error: { color: '#ef4444', fontSize: 12 },
  editorRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  editorBtn: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  editorBtnText: { fontWeight: '800', fontSize: 12 },
  section: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  member: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 8 },
  memberName: { fontSize: 13, fontWeight: '800' },
  memberSubRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 },
  memberSub: { fontSize: 11, flex: 1 },
  adminBadge: { backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  adminText: { fontSize: 9, fontWeight: '800', color: '#b45309' },
  langBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  langBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  uuidBox: { borderWidth: 1, borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  uuid: { flex: 1, fontSize: 11, fontFamily: 'monospace' },
  copyBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  copyText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  leave: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 12, padding: 12, marginTop: 4 },
  leaveText: { color: '#ef4444', fontWeight: '800', fontSize: 13 },
});

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { createRoom } from '../lib/api';
import { API, MINIO } from '../config';

interface CulturalFootnotes {
  humor_explanation?: string;
  idiom_breakdown?: string;
  etiquette_warning?: string;
}

function Footnotes({ footnotes }: { footnotes?: CulturalFootnotes | null }) {
  if (!footnotes) return null;
  const { humor_explanation, idiom_breakdown, etiquette_warning } = footnotes;
  if (!humor_explanation && !idiom_breakdown && !etiquette_warning) return null;

  return (
    <View style={s.fbox}>
      <Text style={s.ft}>🧠 Context:</Text>
      {humor_explanation && <Text style={s.fxt}>Humor: {humor_explanation}</Text>}
      {idiom_breakdown && <Text style={s.fxt}>Idiom: {idiom_breakdown}</Text>}
      {etiquette_warning && <Text style={s.ferr}>⚠️ {etiquette_warning}</Text>}
    </View>
  );
}

function AudioPlayer({ url }: { url: string }) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Unload the sound when this message is unmounted (e.g. scrolled out
  // in a very long list, or screen closed) to avoid leaking native buffers.
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const handlePress = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.playAsync();
        setIsPlaying(true);
        return;
      }
      setIsLoading(true);
      const { sound } = await Audio.Sound.createAsync({ uri: url });
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) setIsPlaying(false);
      });
      await sound.playAsync();
      setIsPlaying(true);
    } catch (err) {
      console.warn('[AudioPlayer] Playback failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} style={s.audioBtn} disabled={isLoading}>
      {isLoading ? (
        <ActivityIndicator size="small" color="#10b981" />
      ) : (
        <Text style={{ color: '#10b981', marginRight: 8 }}>{isPlaying ? '⏸' : '▶️'}</Text>
      )}
      <Text style={{ color: '#fff' }}>Play Voice</Text>
    </TouchableOpacity>
  );
}

export default function ChatScreen({ route }: any) {
  // Pass an existing roomId via navigation params to resume a conversation;
  // falls back to creating a new room if none was provided.
  const existingRoomId: string | undefined = route?.params?.roomId;

  const { token, user, logout } = useAuthStore();
  const {
    messages,
    drafts,
    isConnected,
    connect,
    disconnect,
    sendDraft,
    confirmDraft,
    removeDraft,
    updateDraftTranslation,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [roomId, setRoomId] = useState<string | null>(existingRoomId ?? null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!token || !user) return;
      setIsInitializing(true);
      setInitError(null);

      try {
        let id = existingRoomId;
        if (!id) {
          const room = await createRoom(token, 'Room', 'es');
          id = room.id;
        }
        if (cancelled || !id) return;
        setRoomId(id);
        connect(id, token, user.email);
      } catch (err: any) {
        if (cancelled) return;
        console.error('[ChatScreen] Failed to initialize room:', err);
        setInitError(err?.message ?? 'Could not start the chat. Please try again.');
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    };

    init();
    return () => {
      cancelled = true;
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingRoomId]);

  // Stop any in-progress recording if the screen unmounts.
  useEffect(() => {
    return () => {
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length, drafts.length]);

  const startRecording = useCallback(async () => {
    setRecordingError(null);
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setRecordingError('Microphone permission is required to record voice messages.');
        return;
      }

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err) {
      console.error('[ChatScreen] Failed to start recording:', err);
      setRecordingError('Could not start recording. Please try again.');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    const recording = recordingRef.current;
    setIsRecording(false);
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      // Reset audio mode so subsequent playback (voice message replies)
      // isn't stuck in "recording" behavior on iOS.
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });

      const uri = recording.getURI();
      if (!uri || !token || !roomId) return;

      setIsUploadingAudio(true);
      const formData = new FormData();
      formData.append('file', { uri, name: 'recording.m4a', type: 'audio/m4a' } as any);
      formData.append('room_id', roomId);

      const res = await fetch(`${API}/audio/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
    } catch (err) {
      console.error('[ChatScreen] Recording/upload failed:', err);
      setRecordingError('Voice message failed to send. Please try again.');
    } finally {
      recordingRef.current = null;
      setIsUploadingAudio(false);
    }
  }, [token, roomId]);

  const handleSendDraft = () => {
    if (input.trim() && isConnected) {
      sendDraft(input.trim());
      setInput('');
    }
  };

  const handleLogout = () => {
    disconnect();
    logout();
  };

  if (isInitializing) {
    return (
      <SafeAreaView style={[s.c, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#2563eb" size="large" />
        <Text style={{ color: '#9ca3af', marginTop: 12 }}>Starting chat...</Text>
      </SafeAreaView>
    );
  }

  if (initError) {
    return (
      <SafeAreaView style={[s.c, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={{ color: '#f87171', textAlign: 'center', marginBottom: 16 }}>{initError}</Text>
        <TouchableOpacity style={s.sb} onPress={() => setRoomId(null)}>
          <Text style={s.st}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.c} edges={['top', 'left', 'right']}>
      <View style={s.h}>
        <Text style={s.ht}>AI: {isConnected ? 'Ready' : 'Off'}</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={s.lo}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView ref={scrollRef} style={s.l} contentContainerStyle={{ paddingBottom: 100 }}>
        {messages.map((m) => (
          <View key={m.id} style={[s.bc, m.is_me ? s.mc : s.tc]}>
            <View style={[s.b, m.is_me ? s.mb : s.tb]}>
              {!m.is_me && <Text style={s.senderLabel}>{m.sender_email}</Text>}
              {m.tts_url && <AudioPlayer url={`${MINIO}/${m.tts_url}`} />}
              <Text style={s.t}>{m.original_text}</Text>
              {m.translated_text && (
                <View style={s.tbox}>
                  <Text style={s.tt}>{m.translated_text}</Text>
                  <Footnotes footnotes={m.cultural_footnotes as CulturalFootnotes | undefined} />
                </View>
              )}
            </View>
          </View>
        ))}

        {drafts.map((d) => (
          <View key={d.id} style={s.dc}>
            <Text style={s.dl}>Drafting...</Text>
            <Text style={s.ot}>Original: {d.original_text}</Text>
            <TextInput
              multiline
              value={d.translated_text || ''}
              onChangeText={(t) => updateDraftTranslation(d.id, t)}
              style={s.di}
            />
            <Footnotes footnotes={d.cultural_footnotes as CulturalFootnotes | undefined} />
            <View style={s.db}>
              <TouchableOpacity onPress={() => confirmDraft(d.id, d.translated_text || '')} style={s.cb}>
                <Text style={s.bt}>Send</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeDraft(d.id)} style={s.xb}>
                <Text style={s.bt}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {recordingError && (
        <View style={{ backgroundColor: '#7f1d1d', padding: 8 }}>
          <Text style={{ color: '#fecaca', fontSize: 12, textAlign: 'center' }}>{recordingError}</Text>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
        <View style={s.ic}>
          <TextInput
            style={s.i}
            value={input}
            onChangeText={setInput}
            placeholder="Draft..."
            placeholderTextColor="#9ca3af"
            editable={isConnected}
          />
          <TouchableOpacity style={s.sb} onPress={handleSendDraft} disabled={!isConnected || !input.trim()}>
            <Text style={s.st}>Draft</Text>
          </TouchableOpacity>
          {isRecording ? (
            <TouchableOpacity style={[s.sb, { backgroundColor: '#dc2626' }]} onPress={stopRecording}>
              <Text style={s.st}>⏹</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[s.sb, { backgroundColor: '#9333ea' }]}
              onPress={startRecording}
              disabled={!isConnected || isUploadingAudio}
            >
              {isUploadingAudio ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.st}>🎤</Text>}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#111827' },
  h: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#374151' },
  ht: { color: '#10b981', fontWeight: 'bold' },
  lo: { color: '#ef4444' },
  l: { flex: 1, padding: 15 },
  bc: { marginBottom: 15 },
  mc: { alignItems: 'flex-end' },
  tc: { alignItems: 'flex-start' },
  b: { maxWidth: '85%', padding: 12, borderRadius: 12 },
  mb: { backgroundColor: '#2563eb' },
  tb: { backgroundColor: '#374151' },
  senderLabel: { color: '#9ca3af', fontSize: 11, fontWeight: '600', marginBottom: 4 },
  t: { color: '#fff', fontSize: 16 },
  tbox: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  tt: { color: '#86efac', fontStyle: 'italic', marginBottom: 4 },
  fbox: { marginTop: 8, backgroundColor: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 6 },
  ft: { color: '#facc15', fontWeight: 'bold', fontSize: 12, marginBottom: 4 },
  fxt: { color: '#d1d5db', fontSize: 11, marginBottom: 2 },
  ferr: { color: '#f87171', fontSize: 11, fontWeight: 'bold', marginTop: 2 },
  dc: { backgroundColor: '#422006', borderStyle: 'dashed', borderWidth: 1, borderColor: '#ca8a04', padding: 12, borderRadius: 12, marginBottom: 15 },
  dl: { color: '#fde047', fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  ot: { color: '#d1d5db', fontSize: 12, fontStyle: 'italic', marginBottom: 8 },
  di: { backgroundColor: '#1f2937', color: '#fff', padding: 10, borderRadius: 6, minHeight: 60, textAlignVertical: 'top', marginBottom: 8 },
  db: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cb: { flex: 1, backgroundColor: '#16a34a', padding: 10, borderRadius: 6, alignItems: 'center' },
  xb: { flex: 1, backgroundColor: '#dc2626', padding: 10, borderRadius: 6, alignItems: 'center' },
  bt: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  ic: { flexDirection: 'row', padding: 15, backgroundColor: '#1f2937', borderTopWidth: 1, borderTopColor: '#374151' },
  i: { flex: 1, backgroundColor: '#374151', color: '#fff', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10 },
  sb: { backgroundColor: '#2563eb', paddingHorizontal: 20, justifyContent: 'center', borderRadius: 20, marginLeft: 5 },
  st: { color: '#fff', fontWeight: 'bold' },
  audioBtn: { backgroundColor: '#1f2937', padding: 10, borderRadius: 8, marginBottom: 8, flexDirection: 'row' },
});
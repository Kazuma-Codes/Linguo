import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, mediaDevices } from 'react-native-webrtc';
import { Audio } from 'expo-av';
import { useAuthStore } from '../store/useAuthStore';
import { WS, MINIO } from '../config';

type Status = 'connecting' | 'listening' | 'error' | 'ended';

export default function LiveScreen({ route, navigation }: any) {
  const { roomId } = route.params;
  const { token } = useAuthStore();

  const [status, setStatus] = useState<Status>('connecting');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [text, setText] = useState('');

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<any>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const statusLabel: Record<Status, string> = {
    connecting: 'Connecting...',
    listening: 'Listening...',
    error: 'Connection failed',
    ended: 'Session ended',
  };

  const cleanup = useCallback(() => {
    streamRef.current?.getTracks().forEach((t: any) => t.stop());
    streamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    soundRef.current?.unloadAsync().catch(() => {});
    soundRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const wsUrl = WS.replace('/ws/chat', '/webrtc/ws/live');
    const ws = new WebSocket(`${wsUrl}/${roomId}?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onmessage = async (e) => {
      let msg: any;
      try {
        msg = JSON.parse(e.data);
      } catch {
        console.warn('[LiveScreen] Non-JSON WS message:', e.data);
        return;
      }

      if (msg.type === 'answer') {
        await pcRef.current?.setRemoteDescription(new RTCSessionDescription(msg));
      } else if (msg.type === 'candidate' && msg.candidate) {
        try {
          await pcRef.current?.addIceCandidate(new RTCIceCandidate(msg.candidate));
        } catch (err) {
          console.warn('[LiveScreen] Failed to add ICE candidate:', err);
        }
      } else if (msg.type === 'live_audio_response') {
        setText(msg.text ?? '');
        if (msg.tts_url) {
          try {
            if (soundRef.current) {
              await soundRef.current.unloadAsync();
              soundRef.current = null;
            }
            await Audio.setAudioModeAsync({
              allowsRecordingIOS: false,
              playsInSilentModeIOS: true,
            });
            const { sound } = await Audio.Sound.createAsync({ uri: `${MINIO}/${msg.tts_url}` });
            soundRef.current = sound;
            await sound.playAsync();
          } catch (err) {
            console.warn('[LiveScreen] Failed to play response audio:', err);
          }
        }
      } else if (msg.type === 'error') {
        setErrorMsg(msg.detail ?? 'Server reported an error.');
      }
    };

    ws.onerror = () => {
      if (cancelled) return;
      setStatus('error');
      setErrorMsg('Connection error. Please check your network and try again.');
    };

    ws.onclose = () => {
      if (cancelled) return;
      setStatus((prev) => (prev === 'error' ? prev : 'ended'));
    };

    const start = async () => {
      try {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        pcRef.current = pc;

        pc.onicecandidate = (e: any) => {
          if (e.candidate && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'candidate', candidate: e.candidate }));
          }
        };

        (pc as any).onconnectionstatechange = () => {
          if (cancelled) return;
          const state = (pc as any).connectionState;
          if (state === 'failed' || state === 'disconnected') {
            setStatus('error');
            setErrorMsg('Call connection lost.');
          }
        };

        const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
        if (cancelled) {
          stream.getTracks().forEach((t: any) => t.stop());
          return;
        }
        streamRef.current = stream;
        stream.getTracks().forEach((t: any) => pc.addTrack(t, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ws.send(JSON.stringify({ type: 'offer', sdp: offer.sdp }));

        if (!cancelled) setStatus('listening');
      } catch (err: any) {
        if (cancelled) return;
        console.error('[LiveScreen] Failed to start call:', err);
        setStatus('error');
        setErrorMsg(
          err?.message?.includes('Permission')
            ? 'Microphone permission is required for live interpretation.'
            : 'Could not start the call. Please try again.'
        );
      }
    };

    ws.onopen = start;

    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, token]);

  const handleEnd = () => {
    cleanup();
    setStatus('ended');
    navigation.goBack();
  };

  return (
    <SafeAreaView style={s.c}>
      <Text style={s.t}>Live Interpreter</Text>

      <View style={[s.o, status === 'listening' ? s.oa : status === 'error' ? s.oe : s.oi]} />

      <Text style={s.st}>{statusLabel[status]}</Text>
      {errorMsg && <Text style={s.err}>{errorMsg}</Text>}

      <View style={s.tb}>
        <Text style={s.l}>AI:</Text>
        <Text style={s.txt}>{text || 'Waiting...'}</Text>
      </View>

      <TouchableOpacity style={s.eb} onPress={handleEnd}>
        <Text style={s.et}>End Session</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#111827', alignItems: 'center', padding: 20 },
  t: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 40 },
  o: { width: 150, height: 150, borderRadius: 75, marginBottom: 40 },
  oa: { backgroundColor: '#10b981' },
  oi: { backgroundColor: '#374151' },
  oe: { backgroundColor: '#dc2626' },
  st: { color: '#fff', fontSize: 18, marginBottom: 8 },
  err: { color: '#f87171', fontSize: 13, marginBottom: 32, textAlign: 'center' },
  tb: { backgroundColor: '#1f2937', padding: 20, borderRadius: 12, width: '100%' },
  l: { color: '#9ca3af', fontSize: 12, marginBottom: 8 },
  txt: { color: '#86efac', fontSize: 18 },
  eb: { marginTop: 40, backgroundColor: '#dc2626', padding: 15, borderRadius: 8, width: '100%', alignItems: 'center' },
  et: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
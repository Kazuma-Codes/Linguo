"use client";
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { WS_BASE_URL, MINIO_BASE_URL } from '@/config';

type Status = 'connecting' | 'listening' | 'error' | 'ended';

/**
 * Live interpreter page — establishes a WebRTC connection to stream the
 * user's microphone audio to the server, which transcribes, translates,
 * and returns a TTS audio response.
 */
export default function LiveRoomPage() {
  const params = useParams();
  const roomId = params.room as string;
  const { token } = useAuthStore();
  const router = useRouter();

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [status, setStatus] = useState<Status>('connecting');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [text, setText] = useState('');

  const statusLabel: Record<Status, string> = {
    connecting: 'Connecting...',
    listening: 'Listening...',
    error: 'Connection failed',
    ended: 'Call ended',
  };

  /** Stop all tracks, close the peer connection and WebSocket. */
  const cleanup = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  useEffect(() => {
    if (!token || !roomId) {
      router.push('/');
      return;
    }

    let cancelled = false;

    const ws = new WebSocket(
      `${WS_BASE_URL}/api/v1/webrtc/ws/live/${roomId}?token=${encodeURIComponent(token)}`,
    );
    wsRef.current = ws;

    ws.onmessage = async (e) => {
      let msg: {
        type?: string;
        candidate?: RTCIceCandidateInit;
        text?: string;
        tts_url?: string;
        detail?: string;
      };
      try {
        msg = JSON.parse(e.data);
      } catch {
        console.warn('[LiveRoom] Non-JSON WS message:', e.data);
        return;
      }

      if (msg.type === 'answer') {
        await pcRef.current?.setRemoteDescription(
          new RTCSessionDescription(msg as RTCSessionDescriptionInit),
        );
      } else if (msg.type === 'candidate' && msg.candidate) {
        // Remote ICE candidates must be applied or the connection can
        // silently fail to establish on many networks.
        try {
          await pcRef.current?.addIceCandidate(new RTCIceCandidate(msg.candidate));
        } catch (err) {
          console.warn('[LiveRoom] Failed to add ICE candidate:', err);
        }
      } else if (msg.type === 'live_audio_response') {
        setText(msg.text ?? '');
        if (audioRef.current && msg.tts_url) {
          audioRef.current.src = `${MINIO_BASE_URL}/${msg.tts_url}`;
          audioRef.current.play().catch((err) => {
            // Autoplay may be blocked by the browser; not fatal, user can hit play.
            console.warn('[LiveRoom] Autoplay blocked:', err);
          });
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

        pc.onicecandidate = (e) => {
          if (e.candidate && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'candidate', candidate: e.candidate }));
          }
        };

        pc.onconnectionstatechange = () => {
          if (cancelled) return;
          if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            setStatus('error');
            setErrorMsg('Call connection lost.');
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ws.send(JSON.stringify({ type: 'offer', sdp: offer.sdp }));

        if (!cancelled) setStatus('listening');
      } catch (err) {
        if (cancelled) return;
        console.error('[LiveRoom] Failed to start call:', err);
        setStatus('error');
        const error = err as Error;
        setErrorMsg(
          error?.name === 'NotAllowedError'
            ? 'Microphone access denied. Please allow mic access and reload.'
            : 'Could not start the call. Please try again.',
        );
      }
    };

    ws.onopen = start;

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [roomId, token, router, cleanup]);

  const handleEnd = () => {
    cleanup();
    setStatus('ended');
    router.push('/');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl mb-8">Live Interpreter</h1>

      <div
        className={`w-32 h-32 rounded-full mb-8 flex items-center justify-center text-4xl ${
          status === 'listening'
            ? 'bg-green-500 animate-pulse'
            : status === 'error'
              ? 'bg-red-600'
              : 'bg-gray-700'
        }`}
      >
        🎤
      </div>

      <p className="text-xl mb-2">{statusLabel[status]}</p>
      {errorMsg && <p className="text-sm text-red-400 mb-6 text-center max-w-sm">{errorMsg}</p>}

      <div className="bg-gray-800 p-6 rounded w-full max-w-md min-h-[100px]">
        <p className="text-gray-400 mb-2">AI:</p>
        <p className="text-lg text-green-300">{text || 'Waiting...'}</p>
        <audio ref={audioRef} controls className="w-full mt-4" />
      </div>

      <button
        onClick={handleEnd}
        className="mt-8 bg-red-600 hover:bg-red-700 px-6 py-2 rounded"
      >
        End
      </button>
    </div>
  );
}

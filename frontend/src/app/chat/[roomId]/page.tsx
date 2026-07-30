"use client";
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';

const MINIO_URL = process.env.NEXT_PUBLIC_MINIO_URL ?? 'http://localhost:9000';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

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
    <div className="mt-2 text-xs bg-black/20 p-2 rounded space-y-1">
      <p className="font-bold text-yellow-400">🧠 Context</p>
      {humor_explanation && <p>Humor: {humor_explanation}</p>}
      {idiom_breakdown && <p>Idiom: {idiom_breakdown}</p>}
      {etiquette_warning && <p className="text-red-400">⚠️ {etiquette_warning}</p>}
    </div>
  );
}

function ConnectionStatus({ isConnected }: { isConnected: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-400">
      <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
      {isConnected ? 'Connected' : 'Connecting...'}
    </div>
  );
}

export default function ChatRoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const router = useRouter();

  const { token, user, logout,hasHydrated } = useAuthStore();
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
  // const [isRecording, setIsRecording] = useState(false);
  // const [recordingError, setRecordingError] = useState<string | null>(null);
  // const [isUploadingAudio, setIsUploadingAudio] = useState(false);

  // const recorderRef = useRef<MediaRecorder | null>(null);
  // const chunksRef = useRef<Blob[]>([]);
  // const streamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Redirect if not authenticated, then connect the socket for this room.
  useEffect(() => {
    if (!hasHydrated) return;

    if (!token || !user) {
      router.push('/');
      return;
    }
    connect(roomId, token, user.email);
    return () => disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, hasHydrated, token]);

  // Auto-scroll to the latest message/draft.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, drafts.length]);

  // Clean up any live mic stream if the component unmounts mid-recording.
  // useEffect(() => {
  //   return () => {
  //     streamRef.current?.getTracks().forEach((t) => t.stop());
  //   };
  // }, []);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !isConnected) return;
    sendDraft(trimmed);
    setInput('');
  };

  // const startRecording = useCallback(async () => {
  //   setRecordingError(null);
  //   try {
  //     const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  //     streamRef.current = stream;

  //     const recorder = new MediaRecorder(stream);
  //     recorderRef.current = recorder;
  //     chunksRef.current = [];

  //     recorder.ondataavailable = (e) => {
  //       if (e.data.size > 0) chunksRef.current.push(e.data);
  //     };

  //     recorder.onstop = async () => {
  //       stream.getTracks().forEach((t) => t.stop());
  //       streamRef.current = null;

  //       const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
  //       if (blob.size === 0) return;

  //       setIsUploadingAudio(true);
  //       try {
  //         const formData = new FormData();
  //         formData.append('file', blob, 'recording.webm');
  //         formData.append('room_id', roomId);

  //         const res = await fetch(`${API_URL}/audio/upload`, {
  //           method: 'POST',
  //           headers: { Authorization: `Bearer ${token}` },
  //           body: formData,
  //         });

  //         if (!res.ok) {
  //           throw new Error(`Upload failed (${res.status})`);
  //         }
  //       } catch (err) {
  //         console.error('[ChatRoom] Audio upload failed:', err);
  //         setRecordingError('Voice message failed to upload. Please try again.');
  //       } finally {
  //         setIsUploadingAudio(false);
  //       }
  //     };

  //     recorder.start();
  //     setIsRecording(true);
  //   } catch (err) {
  //     console.error('[ChatRoom] Mic access failed:', err);
  //     setRecordingError('Microphone access denied or unavailable.');
  //   }
  // }, [roomId, token]);

  // const stopRecording = useCallback(() => {
  //   recorderRef.current?.stop();
  //   setIsRecording(false);
  // }, []);

  const handleLogout = () => {
    disconnect();
    logout();
    router.push('/');
  };

  if (!hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 p-4 flex justify-between items-center border-b border-gray-700">
        <div>
          <h1 className="font-bold text-lg">Room</h1>
          <ConnectionStatus isConnected={isConnected} />
        </div>
        <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-300">
          Logout
        </button>
      </header>

      {/* Messages + drafts */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && drafts.length === 0 && (
          <p className="text-center text-gray-500 text-sm mt-8">No messages yet — say hello 👋</p>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.is_me ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-lg ${m.is_me ? 'bg-blue-600' : 'bg-gray-700'}`}>
              {!m.is_me && <p className="text-xs font-semibold mb-1 opacity-70">{m.sender_email}</p>}

              {/*m.tts_url && (
                <audio controls src={`${MINIO_URL}/${m.tts_url}`} className="w-full mb-2 h-8" />
              )*/}

              <p>{m.original_text}</p>

              {m.translated_text && (
                <div className="mt-2 pt-2 border-t border-white/20">
                  {m.detected_lang && (
                    <p className="text-xs text-gray-300 italic">Detected: {m.detected_lang}</p>
                  )}
                  <p className="text-green-200 text-sm">{m.translated_text}</p>
                  <Footnotes footnotes={m.cultural_footnotes as CulturalFootnotes | undefined} />
                </div>
              )}
            </div>
          </div>
        ))}

        {drafts.map((d) => (
          <div key={d.id} className="flex justify-end">
            <div className="max-w-[80%] p-3 rounded-lg bg-yellow-900/40 border border-yellow-500">
              <p className="text-xs text-yellow-200 mb-1">Drafting...</p>
              <p className="text-sm italic text-gray-300">Original: {d.original_text}</p>

              <textarea
                value={d.translated_text ?? ''}
                onChange={(e) => updateDraftTranslation(d.id, e.target.value)}
                className="w-full bg-gray-800 p-2 rounded text-sm my-2 resize-none"
                rows={2}
                placeholder="Edit translation before sending..."
              />

              <Footnotes footnotes={d.cultural_footnotes as CulturalFootnotes | undefined} />

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => confirmDraft(d.id, d.translated_text ?? '')}
                  className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm"
                >
                  Send
                </button>
                <button
                  onClick={() => removeDraft(d.id)}
                  className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Recording error banner */}
      {/*recordingError && (
        <div className="bg-red-900/60 text-red-200 text-xs px-4 py-2 text-center">
          {recordingError}
        </div>
      )*/}

      {/* Composer */}
      <form onSubmit={handleSend} className="p-4 bg-gray-800 border-t border-gray-700 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isConnected ? 'Type a message...' : 'Connecting...'}
          disabled={!isConnected}
          className="flex-1 bg-gray-700 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={!isConnected || !input.trim()}
          className="bg-blue-600 hover:bg-blue-700 px-6 rounded-lg font-semibold disabled:opacity-50"
        >
          Draft
        </button>

        {/*isRecording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="bg-red-600 px-4 rounded-lg animate-pulse"
            title="Stop recording"
          >
            ⏹
          </button>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            disabled={!isConnected || isUploadingAudio}
            className="bg-purple-600 hover:bg-purple-700 px-4 rounded-lg disabled:opacity-50"
            title="Record voice message"
          >
            {isUploadingAudio ? '⏳' : '🎤'}
          </button>
        )*/}
      </form>
    </div>
  );
}
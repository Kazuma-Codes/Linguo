"use client";
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';

/** Cultural context notes shown alongside translated messages. */
interface CulturalFootnotes {
  humor_explanation?: string;
  idiom_breakdown?: string;
  etiquette_warning?: string;
}

/** Renders cultural footnotes (humor, idiom, etiquette) if any are present. */
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

/** Small connection status indicator (green/red dot + label). */
function ConnectionStatus({ isConnected }: { isConnected: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-400">
      <span
        className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'
        }`}
      />
      {isConnected ? 'Connected' : 'Connecting...'}
    </div>
  );
}

export default function ChatRoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const router = useRouter();

  const { token, user, logout, hasHydrated } = useAuthStore();
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
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Redirect to login if not authenticated, then connect the socket for this room.
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

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !isConnected) return;
    sendDraft(trimmed);
    setInput('');
  };

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
              {!m.is_me && (
                <p className="text-xs font-semibold mb-1 opacity-70">{m.sender_email}</p>
              )}

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

        {drafts.map((d) => {
          const isTranslating = d.translated_text === null || d.translated_text === undefined;

          return (
            <div key={d.id} className="flex justify-end">
              <div className="max-w-[80%] p-3 rounded-lg bg-yellow-900/40 border border-yellow-500">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-yellow-200">Drafting...</p>
                  {isTranslating && (
                    <span className="text-xs text-yellow-400 animate-pulse flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-ping" />
                      Translating...
                    </span>
                  )}
                </div>

                <p className="text-sm italic text-gray-300">Original: {d.original_text}</p>

                <textarea
                  value={d.translated_text ?? ''}
                  onChange={(e) => updateDraftTranslation(d.id, e.target.value)}
                  disabled={isTranslating}
                  className="w-full bg-gray-800 p-2 rounded text-sm my-2 resize-none disabled:opacity-50"
                  rows={2}
                  placeholder={isTranslating ? "Translating with Groq..." : "Edit translation before sending..."}
                />

                <Footnotes footnotes={d.cultural_footnotes as CulturalFootnotes | undefined} />

                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => confirmDraft(d.id, d.translated_text ?? d.original_text)}
                    disabled={isTranslating}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1 rounded text-sm font-medium"
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
          );
        })}

        <div ref={messagesEndRef} />
      </div>

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
      </form>
    </div>
  );
}

"use client";
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import { getRoom, setMyLanguage } from '@/lib/api';

const LANG_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  es: 'Spanish',
  fr: 'French',
  ja: 'Japanese',
  ru: 'Russian',
  ar: 'Arabic',
  zh: 'Chinese',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ko: 'Korean',
};

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
    sendMessage,
    removeDraft,
    updateDraftTranslation,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [myLang, setMyLang] = useState<string>('en');
  const [roomLangs, setRoomLangs] = useState<string[]>(['en', 'hi']);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!token || !user) {
      router.push(`/?redirect=${encodeURIComponent(`/chat/${roomId}`)}`);
      return;
    }

    // Fetch room metadata and current language seat
    getRoom(token, roomId)
        .then((roomData) => {
          if (roomData) {
            const src = roomData.source_lang || 'en';
            const tgt = roomData.target_lang || 'hi';
            setRoomLangs([src, tgt]);
            if (roomData.my_language) {
              setMyLang(roomData.my_language);
            }
          }
        })
        .catch(console.error);

    connect(roomId, token, user.email);
    return () => disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, hasHydrated, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, drafts.length]);

  const handleToggleLanguage = async (newLang: string) => {
    if (!token || newLang === myLang) return;
    try {
      await setMyLanguage(token, roomId, newLang);
      setMyLang(newLang);
    } catch (err) {
      console.error('Failed to change language seat:', err);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !isConnected) return;
    sendMessage(trimmed);
    setInput('');
  };

  const handleDraft = (e: React.MouseEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !isConnected) return;
    sendDraft(trimmed);
    setInput('');
  };

  const handleCopyLink = async () => {
    try {
      const inviteUrl = `${window.location.origin}/chat/${roomId}`;
      await navigator.clipboard.writeText(inviteUrl);
      setCopyFeedback('Invite Link Copied!');
      setTimeout(() => setCopyFeedback(null), 2500);
    } catch {
      setCopyFeedback('Failed to copy');
      setTimeout(() => setCopyFeedback(null), 2500);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopyFeedback('Room Code Copied!');
      setTimeout(() => setCopyFeedback(null), 2500);
    } catch {
      setCopyFeedback('Failed to copy');
      setTimeout(() => setCopyFeedback(null), 2500);
    }
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
      <div className="flex flex-col h-screen max-w-3xl mx-auto bg-gray-900 text-white">
        {/* Header */}
        <header className="bg-gray-800 p-3 sm:p-4 flex flex-wrap gap-2 justify-between items-center border-b border-gray-700">
          <div className="flex items-center gap-3">
            <button
                onClick={() => router.push('/')}
                className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
                title="Back to Dashboard"
            >
              ← Back
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg">Chat Room</h1>
                <ConnectionStatus isConnected={isConnected} />
              </div>
              <p className="text-xs text-gray-400 font-mono truncate max-w-[180px] sm:max-w-xs" title={roomId}>
                ID: {roomId}
              </p>
            </div>
          </div>

          {/* Seat / Language Selector */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-xs">
              <span className="text-gray-400 mr-1.5">Speaking:</span>
              <select
                  value={myLang}
                  onChange={(e) => handleToggleLanguage(e.target.value)}
                  className="bg-transparent text-blue-400 font-medium outline-none cursor-pointer"
              >
                {roomLangs.map((lang) => (
                    <option key={lang} value={lang} className="bg-gray-800 text-white">
                      {LANG_NAMES[lang] || lang.toUpperCase()}
                    </option>
                ))}
              </select>
            </div>

            {copyFeedback && (
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded border border-green-500/30 animate-pulse">
              {copyFeedback}
            </span>
            )}
            <button
                onClick={handleCopyLink}
                className="text-xs bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                title="Copy Shareable Invite Link"
            >
              🔗 Share
            </button>
            <button
                onClick={handleCopyCode}
                className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                title="Copy Room Code"
            >
              📋 Code
            </button>
            <button onClick={handleLogout} className="text-xs text-red-400 hover:text-red-300 ml-1">
              Logout
            </button>
          </div>
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
                            <p className="text-xs text-gray-300 italic">
                              Language: {LANG_NAMES[m.detected_lang] || m.detected_lang}
                            </p>
                        )}
                        <p className="text-green-200 text-sm font-medium">{m.translated_text}</p>
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
                      <p className="text-xs text-yellow-200">Draft Translation</p>
                      {isTranslating && (
                          <span className="text-xs text-yellow-400 animate-pulse flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-ping" />
                      Translating with Groq...
                    </span>
                      )}
                    </div>

                    <p className="text-sm italic text-gray-300">Original: {d.original_text}</p>

                    <textarea
                        value={d.translated_text ?? ''}
                        onChange={(e) => updateDraftTranslation(d.id, e.target.value)}
                        className="w-full bg-gray-800 p-2 rounded text-sm my-2 resize-none text-white focus:outline-none focus:ring-1 focus:ring-yellow-500"
                        rows={2}
                        placeholder={isTranslating ? "Translating with Groq... (or type your translation)" : "Edit translation before sending..."}
                    />

                    <Footnotes footnotes={d.cultural_footnotes as CulturalFootnotes | undefined} />

                    <div className="flex flex-wrap gap-2 mt-2">
                      <button
                          onClick={() => confirmDraft(d.id, d.translated_text || d.original_text)}
                          className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm font-medium transition-colors"
                          title="Send the translated (or edited) message"
                      >
                        Send
                      </button>
                      <button
                          onClick={() => confirmDraft(d.id, d.original_text)}
                          className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm text-gray-200 transition-colors"
                          title="Send original untranslated text"
                      >
                        Send Original
                      </button>
                      <button
                          onClick={() => removeDraft(d.id)}
                          className="bg-red-600/80 hover:bg-red-700 px-3 py-1 rounded text-sm transition-colors"
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
              placeholder={
                isConnected
                    ? `Type in ${LANG_NAMES[myLang] || myLang}... (Enter to Send)`
                    : 'Connecting...'
              }
              disabled={!isConnected}
              className="flex-1 bg-gray-700 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-sm sm:text-base"
          />

          <button
              type="submit"
              disabled={!isConnected || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 px-4 sm:px-5 rounded-lg font-semibold disabled:opacity-50 transition-colors text-sm"
              title="Send directly without translating"
          >
            Send
          </button>

          <button
              type="button"
              onClick={handleDraft}
              disabled={!isConnected || !input.trim()}
              className="bg-purple-600 hover:bg-purple-700 px-4 rounded-lg font-medium disabled:opacity-50 transition-colors text-sm flex items-center gap-1"
              title="Translate with Groq and preview before sending"
          >
            ✨ Translate
          </button>
        </form>
      </div>
  );
}
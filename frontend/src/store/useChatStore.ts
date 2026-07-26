import { create } from 'zustand';

export interface CulturalFootnotes {
  humor_explanation?: string;
  idiom_breakdown?: string;
  etiquette_warning?: string;
}

export interface Message {
  id: string;
  sender_email: string;
  original_text: string;
  translated_text?: string | null;
  detected_lang?: string;
  cultural_footnotes?: CulturalFootnotes | null;
  is_me: boolean;
  status: 'draft' | 'final';
  tts_url?: string | null;
  audio_url?: string | null;
}

// Shape of messages coming FROM the server over the socket.
// Keeping this separate from `Message` avoids silently trusting
// unvalidated JSON as if it already matched our internal type.
interface IncomingWSMessage {
  type: 'draft_ready' | 'message_finalized' | 'voice_finalized' | 'translation_update' | string;
  id: string;
  sender_email: string;
  text?: string;
  translated_text?: string | null;
  detected_lang?: string;
  cultural_footnotes?: CulturalFootnotes | null;
  tts_url?: string | null;
  audio_url?: string | null;
}

interface ChatState {
  messages: Message[];
  drafts: Message[];
  ws: WebSocket | null;
  isConnected: boolean;
  connectionError: string | null;

  addFinalizedMessage: (m: Message) => void;
  addOrUpdateDraft: (m: Message) => void;
  removeDraft: (id: string) => void;
  updateDraftTranslation: (id: string, translated: string, lang?: string) => void;

  connect: (roomId: string, token: string, myEmail: string) => void;
  disconnect: () => void;

  sendDraft: (text: string) => void;
  confirmDraft: (id: string, editedText: string) => void;
}

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000';

// Keep a handle to any pending reconnect so disconnect() can cancel it
// and we never end up with two sockets racing each other.
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  drafts: [],
  ws: null,
  isConnected: false,
  connectionError: null,

  addFinalizedMessage: (m) =>
    set((s) => ({
      messages: [...s.messages, m],
      drafts: s.drafts.filter((d) => d.id !== m.id),
    })),

  addOrUpdateDraft: (m) =>
    set((s) => {
      const exists = s.drafts.some((d) => d.id === m.id);
      return exists
        ? { drafts: s.drafts.map((d) => (d.id === m.id ? m : d)) }
        : { drafts: [...s.drafts, m] };
    }),

  removeDraft: (id) =>
    set((s) => ({ drafts: s.drafts.filter((d) => d.id !== id) })),

  updateDraftTranslation: (id, translated, lang) =>
    set((s) => ({
      drafts: s.drafts.map((d) =>
        d.id === id
          ? { ...d, translated_text: translated, detected_lang: lang ?? d.detected_lang }
          : d
      ),
    })),

  connect: (roomId, token, myEmail) => {
    // Avoid opening a duplicate socket if already connected
    const existing = get().ws;
    if (existing && existing.readyState === WebSocket.OPEN) return;

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    const wsUrl = `${WS_BASE_URL}/api/v1/ws/chat/${roomId}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      set({ isConnected: true, connectionError: null });
    };

    ws.onmessage = (event) => {
      let data: IncomingWSMessage;
      try {
        data = JSON.parse(event.data);
      } catch {
        console.warn('[chatStore] Received non-JSON WS message:', event.data);
        return;
      }

      switch (data.type) {
        case 'draft_ready': {
          // Only track drafts for messages I'm sending — other users'
          // in-progress drafts aren't rendered.
          if (data.sender_email === myEmail) {
            get().addOrUpdateDraft({
              id: data.id,
              sender_email: data.sender_email,
              original_text: data.text ?? '',
              translated_text: data.translated_text ?? null,
              detected_lang: data.detected_lang,
              cultural_footnotes: data.cultural_footnotes ?? null,
              is_me: true,
              status: 'draft',
            });
          }
          break;
        }

        case 'message_finalized':
        case 'voice_finalized': {
          get().addFinalizedMessage({
            id: data.id,
            sender_email: data.sender_email,
            original_text: data.text ?? '',
            translated_text: data.translated_text ?? null,
            detected_lang: data.detected_lang,
            cultural_footnotes: data.cultural_footnotes ?? null,
            is_me: data.sender_email === myEmail,
            status: 'final',
            tts_url: data.tts_url ?? null,
            audio_url: data.audio_url ?? null,
          });
          break;
        }

        // Kept for backward compatibility with the older protocol,
        // in case the backend still emits this for translation-only updates.
        case 'translation_update': {
          get().updateDraftTranslation(data.id, data.translated_text ?? '', data.detected_lang);
          break;
        }

        default:
          console.warn('[chatStore] Unknown WS message type:', data.type);
      }
    };

    ws.onerror = (err) => {
      console.warn('[chatStore] WebSocket error:', err);
      set({ connectionError: 'Connection error' });
    };

    ws.onclose = () => {
      set({ isConnected: false, ws: null });
      // Simple auto-reconnect. Remove this block if you'd rather
      // handle reconnection explicitly from the UI.
      reconnectTimeout = setTimeout(() => {
        get().connect(roomId, token, myEmail);
      }, 3000);
    };

    set({ ws });
  },

  disconnect: () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    const ws = get().ws;
    if (ws) {
      ws.onclose = null; // Prevent auto-reconnect
      ws.close();
    }
    set({ ws: null, isConnected: false, connectionError: null, messages: [], drafts: [] });
  },

  sendDraft: (text) => {
    const ws = get().ws;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'send_draft', text }));
    } else {
      console.warn('[chatStore] Cannot send draft — socket not open');
    }
  },

  confirmDraft: (id, editedText) => {
    const ws = get().ws;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'confirm_draft', id, edited_text: editedText }));
    } else {
      console.warn('[chatStore] Cannot confirm draft — socket not open');
    }
  },
}));
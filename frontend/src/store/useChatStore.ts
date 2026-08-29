/**
 * Zustand chat store — manages WebSocket connection and chat messages.
 *
 * Connects to the backend WebSocket, handles incoming messages, and exposes
 * actions for sending drafts and confirming translations. Includes automatic
 * reconnection on socket close (with deduplication to avoid socket races).
 */

import { create } from 'zustand';
import { WS_BASE_URL } from '@/config';

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

/** Shape of messages coming FROM the server over the socket.
 *  Kept separate from `Message` to avoid trusting unvalidated JSON. */
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
  sendMessage: (text: string) => void;
}

// Keep a handle to any pending reconnect so disconnect() can cancel it
// and we never end up with two sockets racing each other.
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let pingInterval: ReturnType<typeof setInterval> | null = null;

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  drafts: [],
  ws: null,
  isConnected: false,
  connectionError: null,

  /** Move a message into the finalized list and remove it from drafts. */
  addFinalizedMessage: (m) =>
    set((s) => ({
      messages: [...s.messages, m],
      drafts: s.drafts.filter((d) => d.id !== m.id),
    })),

  /** Add a draft or update it if one with the same id already exists. */
  addOrUpdateDraft: (m) =>
    set((s) => {
      const exists = s.drafts.some((d) => d.id === m.id);
      return exists
        ? { drafts: s.drafts.map((d) => (d.id === m.id ? m : d)) }
        : { drafts: [...s.drafts, m] };
    }),

  /** Remove a draft by id (e.g. when the user cancels). */
  removeDraft: (id) => set((s) => ({ drafts: s.drafts.filter((d) => d.id !== id) })),

  /** Update the translated text of a draft (e.g. user edits it before sending). */
  updateDraftTranslation: (id, translated, lang) =>
    set((s) => ({
      drafts: s.drafts.map((d) =>
        d.id === id
          ? { ...d, translated_text: translated, detected_lang: lang ?? d.detected_lang }
          : d,
      ),
    })),

  connect: (roomId, token, myEmail) => {
    // Avoid opening a duplicate socket if already connected
    const existing = get().ws;
    if (existing && existing.readyState === WebSocket.OPEN) return;

    // Cancel any pending reconnect so two sockets can't race
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    const wsUrl = `${WS_BASE_URL}/api/v1/ws/chat/${roomId}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      set({ isConnected: true, connectionError: null });

      // Keepalive heartbeat every 25s for cloud proxies (Render, Cloudflare, etc.)
      if (pingInterval) clearInterval(pingInterval);
      pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 25000);
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
        case 'pong':
          // Heartbeat response, connection is healthy
          break;

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

        // Kept for backward compatibility with the older protocol.
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
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }
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
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
    // Cancel pending reconnect and close the socket cleanly
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    const ws = get().ws;
    if (ws) {
      ws.onclose = null; // Prevent auto-reconnect from firing
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

  sendMessage: (text) => {
    const ws = get().ws;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'send_message', text }));
    } else {
      console.warn('[chatStore] Cannot send message — socket not open');
    }
  },
}));

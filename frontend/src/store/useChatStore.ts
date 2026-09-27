/**
 * Zustand chat store — manages WebSocket connection, message history, drafts, typing indicators.
 */

import { create } from 'zustand';
import { WS_BASE_URL } from '@/config';
import { useAuthStore } from '@/store/useAuthStore';

export interface CulturalFootnotes {
  humor_explanation?: string;
  idiom_breakdown?: string;
  etiquette_warning?: string;
}

export interface Message {
  id: string;
  sender_email: string;
  sender_username?: string;
  sender_avatar_url?: string;
  original_text: string;
  translated_text?: string | null;
  translations?: Record<string, string> | null;
  detected_lang?: string;
  cultural_footnotes?: CulturalFootnotes | null;
  message_type?: string;
  reply_to_id?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_size?: number | null;
  delivery_status?: string;
  is_me: boolean;
  status: 'draft' | 'final';
  created_at?: number | string;
}

interface IncomingWSMessage {
  type: 'draft_ready' | 'message_finalized' | 'typing' | 'read_ack' | 'message_deleted' | 'pong' | string;
  id?: string;
  sender_email?: string;
  sender_username?: string;
  sender_avatar_url?: string;
  text?: string;
  original_text?: string;
  translated_text?: string | null;
  translations?: Record<string, string> | null;
  detected_lang?: string;
  cultural_footnotes?: CulturalFootnotes | null;
  reply_to_id?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_size?: number | null;
  delivery_status?: string;
  message_type?: string;
  is_typing?: boolean;
  created_at?: number;
}

interface ChatState {
  messages: Message[];
  drafts: Message[];
  ws: WebSocket | null;
  isConnected: boolean;
  connectionError: string | null;
  replyTo: Message | null;
  typingUsers: Record<string, { email: string; username?: string }>;

  setInitialMessages: (messages: Message[]) => void;
  setReplyTo: (msg: Message | null) => void;
  addFinalizedMessage: (m: Message) => void;
  addOrUpdateDraft: (m: Message) => void;
  removeDraft: (id: string) => void;
  removeMessage: (id: string) => void;
  updateDraftTranslation: (id: string, translated: string, lang?: string) => void;

  connect: (roomId: string, token: string, myEmail: string) => void;
  disconnect: () => void;

  sendDraft: (text: string, extra?: { reply_to_id?: string; attachment_url?: string; attachment_name?: string; attachment_size?: number; message_type?: string }) => void;
  confirmDraft: (id: string, editedText: string) => void;
  sendMessage: (text: string, extra?: { reply_to_id?: string; attachment_url?: string; attachment_name?: string; attachment_size?: number; message_type?: string }) => void;
  sendTyping: (isTyping: boolean) => void;
  sendReadAck: (messageId: string) => void;
  deleteMessage: (messageId: string) => void;
}

let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let pingInterval: ReturnType<typeof setInterval> | null = null;
let typingTimeout: ReturnType<typeof setTimeout> | null = null;
const MAX_RECONNECT_ATTEMPTS = 6;
let reconnectAttempts = 0;

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  drafts: [],
  ws: null,
  isConnected: false,
  connectionError: null,
  replyTo: null,
  typingUsers: {},

  setInitialMessages: (messages) => set({ messages }),

  setReplyTo: (msg) => set({ replyTo: msg }),

  addFinalizedMessage: (m) =>
    set((s) => {
      // Deduplicate if already exists
      const exists = s.messages.some((msg) => msg.id === m.id);
      return {
        messages: exists ? s.messages.map((msg) => (msg.id === m.id ? m : msg)) : [...s.messages, m],
        drafts: s.drafts.filter((d) => d.id !== m.id),
      };
    }),

  addOrUpdateDraft: (m) =>
    set((s) => {
      const exists = s.drafts.some((d) => d.id === m.id);
      return exists
        ? { drafts: s.drafts.map((d) => (d.id === m.id ? m : d)) }
        : { drafts: [...s.drafts, m] };
    }),

  removeDraft: (id) => set((s) => ({ drafts: s.drafts.filter((d) => d.id !== id) })),

  removeMessage: (id) => set((s) => ({ messages: s.messages.filter((m) => m.id !== id) })),

  updateDraftTranslation: (id, translated, lang) =>
    set((s) => ({
      drafts: s.drafts.map((d) =>
        d.id === id
          ? { ...d, translated_text: translated, detected_lang: lang ?? d.detected_lang }
          : d,
      ),
    })),

  connect: (roomId, token, myEmail) => {
    const existing = get().ws;
    if (existing && existing.readyState === WebSocket.OPEN) return;

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    const wsUrl = `${WS_BASE_URL}/api/v1/ws/chat/${roomId}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      reconnectAttempts = 0;
      set({ isConnected: true, connectionError: null });

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
        return;
      }

      switch (data.type) {
        case 'pong':
          break;

        case 'typing': {
          if (data.sender_email && data.sender_email !== myEmail) {
            const sender = data.sender_email;
            set((s) => {
              const updated = { ...s.typingUsers };
              if (data.is_typing) {
                updated[sender] = { email: sender, username: data.sender_username };
              } else {
                delete updated[sender];
              }
              return { typingUsers: updated };
            });
          }
          break;
        }

        case 'read_ack': {
          if (data.id) {
            set((s) => ({
              messages: s.messages.map((m) =>
                m.id === data.id ? { ...m, delivery_status: 'read' } : m
              ),
            }));
          }
          break;
        }

        case 'message_deleted': {
          if (data.id) {
            get().removeMessage(data.id);
          }
          break;
        }

        case 'draft_ready': {
          if (data.sender_email === myEmail && data.id) {
            get().addOrUpdateDraft({
              id: data.id,
              sender_email: data.sender_email,
              sender_username: data.sender_username,
              sender_avatar_url: data.sender_avatar_url,
              original_text: data.original_text ?? data.text ?? '',
              translated_text: data.translated_text ?? null,
              translations: data.translations ?? null,
              detected_lang: data.detected_lang,
              cultural_footnotes: data.cultural_footnotes ?? null,
              reply_to_id: data.reply_to_id,
              attachment_url: data.attachment_url,
              attachment_name: data.attachment_name,
              attachment_size: data.attachment_size,
              delivery_status: data.delivery_status ?? 'sent',
              is_me: true,
              status: 'draft',
              created_at: data.created_at ?? Date.now(),
            });
          }
          break;
        }

        case 'message_finalized': {
          if (data.id && data.sender_email) {
            get().addFinalizedMessage({
              id: data.id,
              sender_email: data.sender_email,
              sender_username: data.sender_username,
              sender_avatar_url: data.sender_avatar_url,
              original_text: data.original_text ?? data.text ?? '',
              translated_text: data.translated_text ?? null,
              translations: data.translations ?? null,
              detected_lang: data.detected_lang,
              cultural_footnotes: data.cultural_footnotes ?? null,
              reply_to_id: data.reply_to_id,
              attachment_url: data.attachment_url,
              attachment_name: data.attachment_name,
              attachment_size: data.attachment_size,
              delivery_status: data.delivery_status ?? 'delivered',
              is_me: data.sender_email === myEmail,
              status: 'final',
              created_at: data.created_at ?? Date.now(),
            });
          }
          break;
        }

        default:
          break;
      }
    };

    ws.onerror = (err) => {
      console.warn('[chatStore] WebSocket error:', err);
      set({ connectionError: 'Connection error' });
    };

    ws.onclose = (event) => {
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }
      set({ isConnected: false, ws: null });

      if (event.code === 1008) {
        useAuthStore.getState().logout();
        return;
      }

      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        useAuthStore.getState().logout();
        return;
      }
      const delay = Math.min(3000 * Math.pow(2, reconnectAttempts), 30000);
      reconnectAttempts += 1;
      reconnectTimeout = setTimeout(() => {
        get().connect(roomId, token, myEmail);
      }, delay);
    };

    set({ ws });
  },

  disconnect: () => {
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    reconnectAttempts = 0;
    const ws = get().ws;
    if (ws) {
      ws.onclose = null;
      ws.close();
    }
    set({ ws: null, isConnected: false, connectionError: null, messages: [], drafts: [], replyTo: null, typingUsers: {} });
  },

  sendDraft: (text, extra) => {
    const ws = get().ws;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'send_draft',
        text,
        reply_to_id: extra?.reply_to_id,
        attachment_url: extra?.attachment_url,
        attachment_name: extra?.attachment_name,
        attachment_size: extra?.attachment_size,
        message_type: extra?.message_type ?? 'text',
      }));
      set({ replyTo: null });
    }
  },

  confirmDraft: (id, editedText) => {
    const ws = get().ws;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'confirm_draft', id, edited_text: editedText }));
    }
  },

  sendMessage: (text, extra) => {
    // Enforced Draft→Confirm: legacy quick-send now routes through AI translation
    // so receivers always get their Settings default language + footnotes.
    const ws = get().ws;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'send_draft',
        text,
        reply_to_id: extra?.reply_to_id,
        attachment_url: extra?.attachment_url,
        attachment_name: extra?.attachment_name,
        attachment_size: extra?.attachment_size,
        message_type: extra?.message_type ?? 'text',
      }));
      set({ replyTo: null });
    }
  },

  sendTyping: (isTyping) => {
    const ws = get().ws;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'typing', is_typing: isTyping }));
    }
  },

  sendReadAck: (messageId) => {
    const ws = get().ws;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'read_ack', message_id: messageId }));
    }
  },

  deleteMessage: (messageId) => {
    const ws = get().ws;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'delete_message', message_id: messageId }));
    }
    get().removeMessage(messageId);
  },
}));

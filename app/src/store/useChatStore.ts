import { create } from 'zustand';
import { WS_BASE_URL } from '@/lib/config';
import { useAuthStore } from '@/store/useAuthStore';

export interface Footnotes {
  humor_explanation?: string;
  idiom_breakdown?: string;
  etiquette_warning?: string;
}

export interface ChatMessage {
  id: string;
  sender_email: string;
  sender_username?: string;
  sender_avatar_url?: string;
  original_text: string;
  translated_text?: string | null;
  translations?: Record<string, string> | null;
  detected_lang?: string;
  cultural_footnotes?: Footnotes | null;
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

export interface TypingUser {
  email: string;
  username?: string;
}

interface ChatState {
  messages: ChatMessage[];
  drafts: ChatMessage[];
  isConnected: boolean;
  connectionError: string | null;
  replyTo: ChatMessage | null;
  typingUser: string | null;
  typingUsers: Record<string, TypingUser>;
  setInitialMessages: (list: any[], myEmail?: string) => void;
  setReplyTo: (msg: ChatMessage | null) => void;
  addFinalizedMessage: (m: ChatMessage) => void;
  addOrUpdateDraft: (m: ChatMessage) => void;
  updateDraftTranslation: (id: string, translated: string, lang?: string) => void;
  removeMessage: (id: string) => void;
  connect: (roomId: string, token: string, myEmail: string) => void;
  disconnect: () => void;
  sendDraft: (
    text: string,
    extra?: {
      reply_to_id?: string;
      attachment_url?: string;
      attachment_name?: string;
      attachment_size?: number;
      message_type?: string;
    },
  ) => void;
  sendMessage: (
    text: string,
    extra?: {
      reply_to_id?: string;
      attachment_url?: string;
      attachment_name?: string;
      attachment_size?: number;
      message_type?: string;
    },
  ) => void;
  confirmDraft: (id: string, editedText: string) => void;
  sendTyping: (isTyping: boolean) => void;
  sendReadAck: (messageId: string) => void;
  deleteMessage: (messageId: string) => void;
  removeDraft: (id: string) => void;
}

let ws: WebSocket | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 6;
let lastConnectArgs: { roomId: string; token: string; myEmail: string } | null = null;

function normalize(data: any, myEmail: string, status: 'draft' | 'final'): ChatMessage {
  return {
    id: data.id,
    sender_email: data.sender_email,
    sender_username: data.sender_username,
    sender_avatar_url: data.sender_avatar_url,
    original_text: data.original_text ?? data.text ?? '',
    translated_text: data.translated_text ?? null,
    translations: data.translations ?? null,
    detected_lang: data.detected_lang,
    cultural_footnotes: data.cultural_footnotes ?? null,
    message_type: data.message_type ?? 'text',
    reply_to_id: data.reply_to_id ?? null,
    attachment_url: data.attachment_url ?? null,
    attachment_name: data.attachment_name ?? null,
    attachment_size: data.attachment_size ?? null,
    delivery_status: data.delivery_status ?? data.deliveryStatus ?? (status === 'draft' ? 'sent' : 'delivered'),
    is_me: data.sender_email === myEmail,
    status,
    created_at: data.created_at ?? Date.now(),
  };
}

function ts(v: number | string | undefined): number {
  if (typeof v === 'number') return v;
  const t = v ? Date.parse(v) : NaN;
  return Number.isNaN(t) ? 0 : t;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  drafts: [],
  isConnected: false,
  connectionError: null,
  replyTo: null,
  typingUser: null,
  typingUsers: {},

  setInitialMessages: (list, myEmail) =>
    set((s) => ({
      messages: (Array.isArray(list) ? list : []).map((m: any) => ({
        id: m.id,
        sender_email: m.sender_email,
        sender_username: m.sender_username,
        sender_avatar_url: m.sender_avatar_url,
        original_text: m.original_text ?? m.originalText ?? m.text ?? '',
        translated_text: m.translated_text ?? m.translatedText ?? null,
        translations: m.translations ?? null,
        detected_lang: m.detected_lang ?? m.detectedLang,
        cultural_footnotes: m.cultural_footnotes ?? m.culturalFootnotes ?? null,
        message_type: m.message_type ?? 'text',
        reply_to_id: m.reply_to_id ?? null,
        attachment_url: m.attachment_url ?? null,
        attachment_name: m.attachment_name ?? null,
        attachment_size: m.attachment_size ?? null,
        delivery_status: m.delivery_status ?? m.deliveryStatus ?? 'delivered',
        is_me: m.is_me ?? (myEmail ? m.sender_email === myEmail : !!m.is_me),
        status: 'final' as const,
        created_at: m.created_at ?? m.createdAt,
      })),
      drafts: s.drafts,
    })),

  setReplyTo: (msg) => set({ replyTo: msg }),

  addFinalizedMessage: (m) =>
    set((s) => ({
      messages: s.messages.some((x) => x.id === m.id)
        ? s.messages.map((x) => (x.id === m.id ? m : x))
        : [...s.messages, m],
      drafts: s.drafts.filter((d) => d.id !== m.id),
    })),

  addOrUpdateDraft: (m) =>
    set((s) => {
      const exists = s.drafts.some((x) => x.id === m.id);
      return { drafts: exists ? s.drafts.map((x) => (x.id === m.id ? m : x)) : [...s.drafts, m] };
    }),

  updateDraftTranslation: (id, translated, lang) =>
    set((s) => ({
      drafts: s.drafts.map((d) =>
        d.id === id ? { ...d, translated_text: translated, detected_lang: lang ?? d.detected_lang } : d,
      ),
    })),

  removeMessage: (id) => set((s) => ({ messages: s.messages.filter((m) => m.id !== id) })),

  connect: (roomId, token, myEmail) => {
    get().disconnect();
    lastConnectArgs = { roomId, token, myEmail };
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    const url = `${WS_BASE_URL}/api/v1/ws/chat/${roomId}?token=${encodeURIComponent(token)}`;
    const sock = new WebSocket(url);
    ws = sock;
    sock.onopen = () => {
      reconnectAttempts = 0;
      set({ isConnected: true, connectionError: null });
      if (pingTimer) clearInterval(pingTimer);
      pingTimer = setInterval(() => {
        if (sock.readyState === WebSocket.OPEN) sock.send(JSON.stringify({ type: 'ping' }));
      }, 25000);
    };
    sock.onmessage = (e) => {
      let data: any;
      try {
        data = JSON.parse((e as any).data);
      } catch {
        return;
      }
      if (data.type === 'pong') return;
      if (data.type === 'typing') {
        if (data.sender_email && data.sender_email !== myEmail) {
          const sender = data.sender_email;
          set((s) => {
            const updated = { ...s.typingUsers };
            if (data.is_typing) {
              updated[sender] = { email: sender, username: data.sender_username };
            } else {
              delete updated[sender];
            }
            const first = Object.values(updated)[0];
            return {
              typingUsers: updated,
              typingUser: first ? first.username || first.email : null,
            };
          });
        }
        return;
      }
      if (data.type === 'read_ack' && data.id) {
        set((s) => {
          const acked = s.messages.find((m) => m.id === data.id);
          const cutoff = acked ? ts(acked.created_at) : Number.POSITIVE_INFINITY;
          return {
            messages: s.messages.map((m) =>
              m.is_me && ts(m.created_at) <= cutoff ? { ...m, delivery_status: 'read' } : m,
            ),
          };
        });
        return;
      }
      if (data.type === 'message_deleted' && data.id) {
        set((s) => ({ messages: s.messages.filter((m) => m.id !== data.id) }));
        return;
      }
      if (data.type === 'draft_ready' && data.id && data.sender_email === myEmail) {
        const d = normalize(data, myEmail, 'draft');
        get().addOrUpdateDraft(d);
        return;
      }
      if (data.type === 'message_finalized' && data.id) {
        const m = normalize(data, myEmail, 'final');
        get().addFinalizedMessage(m);
      }
    };
    sock.onerror = () => set({ connectionError: 'Connection error', isConnected: false });
    sock.onclose = (ev: any) => {
      set({ isConnected: false });
      if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
      }
      // Auth revoked — mirror web: log out
      if (ev?.code === 1008) {
        try {
          useAuthStore.getState().logout();
        } catch {}
        return;
      }
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS || !lastConnectArgs) return;
      const delay = Math.min(3000 * Math.pow(2, reconnectAttempts), 30000);
      reconnectAttempts += 1;
      reconnectTimer = setTimeout(() => {
        if (lastConnectArgs) get().connect(lastConnectArgs.roomId, lastConnectArgs.token, lastConnectArgs.myEmail);
      }, delay);
    };
  },

  disconnect: () => {
    lastConnectArgs = null;
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    reconnectAttempts = 0;
    try {
      ws?.close();
    } catch {}
    ws = null;
    set({ isConnected: false, connectionError: null, messages: [], drafts: [], replyTo: null, typingUser: null, typingUsers: {} });
  },

  sendDraft: (text, extra) => {
    if (ws?.readyState === WebSocket.OPEN && (text.trim() || extra?.attachment_url)) {
      ws.send(
        JSON.stringify({
          type: 'send_draft',
          text: text.trim(),
          reply_to_id: extra?.reply_to_id,
          attachment_url: extra?.attachment_url,
          attachment_name: extra?.attachment_name,
          attachment_size: extra?.attachment_size,
          message_type: extra?.message_type ?? 'text',
        }),
      );
      set({ replyTo: null });
    }
  },
  sendMessage: (text, extra) => {
    // Enforced Draft→Confirm like web: route through AI translation
    get().sendDraft(text, extra);
  },
  confirmDraft: (id, editedText) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'confirm_draft', id, edited_text: editedText }));
    }
  },
  sendTyping: (isTyping) => {
    if (useAuthStore.getState().user?.show_online === false) return;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'typing', is_typing: isTyping }));
  },
  sendReadAck: (messageId) => {
    if (useAuthStore.getState().user?.read_receipts === false) return;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'read_ack', message_id: messageId }));
  },
  deleteMessage: (messageId) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'delete_message', message_id: messageId }));
    }
    get().removeMessage(messageId);
  },
  removeDraft: (id) => set((s) => ({ drafts: s.drafts.filter((d) => d.id !== id) })),
}));

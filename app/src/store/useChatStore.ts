import { create } from 'zustand';
import { WS_BASE_URL } from '@/lib/config';

export interface Footnotes {
  humor_explanation?: string;
  idiom_breakdown?: string;
  etiquette_warning?: string;
}

export interface ChatMessage {
  id: string;
  sender_email: string;
  sender_username?: string;
  original_text: string;
  translated_text?: string | null;
  translations?: Record<string, string> | null;
  detected_lang?: string;
  cultural_footnotes?: Footnotes | null;
  delivery_status?: string;
  is_me: boolean;
  status: 'draft' | 'final';
  created_at?: number | string;
}

interface ChatState {
  messages: ChatMessage[];
  drafts: ChatMessage[];
  isConnected: boolean;
  typingUser: string | null;
  setInitialMessages: (list: any[], myEmail: string) => void;
  connect: (roomId: string, token: string, myEmail: string) => void;
  disconnect: () => void;
  sendDraft: (text: string) => void;
  confirmDraft: (id: string, editedText: string) => void;
  sendTyping: (isTyping: boolean) => void;
  sendReadAck: (messageId: string) => void;
  removeDraft: (id: string) => void;
}

let ws: WebSocket | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;

function normalize(data: any, myEmail: string, status: 'draft' | 'final'): ChatMessage {
  return {
    id: data.id,
    sender_email: data.sender_email,
    sender_username: data.sender_username,
    original_text: data.original_text ?? data.text ?? '',
    translated_text: data.translated_text ?? null,
    translations: data.translations ?? null,
    detected_lang: data.detected_lang,
    cultural_footnotes: data.cultural_footnotes ?? null,
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
  typingUser: null,

  setInitialMessages: (list, myEmail) =>
    set({
      messages: (Array.isArray(list) ? list : []).map((m: any) => ({
        id: m.id,
        sender_email: m.sender_email,
        sender_username: m.sender_username,
        original_text: m.original_text ?? m.originalText ?? '',
        translated_text: m.translated_text ?? m.translatedText ?? null,
        translations: m.translations ?? null,
        detected_lang: m.detected_lang ?? m.detectedLang,
        cultural_footnotes: m.cultural_footnotes ?? m.culturalFootnotes ?? null,
        delivery_status: m.delivery_status ?? m.deliveryStatus ?? 'delivered',
        is_me: m.is_me ?? m.sender_email === myEmail,
        status: 'final' as const,
        created_at: m.created_at ?? m.createdAt,
      })),
      drafts: [],
    }),

  connect: (roomId, token, myEmail) => {
    get().disconnect();
    const url = `${WS_BASE_URL}/api/v1/ws/chat/${roomId}?token=${encodeURIComponent(token)}`;
    const sock = new WebSocket(url);
    ws = sock;
    sock.onopen = () => {
      set({ isConnected: true });
      if (pingTimer) clearInterval(pingTimer);
      pingTimer = setInterval(() => {
        if (sock.readyState === WebSocket.OPEN) sock.send(JSON.stringify({ type: 'ping' }));
      }, 25000);
    };
    sock.onmessage = (e) => {
      let data: any;
      try {
        data = JSON.parse(e.data);
      } catch {
        return;
      }
      if (data.type === 'pong') return;
      if (data.type === 'typing') {
        set({ typingUser: data.is_typing && data.sender_email !== myEmail ? data.sender_username || data.sender_email : null });
        return;
      }
      if (data.type === 'read_ack' && data.id) {
        // Reader confirmed sight up to this message: mark all my messages
        // at or before it as read (matches web bubble ticks).
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
        set((s) => {
          const exists = s.drafts.some((x) => x.id === d.id);
          return { drafts: exists ? s.drafts.map((x) => (x.id === d.id ? d : x)) : [...s.drafts, d] };
        });
        return;
      }
      if (data.type === 'message_finalized' && data.id) {
        const m = normalize(data, myEmail, 'final');
        set((s) => ({
          messages: s.messages.some((x) => x.id === m.id)
            ? s.messages.map((x) => (x.id === m.id ? m : x))
            : [...s.messages, m],
          drafts: s.drafts.filter((d) => d.id !== m.id),
        }));
      }
    };
    sock.onclose = () => {
      set({ isConnected: false });
      if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
      }
    };
    sock.onerror = () => set({ isConnected: false });
  },

  disconnect: () => {
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
    try {
      ws?.close();
    } catch {}
    ws = null;
    set({ isConnected: false, messages: [], drafts: [], typingUser: null });
  },

  sendDraft: (text) => {
    if (ws?.readyState === WebSocket.OPEN && text.trim()) {
      ws.send(JSON.stringify({ type: 'send_draft', text: text.trim() }));
    }
  },
  confirmDraft: (id, editedText) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'confirm_draft', id, edited_text: editedText }));
    }
  },
  sendTyping: (isTyping) => {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'typing', is_typing: isTyping }));
  },
  sendReadAck: (messageId) => {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'read_ack', message_id: messageId }));
  },
  removeDraft: (id) => set((s) => ({ drafts: s.drafts.filter((d) => d.id !== id) })),
}));

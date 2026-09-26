"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '@/lib/icons';
import { Message } from '@/store/useChatStore';

interface MergedComposerProps {
  currentLangName: string;
  isConnected: boolean;
  replyTo: Message | null;
  onCancelReply: () => void;
  onSend: (text: string, extra?: { reply_to_id?: string; attachment_url?: string; attachment_name?: string; attachment_size?: number; message_type?: string }) => void;
  onDraft: (text: string, extra?: { reply_to_id?: string; attachment_url?: string; attachment_name?: string; attachment_size?: number; message_type?: string }) => void;
  onTyping: (isTyping: boolean) => void;
}

const COMMON_EMOJIS = ['😊', '😂', '🔥', '👍', '❤️', '🎉', '✨', '🙏', '🙌', '💡', '🚀', '💯'];

export function MergedComposer({
  currentLangName,
  isConnected,
  replyTo,
  onCancelReply,
  onSend,
  onDraft,
  onTyping,
}: MergedComposerProps) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [attachment, setAttachment] = useState<{ url: string; name: string; size: number; type: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);

    // Send typing notification
    onTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      onTyping(false);
    }, 1800);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuickSend();
    }
  };

  const handleQuickSend = () => {
    const trimmed = text.trim();
    if ((!trimmed && !attachment) || !isConnected) return;

    onSend(trimmed, {
      reply_to_id: replyTo?.id,
      attachment_url: attachment?.url,
      attachment_name: attachment?.name,
      attachment_size: attachment?.size,
      message_type: attachment?.type || 'text',
    });

    setText('');
    setAttachment(null);
    onCancelReply();
    onTyping(false);
  };

  const handleDraftTranslate = () => {
    const trimmed = text.trim();
    if ((!trimmed && !attachment) || !isConnected) return;

    onDraft(trimmed, {
      reply_to_id: replyTo?.id,
      attachment_url: attachment?.url,
      attachment_name: attachment?.name,
      attachment_size: attachment?.size,
      message_type: attachment?.type || 'text',
    });

    setText('');
    setAttachment(null);
    onCancelReply();
    onTyping(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create object URL for client preview
    const url = URL.createObjectURL(file);
    const type = file.type.startsWith('image/') ? 'image' : 'file';
    setAttachment({
      url,
      name: file.name,
      size: file.size,
      type,
    });
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmoji(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="border-t border-[var(--border)] bg-[var(--card)]/90 backdrop-blur-md px-3 sm:px-5 py-3 space-y-2">
      {/* Reply Reference Banner */}
      {replyTo && (
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[var(--bg-subtle)] border-l-4 border-[var(--primary)] text-xs">
          <div className="min-w-0">
            <span className="font-bold text-[var(--text)]">
              Replying to {replyTo.is_me ? 'yourself' : replyTo.sender_username || replyTo.sender_email}
            </span>
            <p className="text-[var(--muted)] truncate text-[11px]">{replyTo.original_text}</p>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 rounded-full text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
          >
            <Icons.x className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Attachment Preview Banner */}
      {attachment && (
        <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-xs">
          <div className="flex items-center gap-2 min-w-0">
            {attachment.type === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={attachment.url} alt="preview" className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <Icons.clip className="w-5 h-5 text-indigo-500 flex-none" />
            )}
            <div className="min-w-0">
              <p className="font-semibold truncate">{attachment.name}</p>
              <p className="text-[10px] text-[var(--muted)]">{(attachment.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <button
            onClick={() => setAttachment(null)}
            className="p-1 text-[var(--muted)] hover:text-red-500 cursor-pointer"
          >
            <Icons.x className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmoji && (
        <div className="flex items-center gap-1.5 p-2 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl overflow-x-auto">
          {COMMON_EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => addEmoji(e)}
              className="p-1.5 text-lg hover:scale-125 transition-transform cursor-pointer"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Main Composer Row */}
      <div className="flex items-end gap-2 sm:gap-3">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 rounded-full border border-[var(--border)] bg-[var(--bg-subtle)] hover:bg-[var(--card)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer flex-none"
          title="Attach photo or document"
        >
          <Icons.clip className="w-5 h-5" />
        </button>

        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmoji(!showEmoji)}
          className="p-2.5 rounded-full border border-[var(--border)] bg-[var(--bg-subtle)] hover:bg-[var(--card)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer flex-none hidden sm:flex"
          title="Pick an emoji"
        >
          <Icons.smile className="w-5 h-5" />
        </button>

        {/* Text Input */}
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            disabled={!isConnected}
            placeholder={
              isConnected
                ? `Type in ${currentLangName}... (Enter to send)`
                : 'Connecting...'
            }
            className="w-full bg-[var(--bg-subtle)] border border-[var(--border)] rounded-2xl px-4 py-2.5 text-sm sm:text-base text-[var(--text)] placeholder:text-[var(--muted)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all resize-none max-h-32"
          />
        </div>

        {/* Actions: Send & Groq AI Translate */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-none">
          {/* Quick Send Button */}
          <button
            type="button"
            onClick={handleQuickSend}
            disabled={!isConnected || (!text.trim() && !attachment)}
            className="p-2.5 sm:px-4 sm:py-2.5 rounded-full bg-[var(--primary)] text-white hover:opacity-90 active:scale-95 disabled:opacity-40 transition-all shadow-sm flex items-center justify-center cursor-pointer"
            title="Send directly"
          >
            <Icons.send className="w-4 h-4 sm:mr-1.5" />
            <span className="hidden sm:inline text-xs font-bold">Send</span>
          </button>

          {/* Groq AI Draft Button */}
          <button
            type="button"
            onClick={handleDraftTranslate}
            disabled={!isConnected || (!text.trim() && !attachment)}
            className="p-2.5 sm:px-4 sm:py-2.5 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white hover:opacity-90 active:scale-95 disabled:opacity-40 transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            title="Translate with Groq AI and preview cultural nuances before sending"
          >
            <Icons.spark className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-bold">AI Draft</span>
          </button>
        </div>
      </div>
    </div>
  );
}

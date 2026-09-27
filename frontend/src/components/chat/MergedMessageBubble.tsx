"use client";

import { useState } from 'react';
import { Message } from '@/store/useChatStore';
import { CulturalFootnotes } from '@/components/chat/CulturalFootnotes';
import { MergedAvatar } from '@/components/common/MergedAvatar';
import { Icons } from '@/lib/icons';

interface MergedMessageBubbleProps {
  message: Message;
  allMessages?: Message[];
  myLang: string;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  langNames: Record<string, string>;
  onReply?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  onJumpToReply?: (replyId: string) => void;
}

function formatTime(timestamp?: number | string) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Allowlist for user-supplied attachment URLs: http(s) only, no spaces. */
function isSafeHttpUrl(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (trimmed.length === 0 || trimmed.length > 2048 || trimmed.includes(' ')) return false;
  const lower = trimmed.toLowerCase();
  return lower.startsWith('https://') || lower.startsWith('http://');
}

function openAttachmentSafely(url?: string | null) {
  if (!isSafeHttpUrl(url)) return;
  window.open(url as string, '_blank', 'noopener,noreferrer');
}

export function MergedMessageBubble({
  message: m,
  allMessages = [],
  myLang,
  isExpanded,
  onToggleExpand,
  langNames,
  onReply,
  onDelete,
  onJumpToReply,
}: MergedMessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // TRANSLATED-FIRST UX:
  // - Sender sees their own original text as the primary bubble text
  // - Recipients see the translation in their seat language (myLang), falling back to translated_text
  const primaryText = m.is_me
    ? m.original_text
    : (m.translations?.[myLang] || m.translated_text || m.original_text);

  const listenerTranslation = m.translations?.[myLang] || m.translated_text;
  const currentLangName = langNames[myLang] || myLang.toUpperCase();

  // Find replied-to message if any
  const repliedMessage = m.reply_to_id
    ? allMessages.find((msg) => msg.id === m.reply_to_id)
    : null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(primaryText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      setShowMenu(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      className={`group relative flex flex-col ${
        m.is_me ? 'items-end' : 'items-start'
      } my-1.5 transition-all`}
    >
      <div className={`flex items-end gap-2 max-w-[90%] sm:max-w-[78%] ${m.is_me ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar for other users */}
        {!m.is_me && (
          <MergedAvatar
            name={m.sender_username || m.sender_email}
            avatarUrl={m.sender_avatar_url}
            size="sm"
            className="mb-1"
          />
        )}

        {/* Message Bubble Box */}
        <div
          className={`relative p-3 sm:p-4 rounded-2xl shadow-xs transition-all ${
            m.is_me
              ? 'bg-[var(--chat-bubble-me)] text-[var(--chat-bubble-me-text)] rounded-br-xs'
              : 'bg-[var(--chat-bubble-other)] text-[var(--chat-bubble-other-text)] rounded-bl-xs border border-[var(--border)]'
          }`}
        >
          {/* Header row: Sender name & ⓘ Info Toggle */}
          <div className="flex items-center justify-between gap-3 mb-1.5">
            {!m.is_me ? (
              <span className="text-xs font-bold opacity-80 truncate max-w-[180px]">
                {m.sender_username || m.sender_email}
              </span>
            ) : (
              <span className="text-[10px] font-semibold opacity-70 uppercase tracking-wider">
                You
              </span>
            )}

            <div className="flex items-center gap-1">
              {/* ⓘ Info Button (Cultural Notes & Nuances) */}
              <button
                type="button"
                onClick={() => onToggleExpand(m.id)}
                className={`p-1 rounded-full transition-all cursor-pointer ${
                  isExpanded ? 'bg-black/15 dark:bg-white/20 opacity-100' : 'opacity-70 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10'
                }`}
                title={isExpanded ? 'Collapse details' : 'View original text & cultural nuances'}
              >
                <Icons.info className="w-3.5 h-3.5" />
              </button>

              {/* Action Menu button (Reply / Copy / Delete) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 rounded-full opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer"
                  title="Message options"
                >
                  <Icons.chevD className="w-3.5 h-3.5" />
                </button>

                {/* Popover Menu */}
                {showMenu && (
                  <div
                    className={`absolute z-30 mt-1 py-1 w-32 bg-[var(--card)] text-[var(--text)] border border-[var(--border)] rounded-xl shadow-xl text-xs font-medium ${
                      m.is_me ? 'right-0' : 'left-0'
                    }`}
                  >
                    {onReply && (
                      <button
                        onClick={() => {
                          onReply(m);
                          setShowMenu(false);
                        }}
                        className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--bg-subtle)] cursor-pointer"
                      >
                        <Icons.reply className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Reply</span>
                      </button>
                    )}

                    <button
                      onClick={handleCopy}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--bg-subtle)] cursor-pointer"
                    >
                      <Icons.copy className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{copySuccess ? 'Copied!' : 'Copy'}</span>
                    </button>

                    {m.is_me && onDelete && (
                      <button
                        onClick={() => {
                          onDelete(m.id);
                          setShowMenu(false);
                        }}
                        className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-red-500/10 text-red-500 cursor-pointer"
                      >
                        <Icons.trash className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quoted Replying Message Snippet */}
          {repliedMessage && (
            <div
              onClick={() => onJumpToReply?.(repliedMessage.id)}
              className="mb-2 p-2 rounded-lg bg-black/10 dark:bg-black/25 border-l-3 border-[var(--primary)] text-xs cursor-pointer hover:opacity-90 transition-opacity"
            >
              <p className="font-bold opacity-80 text-[11px] truncate">
                {repliedMessage.is_me ? 'You' : repliedMessage.sender_username || repliedMessage.sender_email}
              </p>
              <p className="opacity-75 truncate text-[11px]">
                {repliedMessage.original_text}
              </p>
            </div>
          )}

          {/* Attachment Preview (http(s) allowlist only) */}
          {m.attachment_url && isSafeHttpUrl(m.attachment_url) && (
            <div className="mb-2">
              {m.message_type === 'image' || m.attachment_url.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.attachment_url}
                  alt={m.attachment_name || 'Attachment'}
                  className="max-h-60 rounded-xl object-cover cursor-pointer hover:opacity-95 transition-opacity"
                  onClick={() => openAttachmentSafely(m.attachment_url)}
                />
              ) : (
                <a
                  href={m.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-black/10 dark:bg-black/25 hover:bg-black/15 transition-colors"
                >
                  <Icons.clip className="w-4 h-4 flex-none" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate">{m.attachment_name || 'Attachment File'}</p>
                    {m.attachment_size && (
                      <p className="text-[10px] opacity-70">{(m.attachment_size / 1024).toFixed(1)} KB</p>
                    )}
                  </div>
                </a>
              )}
            </div>
          )}

          {/* Primary Text */}
          <p className="text-sm sm:text-base leading-relaxed break-words font-medium">
            {primaryText}
          </p>

          {/* Footer Info: Translated from hint, timestamp, and status checks */}
          <div className="flex items-center justify-between gap-3 mt-1.5 pt-1 text-[10px] opacity-70">
            <div>
              {!m.is_me && !isExpanded && m.detected_lang && m.detected_lang !== myLang && (
                <span className="italic">
                  ✨ Translated from {langNames[m.detected_lang] || m.detected_lang}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 ml-auto flex-none">
              <span>{formatTime(m.created_at)}</span>

              {/* Status Ticks for sender */}
              {m.is_me && (
                <span className="flex items-center">
                  {m.delivery_status === 'read' ? (
                    <span className="text-emerald-400" title="Read">
                      <Icons.dcheck className="w-3.5 h-3.5" />
                    </span>
                  ) : m.delivery_status === 'delivered' ? (
                    <span className="opacity-80" title="Delivered">
                      <Icons.dcheck className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <span className="opacity-80" title="Sent">
                      <Icons.check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Expanded Drawer (Toggled by ⓘ button) */}
          {isExpanded && (
            <div className="mt-3 pt-2.5 border-t border-current/20 space-y-2 text-xs">
              {/* Original text block */}
              <div className="bg-black/10 dark:bg-black/25 p-2.5 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold opacity-80">
                  <span>Original Text</span>
                  {m.detected_lang && (
                    <span className="italic font-normal">
                      Detected: {langNames[m.detected_lang] || m.detected_lang}
                    </span>
                  )}
                </div>
                <p className="opacity-95 font-sans leading-relaxed">
                  {m.original_text}
                </p>
              </div>

              {/* For recipient: show their seat's translation if different */}
              {!m.is_me && listenerTranslation && listenerTranslation !== m.original_text && (
                <div className="bg-black/10 dark:bg-black/25 p-2.5 rounded-xl space-y-1">
                  <p className="font-bold opacity-80 text-[11px]">
                    {currentLangName} Translation
                  </p>
                  <p className="opacity-95 font-sans leading-relaxed">
                    {listenerTranslation}
                  </p>
                </div>
              )}

              {/* For sender: show translations fanned out to participants */}
              {m.is_me && m.translations && Object.keys(m.translations).length > 0 && (
                <div className="bg-black/10 dark:bg-black/25 p-2.5 rounded-xl space-y-1.5">
                  <p className="font-bold opacity-80 text-[11px]">Translations Sent:</p>
                  <div className="space-y-1">
                    {Object.entries(m.translations).map(([lang, text]) => (
                      <div key={lang} className="flex gap-1.5">
                        <span className="font-bold uppercase text-[10px] opacity-75 flex-none w-6">
                          {lang}:
                        </span>
                        <span className="opacity-95 truncate">{text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cultural Footnotes (Humor, Idiom, Etiquette warnings) */}
              <CulturalFootnotes footnotes={m.cultural_footnotes} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

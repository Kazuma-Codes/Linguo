"use client";

import { Message } from '@/store/useChatStore';
import { CulturalFootnotes } from './CulturalFootnotes';

interface ChatMessageBubbleProps {
  message: Message;
  myLang: string;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  langNames: Record<string, string>;
}

export function ChatMessageBubble({
  message: m,
  myLang,
  isExpanded,
  onToggleExpand,
  langNames,
}: ChatMessageBubbleProps) {
  // TRANSLATED-FIRST UX:
  // - Sender sees their own original text as the primary bubble text
  // - Recipients see the translation in their seat language (myLang), falling back to translated_text
  const primaryText = m.is_me
    ? m.original_text
    : (m.translations?.[myLang] || m.translated_text || m.original_text);

  const listenerTranslation = m.translations?.[myLang] || m.translated_text;
  const currentLangName = langNames[myLang] || myLang.toUpperCase();

  return (
    <div className={`flex flex-col ${m.is_me ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[85%] sm:max-w-[70%] p-3.5 sm:p-4 rounded-2xl shadow-xs transition-all ${
          m.is_me
            ? 'bg-[var(--chat-bubble-me)] text-[var(--chat-bubble-me-text)] rounded-br-xs'
            : 'bg-[var(--chat-bubble-other)] text-[var(--chat-bubble-other-text)] rounded-bl-xs border border-[var(--border)]'
        }`}
      >
        {/* Message Header (Sender Info + Expand ⓘ Toggle) */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          {!m.is_me ? (
            <span className="text-xs font-bold opacity-75 truncate max-w-[180px]">
              {m.sender_email}
            </span>
          ) : (
            <span className="text-[10px] font-semibold opacity-70 uppercase tracking-wider">
              You
            </span>
          )}

          {/* ⓘ Info Button Toggle */}
          <button
            onClick={() => onToggleExpand(m.id)}
            className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/15 text-xs opacity-75 hover:opacity-100 transition-all cursor-pointer"
            title={isExpanded ? 'Collapse details' : 'View original text & cultural nuances'}
            aria-label="Toggle message details"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </button>
        </div>

        {/* Primary Message Bubble Content */}
        <p className="text-sm sm:text-base leading-relaxed break-words font-medium">
          {primaryText}
        </p>

        {/* Collapsed Hint for recipient if viewing translated text */}
        {!m.is_me && !isExpanded && m.detected_lang && m.detected_lang !== myLang && (
          <p className="text-[10px] opacity-70 mt-1 italic">
            ✨ Translated from {langNames[m.detected_lang] || m.detected_lang}
          </p>
        )}

        {/* Expanded Drawer (Toggled by ⓘ) */}
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

            {/* Cultural Footnotes */}
            <CulturalFootnotes footnotes={m.cultural_footnotes} />
          </div>
        )}
      </div>
    </div>
  );
}

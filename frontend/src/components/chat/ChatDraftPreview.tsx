"use client";

import { Message } from '@/store/useChatStore';
import { CulturalFootnotes } from './CulturalFootnotes';

interface ChatDraftPreviewProps {
  draft: Message;
  onUpdateDraftTranslation: (id: string, translated: string) => void;
  onConfirmDraft: (id: string, text: string) => void;
  onRemoveDraft: (id: string) => void;
}

export function ChatDraftPreview({
  draft: d,
  onUpdateDraftTranslation,
  onConfirmDraft,
  onRemoveDraft,
}: ChatDraftPreviewProps) {
  const isTranslating = d.translated_text === null || d.translated_text === undefined;

  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-[var(--text)] shadow-md space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            ✨ Draft AI Translation
          </span>
          {isTranslating && (
            <span className="text-xs text-amber-500 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              Translating with Groq...
            </span>
          )}
        </div>

        <p className="text-xs text-[var(--muted)] italic">
          Original: {d.original_text}
        </p>

        <textarea
          value={d.translated_text ?? ''}
          onChange={(e) => onUpdateDraftTranslation(d.id, e.target.value)}
          rows={2}
          placeholder={
            isTranslating
              ? 'Translating with Groq... (or type your translation)'
              : 'Edit translation before sending...'
          }
          className="w-full bg-[var(--card)] border border-[var(--border)] p-2.5 rounded-xl text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none font-medium"
        />

        <CulturalFootnotes footnotes={d.cultural_footnotes} />

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => onConfirmDraft(d.id, d.translated_text || d.original_text)}
            className="px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
          >
            Send
          </button>
          <button
            onClick={() => onConfirmDraft(d.id, d.original_text)}
            className="px-3.5 py-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] hover:text-[var(--text)] font-semibold text-xs transition-colors cursor-pointer"
          >
            Send Original
          </button>
          <button
            onClick={() => onRemoveDraft(d.id)}
            className="px-3.5 py-1.5 rounded-full text-red-500 hover:bg-red-500/10 font-semibold text-xs transition-colors cursor-pointer ml-auto"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

interface LanguageSeatModalProps {
  pendingLang: string | null;
  langNames: Record<string, string>;
  onConfirmGlobal: () => void;
  onConfirmRoomOnly: () => void;
  onCancel: () => void;
}

export function LanguageSeatModal({
  pendingLang,
  langNames,
  onConfirmGlobal,
  onConfirmRoomOnly,
  onCancel,
}: LanguageSeatModalProps) {
  if (!pendingLang) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center text-lg font-bold">
            🌐
          </div>
          <div>
            <h3 className="font-bold text-[var(--text)] text-base">Change Language Seat</h3>
            <p className="text-xs text-[var(--muted)]">
              Switch speaking language to{' '}
              <span className="font-semibold text-[var(--text)]">
                {langNames[pendingLang] || pendingLang.toUpperCase()}
              </span>
            </p>
          </div>
        </div>

        <p className="text-xs text-[var(--muted)] leading-relaxed">
          Would you like to set this as your default language across all rooms, or keep it only for this chat room?
        </p>

        <div className="space-y-2 pt-2">
          <button
            onClick={onConfirmGlobal}
            className="w-full py-2.5 px-4 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-sm"
          >
            Yes, set as default for all rooms
          </button>
          <button
            onClick={onConfirmRoomOnly}
            className="w-full py-2.5 px-4 rounded-xl bg-[var(--bg-subtle)] text-[var(--text)] hover:bg-[var(--card-hover)] border border-[var(--border)] text-xs font-semibold transition-all cursor-pointer"
          >
            Only for this room
          </button>
          <button
            onClick={onCancel}
            className="w-full py-2 px-4 rounded-xl text-[var(--muted)] hover:text-[var(--text)] text-xs font-medium transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

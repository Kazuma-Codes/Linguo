"use client";

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
}

export function LogoutConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Log out of Mosaic?",
  description = "You can rejoin your rooms anytime by signing back in.",
}: LogoutConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 sm:p-7 max-w-sm w-full shadow-2xl text-center">
        <div className="text-4xl mb-3">👋</div>
        <h3 className="text-lg font-bold text-[var(--text)] mb-2">{title}</h3>
        <p className="text-sm text-[var(--muted)] mb-6">{description}</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="py-2.5 rounded-xl border border-[var(--border)] text-[var(--text)] font-semibold text-sm hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors cursor-pointer"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

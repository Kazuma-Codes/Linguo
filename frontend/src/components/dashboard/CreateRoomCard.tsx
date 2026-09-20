"use client";

interface CreateRoomCardProps {
  roomTitle: string;
  setRoomTitle: (title: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function CreateRoomCard({
  roomTitle,
  setRoomTitle,
  onSubmit,
}: CreateRoomCardProps) {
  return (
    <div className="bg-[var(--dashboard-card)] border border-[var(--card-border)] rounded-2xl p-6 sm:p-7 shadow-xs">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 flex items-center justify-center text-lg">
          ✨
        </span>
        <h2 className="text-xl font-bold text-[var(--text)]">Create a New Room</h2>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold tracking-wider uppercase text-[var(--muted)] mb-2">
            ROOM TITLE
          </label>
          <input
            type="text"
            value={roomTitle}
            onChange={(e) => setRoomTitle(e.target.value)}
            placeholder="e.g. Multilingual Standup"
            className="w-full bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] placeholder:text-[var(--muted)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-all"
          />
          <p className="text-xs text-[var(--muted)] mt-2">
            Omni-language room: your messages are automatically translated for every participant based on their preferred language seat.
          </p>
        </div>

        <button
          type="submit"
          className="w-full py-3.5 rounded-full bg-[var(--dashboard-btn)] text-[var(--dashboard-btn-text)] font-semibold text-base hover:opacity-90 transition-all shadow-sm active:scale-[0.99] cursor-pointer mt-2"
        >
          Create Room
        </button>
      </form>
    </div>
  );
}

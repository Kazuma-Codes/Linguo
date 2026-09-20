"use client";

interface JoinRoomCardProps {
  joinRoomId: string;
  setJoinRoomId: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function JoinRoomCard({
  joinRoomId,
  setJoinRoomId,
  onSubmit,
}: JoinRoomCardProps) {
  return (
    <div className="bg-[var(--dashboard-card)] border border-[var(--card-border)] rounded-2xl p-6 sm:p-7 shadow-xs">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 flex items-center justify-center text-lg">
          🔗
        </span>
        <h2 className="text-xl font-bold text-[var(--text)]">Join Existing Room</h2>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold tracking-wider uppercase text-[var(--muted)] mb-2">
            ROOM CODE OR INVITE LINK
          </label>
          <input
            type="text"
            required
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value)}
            placeholder="Paste invite link (https://...) or enter room code"
            className="w-full bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] placeholder:text-[var(--muted)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-all"
          />
          <p className="text-xs text-[var(--muted)] mt-2">
            You can paste a full invite URL or enter the room code directly.
          </p>
        </div>

        <button
          type="submit"
          className="w-full py-3.5 rounded-full bg-[var(--accent-light)] text-[var(--accent-text)] border border-[var(--accent)]/30 font-semibold text-base hover:opacity-90 transition-all shadow-sm active:scale-[0.99] cursor-pointer mt-2"
        >
          Join Room
        </button>
      </form>
    </div>
  );
}

"use client";

interface RoomSummary {
  id: string;
  title?: string;
  source_lang?: string;
  target_lang?: string;
}

interface RoomListCardProps {
  rooms: RoomSummary[];
  isRefreshing: boolean;
  onRefresh: () => void;
  onCopyRoomId: (id: string) => void;
  onEnterRoom: (id: string) => void;
}

export function RoomListCard({
  rooms,
  isRefreshing,
  onRefresh,
  onCopyRoomId,
  onEnterRoom,
}: RoomListCardProps) {
  return (
    <div className="bg-[var(--dashboard-card)] border border-[var(--card-border)] rounded-2xl p-6 sm:p-7 shadow-xs lg:sticky lg:top-24">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center text-lg">
            📚
          </span>
          <h2 className="text-xl font-bold text-[var(--text)]">Your Rooms</h2>
        </div>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="text-xs font-semibold border border-[var(--border)] bg-[var(--bg-subtle)] hover:bg-[var(--card)] text-[var(--muted)] hover:text-[var(--text)] px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <span>Refresh</span>
          <span className={isRefreshing ? 'animate-spin inline-block' : ''}>↻</span>
        </button>
      </div>

      {rooms.length === 0 ? (
        <div className="border-2 border-dashed border-[var(--border)] rounded-xl py-12 px-6 text-center text-[var(--muted)] bg-[var(--bg-subtle)]/40">
          <span className="text-3xl block mb-2">🗂️</span>
          <p className="font-medium text-sm">You haven&apos;t joined any rooms yet.</p>
        </div>
      ) : (
        <div className="space-y-3.5 max-h-[580px] overflow-y-auto pr-1">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)]/60 hover:bg-[var(--bg-subtle)] transition-all flex items-center justify-between gap-3 group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-sm truncate text-[var(--text)] max-w-[180px]">
                    {room.title || 'Untitled Room'}
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--accent-light)] text-[var(--accent-text)]">
                    Omni-Language
                  </span>
                </div>
                <p
                  className="font-mono text-[11px] text-[var(--muted)] mt-1 truncate max-w-[200px]"
                  title={room.id}
                >
                  {room.id}
                </p>
              </div>

              <div className="flex items-center gap-1.5 flex-none">
                <button
                  onClick={() => onCopyRoomId(room.id)}
                  title="Copy Room ID"
                  className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--card)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                </button>

                <button
                  onClick={() => onEnterRoom(room.id)}
                  className="px-3 py-1.5 rounded-lg bg-[var(--dashboard-btn)] text-[var(--dashboard-btn-text)] text-xs font-semibold hover:opacity-90 transition-all cursor-pointer"
                >
                  Enter →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

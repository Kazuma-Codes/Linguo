"use client";

export interface MemberInfo {
  email: string;
  language: string;
  joined_at?: string;
}

interface RoomDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  members: MemberInfo[];
  currentEmail?: string;
  langNames: Record<string, string>;
  onCopyCode: () => void;
}

export function RoomDetailsModal({
  isOpen,
  onClose,
  roomId,
  members,
  currentEmail,
  langNames,
  onCopyCode,
}: RoomDetailsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-[var(--text)]">📋 Room Details</h3>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--text)] text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Room ID */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--muted)] uppercase">Room Code</label>
          <div className="p-3 bg-[var(--bg-subtle)] rounded-xl font-mono text-xs text-[var(--text)] break-all border border-[var(--border)] flex items-center justify-between">
            <span>{roomId}</span>
            <button
              onClick={onCopyCode}
              className="px-2.5 py-1 rounded-lg bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-xs font-semibold hover:opacity-90 ml-2 cursor-pointer flex-none"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Member Roster with Seat Languages */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[var(--muted)] uppercase">
            Room Participants ({members.length})
          </label>
          <div className="p-3 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border)] space-y-2 max-h-48 overflow-y-auto">
            {members.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">No participant data available.</p>
            ) : (
              members.map((m) => (
                <div key={m.email} className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text)] font-medium truncate max-w-[200px]">
                    {m.email} {m.email === currentEmail && '(You)'}
                  </span>
                  <span className="font-bold text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent-light)] text-[var(--accent-text)] border border-[var(--accent)]/20 uppercase">
                    {langNames[m.language] || m.language}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Embed Code */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--muted)] uppercase">Embed Code</label>
          <pre className="p-3 bg-[var(--bg-subtle)] rounded-xl font-mono text-xs text-[var(--text)] overflow-x-auto border border-[var(--border)]">
            {`<iframe\n  src="${typeof window !== 'undefined' ? window.location.origin : ''}/chat/${roomId}"\n  width="100%"\n  height="600"\n  frameborder="0"\n/>`}
          </pre>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--text)] text-xs font-semibold hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

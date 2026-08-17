'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import type { AdminUser } from '@/lib/admin';
import type { Role } from '@/lib/session';

const ROLE_META: Record<Role, { label: string; badge: string; dot: string; desc: string }> = {
  super_admin: { label: 'Super Admin', badge: 'bg-purple-500/15 text-purple-300', dot: 'bg-purple-400', desc: 'Full control' },
  admin: { label: 'Admin', badge: 'bg-blue-500/15 text-blue-300', dot: 'bg-blue-400', desc: 'Profiles + app access' },
  bidder: { label: 'Bidder', badge: 'bg-green-500/15 text-green-300', dot: 'bg-green-400', desc: 'Standard access' },
  guest: { label: 'Guest', badge: 'bg-amber-500/15 text-amber-300', dot: 'bg-amber-400', desc: 'Revoked · no access' },
};

// A super_admin can assign these (the backend refuses to assign super_admin).
const ASSIGNABLE: Role[] = ['admin', 'bidder', 'guest'];

export function UserRow({
  user,
  actorRole,
  selfId,
}: {
  user: AdminUser;
  actorRole: Role;
  selfId: number;
}) {
  const isSelf = user.id === selfId;
  const isSuper = actorRole === 'super_admin';
  const meta = ROLE_META[user.role];

  return (
    <tr className="border-t border-[var(--border)]">
      <td className="py-2.5 pr-4">{user.email}</td>
      <td className="py-2.5 pr-4">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.badge}`}>{meta.label}</span>
      </td>
      <td className="py-2.5 pr-4 text-[var(--muted)]">{new Date(user.createdAt).toLocaleDateString()}</td>
      <td className="py-2.5">
        {isSelf ? (
          <span className="text-xs text-[var(--muted)]">you</span>
        ) : isSuper ? (
          <RoleSelect userId={user.id} current={user.role} />
        ) : (
          <span className="text-xs text-[var(--muted)]">—</span>
        )}
      </td>
    </tr>
  );
}

/** A dark-themed dropdown for changing a user's role. Menu is portaled so the
 *  table's horizontal-scroll wrapper can't clip it. */
function RoleSelect({ userId, current }: { userId: number; current: Role }) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const MENU_H = 172;
    function place() {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const below = window.innerHeight - r.bottom;
      const openUp = below < MENU_H && r.top > below;
      setPos({ left: r.left, top: openUp ? r.top - MENU_H - 6 : r.bottom + 6, width: r.width });
    }
    place();
    function onDown(e: MouseEvent) {
      if (!triggerRef.current?.contains(e.target as Node) && !menuRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function choose(role: Role) {
    setOpen(false);
    if (role === current) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Could not update role');
        return;
      }
      router.refresh();
    } catch {
      setError('Could not reach the server');
    } finally {
      setBusy(false);
    }
  }

  const meta = ROLE_META[current];

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        ref={triggerRef}
        type="button"
        disabled={busy}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex min-w-[150px] items-center justify-between gap-2 rounded-lg border bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium transition disabled:opacity-60 ${
          open ? 'border-[var(--primary)]' : 'border-[var(--border)] hover:border-[var(--border-strong)]'
        }`}
      >
        <span className="inline-flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
          <span className="text-[var(--text)]">{busy ? 'Saving…' : meta.label}</span>
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`h-3.5 w-3.5 shrink-0 text-[var(--muted)] transition ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {error && <span className="text-xs text-red-400">{error}</span>}

      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={{ position: 'fixed', left: pos.left, top: pos.top, minWidth: Math.max(pos.width, 220) }}
            className="z-50 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-2xl"
          >
            {ASSIGNABLE.map((r) => {
              const m = ROLE_META[r];
              const isCur = r === current;
              return (
                <button
                  key={r}
                  type="button"
                  role="option"
                  aria-selected={isCur}
                  onClick={() => choose(r)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-white/5 ${
                    isCur ? 'bg-white/5' : ''
                  }`}
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${m.dot}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-[var(--text)]">{m.label}</span>
                    <span className="block text-xs text-[var(--muted)]">{m.desc}</span>
                  </span>
                  {isCur && (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4 shrink-0 text-[var(--primary)]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminUser } from '@/lib/admin';
import type { Role } from '@/lib/session';

const ROLE_STYLES: Record<Role, string> = {
  super_admin: 'bg-purple-500/15 text-purple-300',
  admin: 'bg-blue-500/15 text-blue-300',
  bidder: 'bg-green-500/15 text-green-300',
  guest: 'bg-amber-500/15 text-amber-300',
};

export function UserRow({
  user,
  actorRole,
  selfId,
}: {
  user: AdminUser;
  actorRole: Role;
  selfId: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setRole(role: Role) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Failed');
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const isSelf = user.id === selfId;
  const isSuper = actorRole === 'super_admin';

  return (
    <tr className="border-t border-[var(--border)]">
      <td className="py-2.5 pr-4">{user.email}</td>
      <td className="py-2.5 pr-4">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_STYLES[user.role]}`}>
          {user.role}
        </span>
      </td>
      <td className="py-2.5 pr-4 text-[var(--muted)]">{new Date(user.createdAt).toLocaleDateString()}</td>
      <td className="py-2.5">
        {isSelf ? (
          <span className="text-xs text-[var(--muted)]">you</span>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {user.role !== 'bidder' && (
              <ActionButton disabled={busy} onClick={() => setRole('bidder')}>
                {user.role === 'guest' ? 'Approve as bidder' : 'Make bidder'}
              </ActionButton>
            )}
            {isSuper && user.role !== 'admin' && (
              <ActionButton disabled={busy} onClick={() => setRole('admin')}>
                {user.role === 'guest' ? 'Approve as admin' : 'Make admin'}
              </ActionButton>
            )}
            {isSuper && user.role !== 'guest' && (
              <ActionButton disabled={busy} onClick={() => setRole('guest')} variant="danger">
                Revoke
              </ActionButton>
            )}
            {error && <span className="text-xs text-red-400">{error}</span>}
          </div>
        )}
      </td>
    </tr>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  variant = 'default',
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
}) {
  const base =
    variant === 'danger'
      ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
      : 'border-[var(--border)] text-[var(--text)] hover:border-[var(--border-strong)] hover:bg-white/5';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border bg-[var(--surface-2)] px-2.5 py-1 text-xs font-medium transition disabled:opacity-50 ${base}`}
    >
      {children}
    </button>
  );
}

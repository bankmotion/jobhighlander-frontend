'use client';

import { useRouter } from 'next/navigation';

export function LogoutButton({ full = false }: { full?: boolean }) {
  const router = useRouter();
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      className={`jh-press flex items-center gap-1.5 rounded-lg text-sm text-[var(--text)] transition hover:text-red-400 ${
        full
          ? 'w-full px-3 py-2 hover:bg-red-500/10'
          : 'border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 hover:border-red-500/40'
      }`}
    >
      <span aria-hidden>⎋</span> Logout
    </button>
  );
}

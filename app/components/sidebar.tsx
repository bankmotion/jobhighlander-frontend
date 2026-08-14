'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { Role } from '@/lib/session';

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const isAdmin = role === 'admin' || role === 'super_admin';
  const superAdmin = role === 'super_admin';

  const linkCls = (active: boolean) =>
    `mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
      active
        ? 'bg-[var(--primary)]/15 font-medium text-white'
        : 'text-[var(--muted)] hover:bg-white/5 hover:text-white'
    }`;

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] md:flex md:sticky md:top-0 md:h-screen md:self-start md:overflow-y-auto">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] text-sm font-bold text-white">
          JH
        </span>
        <span className="text-[15px] font-semibold tracking-tight">JobHighLander</span>
      </div>

      <nav className="flex-1 px-3 py-2">
        <Link href="/" className={linkCls(pathname === '/')}>
          <span className="text-base">💼</span> Jobs
        </Link>

        {isAdmin && (
          <NavGroup icon="🛠️" label="Admin" active={pathname.startsWith('/admin/profiles')}>
            <Link
              href="/admin/profiles"
              className={linkCls(pathname.startsWith('/admin/profiles'))}
            >
              <span className="text-base">🧑‍💼</span> Profiles
            </Link>
          </NavGroup>
        )}

        {superAdmin && (
          <NavGroup
            icon="🛡️"
            label="Super Admin"
            active={pathname === '/admin' || pathname.startsWith('/admin/keywords')}
          >
            <Link href="/admin" className={linkCls(pathname === '/admin')}>
              <span className="text-base">👥</span> Users
            </Link>
            <Link href="/admin/keywords" className={linkCls(pathname.startsWith('/admin/keywords'))}>
              <span className="text-base">🏷️</span> Keywords
            </Link>
          </NavGroup>
        )}
      </nav>

      <div className="px-5 py-4 text-xs text-[var(--muted)]">© 2026 JobHighLander</div>
    </aside>
  );
}

/** Collapsible sidebar group; opens by default when one of its links is active. */
function NavGroup({
  icon,
  label,
  active,
  children,
}: {
  icon: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(active);
  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
          active ? 'text-white' : 'text-[var(--muted)] hover:bg-white/5 hover:text-white'
        }`}
      >
        <span className="text-base">{icon}</span>
        <span className="flex-1 text-left">{label}</span>
        <span className={`transition-transform duration-200 ${open ? 'rotate-90' : ''}`} aria-hidden>
          ›
        </span>
      </button>
      <div
        className="overflow-hidden pl-4 transition-[max-height] duration-300 ease-in-out"
        style={{ maxHeight: open ? '160px' : '0px' }}
      >
        {children}
      </div>
    </div>
  );
}

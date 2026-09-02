'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { Role } from '@/lib/session';
import type { ProfileSummary } from '@/lib/types';

const profileLabel = (p: ProfileSummary): string =>
  [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email || `Profile #${p.id}`;

export function Sidebar({ role, profiles }: { role: Role; profiles: ProfileSummary[] }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const isAdmin = role === 'admin' || role === 'super_admin';
  const superAdmin = role === 'super_admin';

  const onJobs = pathname === '/';
  // Which profile the job list is currently showing resumes for. Mirrors the
  // page's own resolution exactly — `?profile=` wins, otherwise the first
  // profile — so the highlighted entry always matches what the page rendered.
  const wanted = Number(params.get('profile'));
  const activeProfileId = profiles.find((p) => p.id === wanted)?.id ?? profiles[0]?.id ?? null;

  const jobsHref = (profileId: number): string => {
    const next = new URLSearchParams(onJobs ? params.toString() : '');
    next.set('profile', String(profileId));
    next.delete('page');
    return `/?${next.toString()}`;
  };

  const onInterviews = pathname.startsWith('/interviews');

  const interviewProfileId = onInterviews
    ? (profiles.find((p) => p.id === Number(params.get('profile')))?.id ?? null)
    : null;

  const interviewsHref = (profileId: number) => `/interviews?profile=${profileId}`;

  const linkCls = (active: boolean) =>
    `mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
      active
        ? 'bg-[var(--primary)]/15 font-medium text-white'
        : 'text-[var(--muted)] hover:bg-white/5 hover:text-white'
    }`;

  return (
    <aside id="jh-sidebar" className="hidden w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] md:flex md:sticky md:top-0 md:h-screen md:self-start md:overflow-y-auto">
      <div className="flex flex-col items-center gap-2 px-5 pb-4 pt-5">
        <Image
          src="/logo.png"
          alt=""
          width={560}
          height={403}
          loading="eager"
          className="h-auto w-[150px] select-none"
        />
        <span className="text-[15px] font-semibold tracking-tight">JobHighLander</span>
      </div>

      <nav className="flex-1 px-3 py-2">
        {profiles.length > 0 ? (
          <NavGroup
            icon="💼"
            label="Jobs"
            active={onJobs}
            // Jobs is the primary destination, so it stays expanded even when
            // the user is elsewhere: collapsed, reaching a job list from the
            // Profiles page would cost a click to open the group and another to
            // choose, where it used to cost one.
            defaultOpen
            maxHeight={profiles.length * 40 + 16}
          >
            {profiles.map((p) => (
              <Link
                key={p.id}
                href={jobsHref(p.id)}
                className={linkCls(onJobs && p.id === activeProfileId)}
                title={p.canEdit ? undefined : `Shared by ${p.owner.email}`}
              >
                <span className="text-base">{p.canEdit ? '🧑' : '🤝'}</span>
                <span className="truncate">{profileLabel(p)}</span>
              </Link>
            ))}
          </NavGroup>
        ) : (
          <Link href="/" className={linkCls(onJobs)}>
            <span className="text-base">💼</span> Jobs
          </Link>
        )}

        {profiles.length > 0 ? (
          <NavGroup
            icon="🗓️"
            label="Interviews"
            active={onInterviews}
            maxHeight={profiles.length * 40 + 56}
          >
            <Link href="/interviews" className={linkCls(onInterviews && !interviewProfileId)}>
              <span className="text-base">📋</span> All profiles
            </Link>
            {profiles.map((p) => (
              <Link
                key={p.id}
                href={interviewsHref(p.id)}
                className={linkCls(onInterviews && p.id === interviewProfileId)}
                title={p.canEdit ? undefined : `Shared by ${p.owner.email}`}
              >
                <span className="text-base">{p.canEdit ? '🧑' : '🤝'}</span>
                <span className="truncate">{profileLabel(p)}</span>
              </Link>
            ))}
          </NavGroup>
        ) : (
          <Link href="/interviews" className={linkCls(onInterviews)}>
            <span className="text-base">🗓️</span> Interviews
          </Link>
        )}

        <Link href="/calendar" className={linkCls(pathname.startsWith('/calendar'))}>
          <span className="text-base">📅</span> Calendar
        </Link>

        <Link href="/profiles" className={linkCls(pathname.startsWith('/profiles'))}>
          <span className="text-base">👤</span> Profiles
        </Link>

        <NavGroup
          icon="📊"
          label="My Statistics"
          active={pathname.startsWith('/statistics')}
          maxHeight={120}
        >
          <Link
            href="/statistics/bid-performance"
            className={linkCls(pathname.startsWith('/statistics/bid-performance'))}
          >
            Bid performance
          </Link>
          <Link
            href="/statistics/ai-usage"
            className={linkCls(pathname.startsWith('/statistics/ai-usage'))}
          >
            AI usage
          </Link>
        </NavGroup>

        {isAdmin && (
          <NavGroup
            icon="🛠️"
            label="Admin"
            active={
              pathname.startsWith('/admin/bidders') ||
              pathname.startsWith('/admin/templates')
            }
          >
            <Link href="/admin/bidders" className={linkCls(pathname.startsWith('/admin/bidders'))}>
              <span className="text-base">🤝</span> Bidders
            </Link>
            <Link
              href="/admin/templates"
              className={linkCls(pathname.startsWith('/admin/templates'))}
            >
              <span className="text-base">📄</span> Resume Templates
            </Link>
          </NavGroup>
        )}

        {superAdmin && (
          <NavGroup
            icon="🛡️"
            label="Super Admin"
            active={
              pathname === '/admin' ||
              pathname.startsWith('/admin/profiles') ||
              pathname.startsWith('/admin/bid-performance') ||
              pathname.startsWith('/admin/ai-usage') ||
              pathname.startsWith('/admin/payments') ||
              pathname.startsWith('/admin/prompts') ||
              pathname.startsWith('/admin/keywords') ||
              pathname.startsWith('/admin/stage-types') ||
              pathname.startsWith('/admin/scrape-runs') ||
              pathname.startsWith('/admin/scraper-settings')
            }
            // Ten entries at ~40px each. The group is `overflow-hidden` with
            // no scrollbar, so anything past this height is not merely cut off
            // — it is unreachable and gives no hint that it exists. Raise this
            // whenever a link is added.
            maxHeight={470}
          >
            <Link href="/admin" className={linkCls(pathname === '/admin')}>
              <span className="text-base">👥</span> Users
            </Link>
            <Link
              href="/admin/profiles"
              className={linkCls(pathname.startsWith('/admin/profiles'))}
            >
              <span className="text-base">🗂️</span> Profiles
            </Link>
            <Link
              href="/admin/bid-performance"
              className={linkCls(pathname.startsWith('/admin/bid-performance'))}
            >
              <span className="text-base">📈</span> Bid Performance (all)
            </Link>
            <Link
              href="/admin/ai-usage"
              className={linkCls(pathname.startsWith('/admin/ai-usage'))}
            >
              <span className="text-base">💸</span> AI Usage (all)
            </Link>
            <Link
              href="/admin/payments"
              className={linkCls(pathname.startsWith('/admin/payments'))}
            >
              <span className="text-base">💳</span> Payments
            </Link>
            <Link href="/admin/prompts" className={linkCls(pathname.startsWith('/admin/prompts'))}>
              <span className="text-base">🗣</span> Prompts
            </Link>
            <Link href="/admin/keywords" className={linkCls(pathname.startsWith('/admin/keywords'))}>
              <span className="text-base">🏷️</span> Keywords
            </Link>
            <Link
              href="/admin/stage-types"
              className={linkCls(pathname.startsWith('/admin/stage-types'))}
            >
              <span className="text-base">🪜</span> Interview Stages
            </Link>
            <Link href="/admin/scrape-runs" className={linkCls(pathname.startsWith('/admin/scrape-runs'))}>
              <span className="text-base">📊</span> Scrape Status
            </Link>
            <Link
              href="/admin/scraper-settings"
              className={linkCls(pathname.startsWith('/admin/scraper-settings'))}
            >
              <span className="text-base">⚙️</span> Scraper Settings
            </Link>
          </NavGroup>
        )}
      </nav>

      <div className="px-5 py-4 text-xs text-[var(--muted)]">© 2026 JobHighLander</div>
    </aside>
  );
}

function NavGroup({
  icon,
  label,
  active,
  defaultOpen,
  maxHeight = 260,
  children,
}: {
  icon: string;
  label: string;
  active: boolean;
  defaultOpen?: boolean;
  maxHeight?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? active);
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
        style={{ maxHeight: open ? `${maxHeight}px` : '0px' }}
      >
        {children}
      </div>
    </div>
  );
}

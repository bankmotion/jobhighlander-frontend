'use client';

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

  /**
   * A job list scoped to one profile.
   *
   * The current search and filters ride along when we are already on the job
   * list, so switching profile re-reads the SAME list of jobs against a
   * different resume history rather than silently resetting the user's query.
   * `page` is dropped for the same reason the in-page picker drops it: resume
   * status is fetched for the jobs on screen, and a deep page after a switch
   * shows a list nobody asked for.
   */
  const jobsHref = (profileId: number): string => {
    const next = new URLSearchParams(onJobs ? params.toString() : '');
    next.set('profile', String(profileId));
    next.delete('page');
    return `/?${next.toString()}`;
  };

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
        {/* One entry per profile. Each is the same job list read against that
            profile's resumes, which is what makes them separately manageable.
            Shown from the FIRST profile, not the second: the group is what
            tells you the list you are looking at belongs to a profile at all,
            and a nav that changes shape when a second one appears teaches the
            layout twice. Only a user with none falls back to a plain link. */}
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

        {/* Profiles is NOT under Admin: bidders open it too, for the profiles
            they were invited to. Only creating one is an admin action. */}
        <Link href="/profiles" className={linkCls(pathname.startsWith('/profiles'))}>
          <span className="text-base">👤</span> Profiles
        </Link>

        {/* Also not under Admin, and for the same reason: generating a resume
            spends real money on a shared key, so the person deciding whether to
            regenerate is the one who needs to see the cost. Scoped to the
            caller by the API, so a bidder sees only their own. */}
        <Link href="/ai-usage" className={linkCls(pathname === '/ai-usage')}>
          <span className="text-base">💰</span> My AI Usage
        </Link>

        {isAdmin && (
          <NavGroup
            icon="🛠️"
            label="Admin"
            active={
              pathname.startsWith('/admin/bidders') || pathname.startsWith('/admin/templates')
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
              pathname.startsWith('/admin/prompts') ||
              pathname.startsWith('/admin/keywords') ||
              pathname.startsWith('/admin/scrape-runs') ||
              pathname.startsWith('/admin/scraper-settings')
            }
          >
            <Link href="/admin" className={linkCls(pathname === '/admin')}>
              <span className="text-base">👥</span> Users
            </Link>
            <Link href="/admin/prompts" className={linkCls(pathname.startsWith('/admin/prompts'))}>
              <span className="text-base">🗣</span> Prompts
            </Link>
            <Link href="/admin/keywords" className={linkCls(pathname.startsWith('/admin/keywords'))}>
              <span className="text-base">🏷️</span> Keywords
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

/** Collapsible sidebar group; opens by default when one of its links is active. */
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
  /** Initial open state. Defaults to `active` — open the group you are in. */
  defaultOpen?: boolean;
  /**
   * Open height in px. The transition needs a concrete value, and the Jobs
   * group grows with the profile count — a fixed 260 would clip the seventh
   * profile out of reach with no scrollbar to hint that it existed.
   */
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

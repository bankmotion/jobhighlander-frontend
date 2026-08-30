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

  const onInterviews = pathname.startsWith('/interviews');

  /**
   * Which profile the interview list is filtered to, or null for "all".
   *
   * UNLIKE `activeProfileId`, this does NOT fall back to the first profile. The
   * interviews page has a genuine unfiltered state — the whole point of it is
   * seeing what is scheduled across every candidate — so a missing `?profile=`
   * means "all", not "the first one", and highlighting a profile there would
   * claim a filter that is not applied.
   */
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
    <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] md:flex md:sticky md:top-0 md:h-screen md:self-start md:overflow-y-auto">
      {/* Full logo, uncropped. It is illustration rather than a lettermark,
          so it needs real width to read — hence a stacked block here instead
          of a chip beside the wordmark. */}
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

        {/* Interviews mirrors Jobs: one child per profile, because a process
            belongs to a profile and two bidders working different candidates
            must not see each other's schedule merged into one list.

            Not under Admin, for the same reason Profiles is not — bidders are
            who actually sit the interviews. Scoped to usable profiles by the
            API regardless of what the URL asks for. */}
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

        {/* A SINGLE entry, unlike Interviews above, and that is the point: the
            calendar merges every profile onto one grid so a clash between two
            candidates is visible. Splitting it per profile in the nav would
            hide exactly the collision it exists to surface. */}
        <Link href="/calendar" className={linkCls(pathname.startsWith('/calendar'))}>
          <span className="text-base">📅</span> Calendar
        </Link>

        {/* Profiles is NOT under Admin: bidders open it too, for the profiles
            they were invited to. Only creating one is an admin action. */}
        <Link href="/profiles" className={linkCls(pathname.startsWith('/profiles'))}>
          <span className="text-base">👤</span> Profiles
        </Link>

        {/* Also not under Admin, and for the same reason: generating a resume
            spends real money on a shared key, so the person deciding whether to
            regenerate is the one who needs to see the cost. Scoped to the
            caller by the API, so a bidder sees only their own. */}
        {/* "My" is load-bearing, not decoration: both dashboards are scoped to
            the signed-in user — their own bids, their own AI spend — and on a
            shared profile that is a different number from the profile's total.
            Neither is admin: the person spending the budget and working the
            pipeline is exactly who needs to see them. */}
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
              pathname.startsWith('/admin/ai-usage') ||
              pathname.startsWith('/admin/prompts') ||
              pathname.startsWith('/admin/keywords') ||
              pathname.startsWith('/admin/stage-types') ||
              pathname.startsWith('/admin/scrape-runs') ||
              pathname.startsWith('/admin/scraper-settings')
            }
            // Seven entries at ~40px each. The group is `overflow-hidden` with
            // no scrollbar, so anything past this height is not merely cut off
            // — it is unreachable and gives no hint that it exists. Raise this
            // whenever a link is added.
            maxHeight={340}
          >
            <Link href="/admin" className={linkCls(pathname === '/admin')}>
              <span className="text-base">👥</span> Users
            </Link>
            {/* All users, all profiles. "My AI Usage" above is the same figures
                scoped to the caller; this is the shared key's whole bill, which
                is why it sits behind super admin rather than next to it. */}
            <Link
              href="/admin/ai-usage"
              className={linkCls(pathname.startsWith('/admin/ai-usage'))}
            >
              <span className="text-base">💸</span> AI Usage (all)
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

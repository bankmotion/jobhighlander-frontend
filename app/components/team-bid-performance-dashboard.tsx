'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AppliedApplications, WhoBid } from './bid-applied-parts';
import { AppliedJobPanelProvider } from './applied-job-panel';
import { teamBidPrefs } from '@/lib/view-prefs';
import { bucketDaily, dateInputValue, pctText, siteLabel, RANGES, SERIES } from '@/lib/stats';
import {
  lastBidLabel,
  ROLE_TONE,
  type ProfileBidRow,
  type ProfileMemberStats,
  type TeamBidPerformance,
} from '@/lib/team-stats';

type ProfileSort = 'applications' | 'interviews' | 'rate' | 'members' | 'name';
type MemberSort = 'applications' | 'interviews' | 'rate' | 'discarded' | 'email';

const PROFILE_SORTS: { key: ProfileSort; label: string }[] = [
  { key: 'applications', label: 'Bids' },
  { key: 'interviews', label: 'Interviews' },
  { key: 'rate', label: 'Interview rate' },
  { key: 'members', label: 'Team size' },
  { key: 'name', label: 'Name' },
];

export function TeamBidPerformanceDashboard({
  data,
  custom,
  todayPreset,
}: {
  data: TeamBidPerformance;
  custom: { from: string; to: string } | null;
  todayPreset?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [days, setDays] = useState(data.range.days);
  const [from, setFrom] = useState(custom?.from ?? dateInputValue(new Date(data.range.from)));
  const [to, setTo] = useState(custom?.to ?? dateInputValue(new Date(data.range.to)));
  const today = dateInputValue(new Date());
  const rangeInvalid = from > to;

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<ProfileSort>('applications');
  const [hideIdle, setHideIdle] = useState(false);
  // Expanded by default: this page exists to show the members, so collapsing
  // them behind a click would hide the thing it is for.
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  const series = useMemo(() => bucketDaily(data.daily), [data.daily]);

  function navigate(
    next: {
      days?: number;
      preset?: 'today' | null;
      from?: string;
      to?: string;
      profile?: string | null;
      bidder?: string | null;
    } = {},
  ) {
    const q = new URLSearchParams();
    // Precedence, most explicit first: an argument the caller passed, then
    // whatever is currently showing. Each branch sets exactly one range param,
    // so the server never has to arbitrate between two of them.
    const wantsToday =
      next.preset === 'today' ||
      (next.preset === undefined && !next.days && !next.from && todayPreset);
    const useCustom = next.from && next.to ? true : next.days || wantsToday ? false : Boolean(custom);
    if (wantsToday) {
      q.set('preset', 'today');
    } else if (useCustom) {
      q.set('from', next.from ?? custom!.from);
      q.set('to', next.to ?? custom!.to);
    } else {
      q.set('days', String(next.days ?? days));
    }
    // Carried through every range change. Without this, picking a profile and
    // then switching to "7 days" would quietly widen back to every profile
    // while the picker still showed the chosen one.
    const p = next.profile !== undefined ? next.profile : data.profileId ? String(data.profileId) : null;
    if (p) q.set('profile', p);
    const b = next.bidder !== undefined ? next.bidder : data.bidder ? String(data.bidder) : null;
    if (b) q.set('user', b);
    teamBidPrefs.save(q.toString());
    startTransition(() => router.push(`?${q}`, { scroll: false }));
  }

  function setRange(next: number) {
    setDays(next);
    // Clearing from/to and preset is what makes a range click override both a
    // custom range and Today.
    navigate({ days: next, preset: null, from: undefined, to: undefined });
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = data.profiles;
    if (q) {
      // Matches the profile, its owner, or any member, so searching a person's
      // email finds every profile they work on.
      rows = rows.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.owner.email.toLowerCase().includes(q) ||
          p.members.some((m) => m.email.toLowerCase().includes(q)),
      );
    }
    if (hideIdle) rows = rows.filter((p) => p.totals.applications > 0);
    const sorted = [...rows];
    sorted.sort((a, b) => {
      switch (sort) {
        case 'interviews': return b.totals.interviews - a.totals.interviews;
        case 'rate': return b.rates.interview - a.rates.interview;
        case 'members': return b.memberCount - a.memberCount;
        case 'name': return a.name.localeCompare(b.name);
        default: return b.totals.applications - a.totals.applications;
      }
    });
    return sorted;
  }, [data.profiles, query, sort, hideIdle]);

  const idleProfiles = data.profiles.filter((p) => p.totals.applications === 0).length;
  const idleMembers = data.byBidder.filter((b) => b.applications === 0).length;

  return (
    <AppliedJobPanelProvider>
    <div className={pending ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      <div className="mb-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Today is the calendar day; the 24 hours button beside it is a
              rolling window. Both are offered because they answer different
              questions and disagree for most of the day. */}
          <button
            type="button"
            onClick={() =>
              navigate({ preset: 'today', days: undefined, from: undefined, to: undefined })
            }
            aria-pressed={Boolean(todayPreset)}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${
              todayPreset
                ? 'bg-[var(--primary)] font-medium text-white'
                : 'border border-[var(--border)] text-[var(--muted)] hover:bg-white/5 hover:text-white'
            }`}
          >
            Today
          </button>
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => setRange(r.days)}
              aria-pressed={!custom && !todayPreset && days === r.days}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                !custom && !todayPreset && days === r.days
                  ? 'bg-[var(--primary)] font-medium text-white'
                  : 'border border-[var(--border)] text-[var(--muted)] hover:bg-white/5 hover:text-white'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">From</span>
            <input
              type="date"
              value={from}
              max={today}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">To</span>
            <input
              type="date"
              value={to}
              max={today}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
            />
          </label>
          <button
            type="button"
            onClick={() => navigate({ from, to })}
            disabled={rangeInvalid}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text)] transition hover:bg-white/5 disabled:opacity-50"
          >
            Apply range
          </button>
          {custom && (
            <button
              type="button"
              onClick={() => setRange(1)}
              className="rounded-lg px-2 py-1.5 text-sm text-[var(--muted)] underline transition hover:text-white"
            >
              Clear
            </button>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              Profile
            </span>
            <select
              value={data.profileId ?? ''}
              onChange={(e) => navigate({ profile: e.target.value || null })}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
            >
              <option value="">All profiles</option>
              {data.allProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              Bidder
            </span>
            <select
              value={data.bidder ?? ''}
              onChange={(e) => navigate({ bidder: e.target.value || null })}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
            >
              <option value="">All team members</option>
              {data.bidders.map((b) => (
                <option key={b.userId} value={b.userId}>
                  {b.email}
                </option>
              ))}
            </select>
          </label>
        </div>

        {rangeInvalid && (
          <p className="text-xs text-red-400">The start date must be on or before the end date.</p>
        )}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Profiles" value={data.totals.profiles} hint={`${idleProfiles} with no bids in range`} />
        <Stat
          label="Bidders"
          value={data.totals.members}
          hint={`${data.totals.activeBidders} active, ${idleMembers} idle`}
        />
        <Stat
          label="Bids sent"
          value={data.totals.applications}
          hint={`${data.totals.companies} companies`}
        />
        <Stat
          label="Interviews"
          value={data.totals.interviews}
          hint={`${pctText(data.rates.interview)} conversion`}
        />
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Live interviews" value={data.totals.activeInterviews} hint="In progress now" />
        <Stat label="Offers" value={data.totals.offers} hint={`${pctText(data.rates.offer)} of bids`} />
        <Stat label="Accepted" value={data.totals.accepted} hint={`${pctText(data.rates.accepted)} of bids`} />
        <Stat label="Discarded" value={data.totals.discarded} hint="Postings dismissed in range" />
      </div>

      {data.totals.applications === 0 ? (
        <Card title="No bids in this range">
          <Empty>
            Nothing was sent between {new Date(data.range.from).toLocaleDateString()} and{' '}
            {new Date(data.range.to).toLocaleDateString()}. Widen the range, or check that bids are
            being marked as applied.
          </Empty>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card title="Bids over time" note="Whole organisation. Empty days are plotted as zero.">
            <TrendChart series={series} />
          </Card>

          <WhoBid
            total={data.totals.applications}
            note="Who submitted these applications across every profile in the system."
            slices={data.byBidder.map((b) => ({
              key: String(b.userId),
              label: b.email,
              count: b.applications,
              sublabel: `${b.role} · ${b.profiles} ${b.profiles === 1 ? 'profile' : 'profiles'}`,
            }))}
          />

          <AppliedApplications rows={data.applied} total={data.totals.applications} showProfile />

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="By bidder" note="Every member, summed across all profiles they belong to">
              <BidderTable rows={data.byBidder} />
            </Card>
            <Card title="By source" note="Which board the bids came from">
              <SiteTable rows={data.bySite} />
            </Card>
          </div>
        </div>
      )}

      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white">Profiles and their members</h2>
            <p className="mt-0.5 text-sm text-[var(--muted)]">
              Showing {visible.length} of {data.profiles.length}. Members with no activity are listed
              too, because a zero is the finding.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                Search
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Profile, owner or member"
                className="w-56 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                Sort by
              </span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as ProfileSort)}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
              >
                {PROFILE_SORTS.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 pb-1.5 text-sm text-[var(--muted)]">
              <input
                type="checkbox"
                checked={hideIdle}
                onChange={(e) => setHideIdle(e.target.checked)}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              Hide idle profiles
            </label>
          </div>
        </div>

        {visible.length === 0 ? (
          <Card title="Nothing matches">
            <Empty>No profile, owner or member matches “{query}”.</Empty>
          </Card>
        ) : (
          <div className="space-y-4">
            {visible.map((p) => (
              <ProfileCard
                key={p.profileId}
                profile={p}
                collapsed={collapsed.has(p.profileId)}
                onToggle={() =>
                  setCollapsed((prev) => {
                    const next = new Set(prev);
                    if (next.has(p.profileId)) next.delete(p.profileId);
                    else next.add(p.profileId);
                    return next;
                  })
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
    </AppliedJobPanelProvider>
  );
}

function ProfileCard({
  profile,
  collapsed,
  onToggle,
}: {
  profile: ProfileBidRow;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const [sort, setSort] = useState<MemberSort>('applications');
  const idle = profile.totals.applications === 0;

  const members = useMemo(() => {
    const rows = [...profile.members];
    rows.sort((a, b) => {
      switch (sort) {
        case 'interviews': return b.interviews - a.interviews;
        case 'rate': return b.rates.interview - a.rates.interview;
        case 'discarded': return b.discarded - a.discarded;
        case 'email': return a.email.localeCompare(b.email);
        default: return b.applications - a.applications;
      }
    });
    return rows;
  }, [profile.members, sort]);

  return (
    <section
      className={`rounded-xl border bg-[var(--surface)] transition ${
        idle ? 'border-dashed border-[var(--border)]' : 'border-[var(--border)]'
      }`}
    >
      <header className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold tracking-tight text-white">{profile.name}</h3>
            <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-xs text-[var(--muted)]">
              #{profile.profileId}
            </span>
            {idle && (
              <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-300">
                No bids in range
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Owner <span className="font-medium text-[var(--text)]">{profile.owner.email}</span> ·{' '}
            {profile.memberCount} {profile.memberCount === 1 ? 'member' : 'members'} ·{' '}
            {profile.activeBidders} active · last bid {lastBidLabel(profile.lastBidAt)}
          </p>
        </div>

        <div className="flex items-center gap-5">
          <MiniStat label="Bids" value={profile.totals.applications} />
          <MiniStat label="Interviews" value={profile.totals.interviews} />
          <MiniStat label="Rate" value={pctText(profile.rates.interview)} />
          <MiniStat label="Live" value={profile.totals.activeInterviews} />
          <MiniStat label="Discards" value={profile.totals.discarded} />
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={!collapsed}
            className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--muted)] transition hover:bg-white/5 hover:text-white"
          >
            {collapsed ? 'Show members' : 'Hide members'}
            <span
              aria-hidden
              className={`ml-1.5 inline-block transition-transform ${collapsed ? '' : 'rotate-180'}`}
            >
              ▾
            </span>
          </button>
        </div>
      </header>

      {!collapsed && (
        <div className="jh-expand border-t border-[var(--border)] px-5 pb-5 pt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-white">Members</h4>
            <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
              Sort
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as MemberSort)}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-xs text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
              >
                <option value="applications">Bids</option>
                <option value="interviews">Interviews</option>
                <option value="rate">Interview rate</option>
                <option value="discarded">Discards</option>
                <option value="email">Email</option>
              </select>
            </label>
          </div>
          <MemberTable rows={members} />
        </div>
      )}
    </section>
  );
}

function MemberTable({ rows }: { rows: ProfileMemberStats[] }) {
  if (rows.length === 0) return <Empty>This profile has no members.</Empty>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
            <th className="pb-2 pr-3 font-medium">Member</th>
            <th className="pb-2 pr-3 text-right font-medium">Bids</th>
            <th className="pb-2 pr-3 text-right font-medium">Interviews</th>
            <th className="pb-2 pr-3 text-right font-medium">Rate</th>
            <th className="pb-2 pr-3 text-right font-medium">Offers</th>
            <th className="pb-2 pr-3 text-right font-medium">Live</th>
            <th className="pb-2 pr-3 text-right font-medium">Discards</th>
            <th className="pb-2 pr-3 text-right font-medium">Companies</th>
            <th className="pb-2 text-right font-medium">Last bid</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => {
            const idle = m.applications === 0;
            return (
              <tr
                key={m.userId}
                className={`border-b border-[var(--border)] last:border-0 ${
                  idle ? 'text-[var(--muted)]' : 'text-[var(--text)]'
                }`}
              >
                <td className="py-2 pr-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={idle ? '' : 'font-medium'}>{m.email}</span>
                    {m.isOwner && (
                      <span className="rounded bg-[var(--primary)]/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--primary)]">
                        Owner
                      </span>
                    )}
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        ROLE_TONE[m.role] ?? 'bg-[var(--surface-2)] text-[var(--muted)]'
                      }`}
                    >
                      {m.role}
                    </span>
                  </div>
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">{m.applications}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{m.interviews}</td>
                <td className="py-2 pr-3 text-right tabular-nums">
                  {m.applications === 0 ? '—' : pctText(m.rates.interview)}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">{m.offers}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{m.activeInterviews}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{m.discarded}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{m.companies}</td>
                <td className="py-2 text-right">{lastBidLabel(m.lastBidAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BidderTable({ rows }: { rows: TeamBidPerformance['byBidder'] }) {
  if (rows.length === 0) return <Empty>No members yet.</Empty>;
  const max = Math.max(1, ...rows.map((r) => r.applications));
  return (
    <ul className="space-y-2">
      {rows.map((b) => (
        <li key={b.userId}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-[var(--text)]">{b.email}</span>
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                  ROLE_TONE[b.role] ?? 'bg-[var(--surface-2)] text-[var(--muted)]'
                }`}
              >
                {b.role}
              </span>
            </span>
            <span className="shrink-0 tabular-nums text-[var(--muted)]">
              {b.applications} bids · {b.interviews} iv ·{' '}
              {b.applications === 0 ? '—' : pctText(b.rates.interview)}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
            <div
              className="h-full rounded-full"
              style={{ width: `${(b.applications / max) * 100}%`, background: SERIES }}
            />
          </div>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            across {b.profiles} {b.profiles === 1 ? 'profile' : 'profiles'}
          </p>
        </li>
      ))}
    </ul>
  );
}

function SiteTable({ rows }: { rows: TeamBidPerformance['bySite'] }) {
  if (rows.length === 0) return <Empty>No bids in this range.</Empty>;
  const max = Math.max(1, ...rows.map((r) => r.applications));
  return (
    <ul className="space-y-2">
      {rows.map((s) => (
        <li key={s.site}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-[var(--text)]">{siteLabel(s.site)}</span>
            <span className="tabular-nums text-[var(--muted)]">
              {s.applications} bids · {s.interviews} iv · {pctText(s.rate)}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
            <div
              className="h-full rounded-full"
              style={{ width: `${(s.applications / max) * 100}%`, background: SERIES }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function TrendChart({
  series,
}: {
  series: { key: string; label: string; applications: number; interviews: number }[];
}) {
  const max = Math.max(1, ...series.map((d) => d.applications));
  const H = 132;
  return (
    <div>
      <div className="flex h-[132px] items-end gap-[2px]" role="img" aria-label="Bids over time">
        {series.map((d) => {
          const h = d.applications === 0 ? 0 : Math.max(3, Math.round((d.applications / max) * H));
          const peak = d.applications === max && max > 0;
          return (
            <div
              key={d.key}
              className="group relative flex flex-1 flex-col items-center justify-end"
              style={{ height: H }}
            >
              {peak && (
                <span className="mb-1 text-xs font-semibold tabular-nums text-[var(--text)]">
                  {d.applications}
                </span>
              )}
              <div
                className="w-full max-w-[24px] rounded-t-[4px] transition-opacity group-hover:opacity-80"
                style={{ height: h, background: SERIES, minWidth: 2 }}
              />
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-[var(--border-strong)] bg-[var(--surface-2)] px-2 py-1 text-xs text-[var(--text)] shadow-lg group-hover:block">
                {d.label}: <strong>{d.applications}</strong> bids
                {d.interviews > 0 && <> · {d.interviews} interviewed</>}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-xs text-[var(--muted)]">
        <span>{series[0]?.label}</span>
        <span>{series[series.length - 1]?.label}</span>
      </div>
    </div>
  );
}

function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {note && <p className="mt-0.5 text-xs text-[var(--muted)]">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-right">
      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="text-lg font-bold tabular-nums text-white">{value}</p>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-[var(--muted)]">{children}</p>;
}

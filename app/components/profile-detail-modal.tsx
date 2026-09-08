'use client';

import { useEffect, useState } from 'react';
import type { Profile, ProfileSummary } from '@/lib/types';
import { Modal } from './modal';

const fullName = (p: {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}) => [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email || 'Untitled profile';

function when(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Month-year range for an experience or education row. */
function period(from: string | null, to: string | null): string {
  const fmt = (v: string | null) => {
    if (!v) return '';
    const d = new Date(v);
    return Number.isNaN(d.getTime())
      ? v
      : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
  };
  const a = fmt(from);
  // An open end date is an ongoing role, which is what the editor stores for
  // one — there is no separate "current" flag to read.
  const b = fmt(to) || (a ? 'Present' : '');
  return [a, b].filter(Boolean).join(' – ') || '—';
}

/**
 * Everything about one profile, read-only.
 *
 * Separate from the editor, which the card already opens: this answers "who is
 * this and who can use it" without putting the reader in a form they may not be
 * allowed to save. The members list is the part the card cannot show — a count
 * says two people can use a profile, but not which two, and that is the thing
 * an owner actually needs when deciding whether to invite or revoke.
 */
export function ProfileDetailModal({
  summary,
  onClose,
}: {
  summary: ProfileSummary | null;
  onClose: () => void;
}) {
  const [full, setFull] = useState<Profile | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!summary) {
      setFull(null);
      setFailed(false);
      return;
    }
    let live = true;
    setFull(null);
    setFailed(false);
    // The summary already has the members and the headline fields, so the panel
    // renders immediately and the experience/education fill in — rather than
    // showing a spinner over information we already hold.
    void fetch(`/api/profiles/${summary.id}`, { cache: 'no-store' })
      .then(async (r) => {
        if (!live) return;
        if (!r.ok) throw new Error();
        setFull(await r.json());
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [summary]);

  if (!summary) return null;

  const members = summary.invitations ?? [];
  const accepted = members.filter((m) => m.status === 'accepted');
  const pending = members.filter((m) => m.status === 'pending');

  return (
    <Modal open onClose={onClose} title={fullName(summary)}>
      <div className="space-y-5 text-sm">
        {/* ── who ─────────────────────────────────────────────────────── */}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Details
          </h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
            <Row label="Email" value={summary.email} />
            <Row label="Location" value={summary.location} />
            <Row label="Phone" value={full?.phone ?? null} />
            <Row label="LinkedIn" value={full?.linkedin ?? null} link />
            <Row label="Last updated" value={when(summary.updatedAt)} />
          </dl>
        </section>

        {/* ── members ─────────────────────────────────────────────────── */}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Members ({accepted.length + 1})
          </h3>
          <ul className="space-y-1.5">
            <MemberRow email={summary.owner.email} role={summary.owner.role} tag="Owner" owner />
            {accepted.map((m) => (
              <MemberRow
                key={m.id}
                email={m.user.email}
                role={m.user.role}
                tag={`Joined ${when(m.respondedAt ?? m.createdAt)}`}
              />
            ))}
          </ul>
          {pending.length > 0 && (
            <>
              <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Invited, not yet accepted ({pending.length})
              </h3>
              <ul className="space-y-1.5">
                {pending.map((m) => (
                  <MemberRow
                    key={m.id}
                    email={m.user.email}
                    role={m.user.role}
                    tag={`Invited ${when(m.createdAt)}`}
                    muted
                  />
                ))}
              </ul>
            </>
          )}
          {accepted.length === 0 && pending.length === 0 && (
            <p className="text-[var(--muted)]">
              Only the owner. Share it with a bidder from the Bidders page.
            </p>
          )}
        </section>

        {/* ── experience & education ──────────────────────────────────── */}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Work experience ({summary._count.workExperiences})
          </h3>
          {failed ? (
            <p className="text-[var(--muted)]">Could not load the full profile.</p>
          ) : !full ? (
            <p className="text-[var(--muted)]">Loading…</p>
          ) : full.workExperiences.length === 0 ? (
            <p className="text-[var(--muted)]">None recorded.</p>
          ) : (
            <ul className="space-y-2">
              {full.workExperiences.map((w, i) => (
                // `id` is optional on unsaved rows, so the index backs it up.
                <li key={w.id ?? i} className="rounded-lg border border-[var(--border)] p-2.5">
                  <div className="font-medium text-white">{w.company || 'Unnamed employer'}</div>
                  <div className="text-xs text-[var(--muted)]">
                    {period(w.startDate, w.endDate)}
                    {w.location ? ` · ${w.location}` : ''}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Education ({summary._count.educations})
          </h3>
          {full && full.educations.length > 0 ? (
            <ul className="space-y-2">
              {full.educations.map((e, i) => (
                <li key={e.id ?? i} className="rounded-lg border border-[var(--border)] p-2.5">
                  <div className="font-medium text-white">
                    {e.degree || e.university || 'Unnamed course'}
                    {e.degree && e.university ? ` · ${e.university}` : ''}
                  </div>
                  <div className="text-xs text-[var(--muted)]">
                    {period(e.startDate, e.endDate)}
                    {e.location ? ` · ${e.location}` : ''}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[var(--muted)]">{full ? 'None recorded.' : 'Loading…'}</p>
          )}
        </section>
      </div>
    </Modal>
  );
}

function Row({ label, value, link }: { label: string; value: string | null; link?: boolean }) {
  return (
    <>
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="truncate text-[var(--text)]">
        {value ? (
          link && /^https?:\/\//i.test(value) ? (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--primary)] hover:underline"
            >
              {value}
            </a>
          ) : (
            value
          )
        ) : (
          <span className="text-[var(--muted)]">—</span>
        )}
      </dd>
    </>
  );
}

function MemberRow({
  email,
  role,
  tag,
  owner,
  muted,
}: {
  email: string;
  role?: string;
  tag: string;
  owner?: boolean;
  muted?: boolean;
}) {
  return (
    <li
      className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-2.5 py-2 ${
        owner
          ? 'border-[var(--primary)]/30 bg-[var(--primary)]/5'
          : 'border-[var(--border)] bg-[var(--surface-2)]'
      } ${muted ? 'opacity-70' : ''}`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate text-[var(--text)]">{email}</span>
        {role && (
          <span className="shrink-0 rounded-full bg-[var(--surface)] px-1.5 py-0.5 text-[11px] text-[var(--muted)]">
            {role.replace('_', ' ')}
          </span>
        )}
      </span>
      <span className="shrink-0 text-xs text-[var(--muted)]">{tag}</span>
    </li>
  );
}

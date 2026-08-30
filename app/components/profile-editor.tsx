'use client';

import { useState } from 'react';
import type { Profile } from '@/lib/types';
import { MonthYearPicker, YearPicker } from './month-year-picker';
import type { DatePrecision } from '@/lib/types';
import { ConfirmModal } from './confirm-modal';

const inputCls =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--muted)] outline-none transition focus:border-[var(--primary)]';
const labelCls = 'mb-1.5 block text-xs font-medium text-[var(--muted)]';
// Disabled inputs still have to be READABLE — this is the only way an invitee
// sees the profile, so dimming it to the usual 50% would make the page useless.
const readOnlyCls = 'cursor-default border-dashed opacity-90 focus:border-[var(--border)]';

let uid = 0;
const key = () => `k${uid++}`;
const ym = (s: string | null | undefined) => (s ? s.slice(0, 7) : null);
function precisionChange(
  e: { startDate: string | null; endDate: string | null },
  g: DatePrecision,
): { precision: DatePrecision; startDate: string | null; endDate: string | null } {
  const to = (v: string | null) =>
    !v ? null : g === 'year' ? v.slice(0, 4) : v.length === 4 ? `${v}-01` : v.slice(0, 7);
  return { precision: g, startDate: to(e.startDate), endDate: to(e.endDate) };
}

const yr = (s: string | null | undefined) => (s ? s.slice(0, 4) : null);

interface WorkRow {
  _key: string;
  company: string;
  location: string;
  startDate: string | null;
  endDate: string | null;
  present: boolean;
}
interface EduRow {
  _key: string;
  university: string;
  location: string;
  degree: string;
  startDate: string | null;
  endDate: string | null;
  present: boolean;
  precision: DatePrecision;
}

export interface ProfilePayload {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  linkedin: string;
  location: string;
  workExperiences: { company: string; location: string; startDate: string | null; endDate: string | null }[];
  educations: { university: string; location: string; degree: string; startDate: string | null; endDate: string | null }[];
}

export function ProfileEditor({
  profile,
  onSave,
  onCancel,
  onDelete,
  readOnly = false,
  ownerEmail,
}: {
  profile: Profile | null;
  onSave: (data: ProfilePayload) => Promise<boolean>;
  onCancel: () => void;
  onDelete?: () => Promise<boolean>;
  readOnly?: boolean;
  ownerEmail?: string;
}) {
  const [email, setEmail] = useState(profile?.email ?? '');
  const [firstName, setFirstName] = useState(profile?.firstName ?? '');
  const [lastName, setLastName] = useState(profile?.lastName ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [linkedin, setLinkedin] = useState(profile?.linkedin ?? '');
  const [location, setLocation] = useState(profile?.location ?? '');

  const [works, setWorks] = useState<WorkRow[]>(
    (profile?.workExperiences ?? []).map((w) => ({
      _key: key(),
      company: w.company ?? '',
      location: w.location ?? '',
      startDate: ym(w.startDate),
      endDate: ym(w.endDate),
      present: !w.endDate,
    })),
  );
  const [edus, setEdus] = useState<EduRow[]>(
    (profile?.educations ?? []).map((e) => ({
      _key: key(),
      university: e.university ?? '',
      location: e.location ?? '',
      degree: e.degree ?? '',
      // Slice to the precision the entry was saved with, so a month entry keeps
      // its month and a year entry does not sprout a January.
      startDate: e.datePrecision === 'year' ? yr(e.startDate) : ym(e.startDate),
      endDate: e.datePrecision === 'year' ? yr(e.endDate) : ym(e.endDate),
      present: !e.endDate,
      precision: e.datePrecision === 'year' ? 'year' : 'month',
    })),
  );

  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const fieldCls = readOnly ? `${inputCls} ${readOnlyCls}` : inputCls;

  const patchWork = (i: number, p: Partial<WorkRow>) =>
    setWorks((rows) => rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const patchEdu = (i: number, p: Partial<EduRow>) =>
    setEdus((rows) => rows.map((r, j) => (j === i ? { ...r, ...p } : r)));

  const addWork = () =>
    setWorks((r) => [...r, { _key: key(), company: '', location: '', startDate: null, endDate: null, present: false }]);
  const addEdu = () =>
    setEdus((r) => [
      ...r,
      { _key: key(), university: '', location: '', degree: '', startDate: null, endDate: null, present: false, precision: 'year' as DatePrecision },
    ]);

  async function save() {
    setBusy(true);
    const payload: ProfilePayload = {
      email,
      firstName,
      lastName,
      phone,
      linkedin,
      location,
      workExperiences: works.map((w) => ({
        company: w.company,
        location: w.location,
        startDate: w.startDate,
        endDate: w.present ? null : w.endDate,
      })),
      educations: edus.map((e) => ({
        university: e.university,
        location: e.location,
        degree: e.degree,
        startDate: e.startDate,
        endDate: e.present ? null : e.endDate,
        datePrecision: e.precision,
      })),
    };
    await onSave(payload);
    setBusy(false);
  }

  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'New profile';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button onClick={onCancel} className="text-sm text-[var(--muted)] transition hover:text-white">
          ← Back to profiles
        </button>
      </div>

      <h2 className="text-xl font-bold tracking-tight text-white">{fullName}</h2>

      <Section icon="👤" title="Personal Information">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name">
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" disabled={readOnly} className={fieldCls} />
          </Field>
          <Field label="Last name">
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" disabled={readOnly} className={fieldCls} />
          </Field>
          <Field label="Email">
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" disabled={readOnly} className={fieldCls} />
          </Field>
          <Field label="Phone number">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 1234" disabled={readOnly} className={fieldCls} />
          </Field>
          <Field label="LinkedIn profile">
            <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/…" disabled={readOnly} className={fieldCls} />
          </Field>
          <Field label="Location">
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Austin, Texas" disabled={readOnly} className={fieldCls} />
          </Field>
        </div>
      </Section>

      <Section
        icon="💼"
        title="Work Experience"
        action={readOnly ? undefined : <AddButton onClick={addWork} label="Add experience" />}
      >
        {works.length === 0 && (
          <Empty text={readOnly ? 'No work experience on this profile.' : 'No work experience yet — add one.'} />
        )}
        <div className="space-y-5">
          {works.map((w, i) => (
            <EntryCard
              key={w._key}
              title={`Experience ${i + 1}`}
              onRemove={readOnly ? undefined : () => setWorks((r) => r.filter((_, j) => j !== i))}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Company">
                  <input value={w.company} onChange={(e) => patchWork(i, { company: e.target.value })} placeholder="NVIDIA" disabled={readOnly} className={fieldCls} />
                </Field>
                <Field label="Location">
                  <input value={w.location} onChange={(e) => patchWork(i, { location: e.target.value })} placeholder="Austin, Texas" disabled={readOnly} className={fieldCls} />
                </Field>
              </div>
              <PeriodRow
                start={w.startDate}
                end={w.endDate}
                present={w.present}
                readOnly={readOnly}
                onStart={(v) => patchWork(i, { startDate: v })}
                onEnd={(v) => patchWork(i, { endDate: v })}
                onPresent={(v) => patchWork(i, { present: v })}
              />
            </EntryCard>
          ))}
        </div>
      </Section>

      <Section
        icon="🎓"
        title="Education"
        action={readOnly ? undefined : <AddButton onClick={addEdu} label="Add education" />}
      >
        {edus.length === 0 && (
          <Empty text={readOnly ? 'No education on this profile.' : 'No education yet — add one.'} />
        )}
        <div className="space-y-5">
          {edus.map((e, i) => (
            <EntryCard
              key={e._key}
              title={`Education ${i + 1}`}
              onRemove={readOnly ? undefined : () => setEdus((r) => r.filter((_, j) => j !== i))}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="University">
                  <input value={e.university} onChange={(ev) => patchEdu(i, { university: ev.target.value })} placeholder="Stony Brook University" disabled={readOnly} className={fieldCls} />
                </Field>
                <Field label="Location">
                  <input value={e.location} onChange={(ev) => patchEdu(i, { location: ev.target.value })} placeholder="Stony Brook, New York" disabled={readOnly} className={fieldCls} />
                </Field>
                <Field label="Degree">
                  <input value={e.degree} onChange={(ev) => patchEdu(i, { degree: ev.target.value })} placeholder="B.S. in Computer Science" disabled={readOnly} className={fieldCls} />
                </Field>
                <div className="sm:col-span-1" />
              </div>
              <PeriodRow
                start={e.startDate}
                end={e.endDate}
                present={e.present}
                readOnly={readOnly}
                granularity={e.precision}
                onGranularity={(g) => patchEdu(i, precisionChange(e, g))}
                onStart={(v) => patchEdu(i, { startDate: v })}
                onEnd={(v) => patchEdu(i, { endDate: v })}
                onPresent={(v) => patchEdu(i, { present: v })}
              />
            </EntryCard>
          ))}
        </div>
      </Section>

      <div className="jh-sticky-bar sticky bottom-0 z-10 flex items-center justify-between gap-3 rounded-t-xl px-4 py-3">
        <span className="truncate text-sm text-[var(--muted)]">{fullName}</span>
        {readOnly ? (
          <span className="shrink-0 text-sm text-[var(--muted)]">
            View only — {ownerEmail ? <span className="text-[var(--text)]">{ownerEmail}</span> : 'the owner'}{' '}
            can edit this profile
          </span>
        ) : (
        <div className="flex shrink-0 items-center gap-2">
          {onDelete && (
            <button
              onClick={() => setConfirming(true)}
              disabled={busy}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-red-400 transition hover:border-red-500/50 hover:bg-red-500/10 disabled:opacity-50"
            >
              Delete
            </button>
          )}
          <button
            onClick={save}
            disabled={busy}
            className="jh-cta rounded-lg px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Save profile'}
          </button>
        </div>
        )}
      </div>

      <ConfirmModal
        open={confirming}
        title="Delete profile?"
        message={`Delete “${fullName}” and all its experience and education? This can't be undone.`}
        busy={busy}
        onCancel={() => setConfirming(false)}
        onConfirm={async () => {
          if (!onDelete) return;
          setBusy(true);
          try {
            // On failure the caller stays on this screen, so the modal has to
            // close and the buttons have to come back — otherwise a dropped
            // request leaves it stuck on "Deleting..." with no way out.
            const ok = await onDelete();
            if (!ok) setConfirming(false);
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}

function PeriodRow({
  start,
  end,
  present,
  readOnly = false,
  granularity = 'month',
  onGranularity,
  onStart,
  onEnd,
  onPresent,
}: {
  start: string | null;
  end: string | null;
  present: boolean;
  readOnly?: boolean;
  granularity?: 'month' | 'year';
  onGranularity?: (g: DatePrecision) => void;
  onStart: (v: string | null) => void;
  onEnd: (v: string | null) => void;
  onPresent: (v: boolean) => void;
}) {
  const Picker = granularity === 'year' ? YearPicker : MonthYearPicker;
  const unit = granularity === 'year' ? 'year' : 'month';
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-3">
        <label className={labelCls}>Period</label>
        {onGranularity && !readOnly && (
          <div
            role="radiogroup"
            aria-label="Date precision"
            className="mb-1.5 flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5"
          >
            {(['year', 'month'] as const).map((g) => (
              <button
                key={g}
                type="button"
                role="radio"
                aria-checked={granularity === g}
                onClick={() => onGranularity(g)}
                className={`rounded-md px-2 py-1 text-xs transition ${
                  granularity === g
                    ? 'bg-[var(--primary)] font-medium text-white'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {g === 'year' ? 'Year' : 'Month + year'}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[150px] flex-1">
          <Picker value={start} onChange={onStart} placeholder={`Start ${unit}`} disabled={readOnly} />
        </div>
        <span className="text-[var(--muted)]">–</span>
        <div className="min-w-[150px] flex-1">
          {present ? (
            <div className="flex items-center rounded-lg border border-dashed border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)]">
              Present
            </div>
          ) : (
            <Picker value={end} onChange={onEnd} placeholder={`End ${unit}`} disabled={readOnly} />
          )}
        </div>
        <label
          className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-[var(--muted)] transition ${
            readOnly ? 'cursor-default' : 'cursor-pointer hover:text-white'
          }`}
        >
          <input
            type="checkbox"
            checked={present}
            disabled={readOnly}
            onChange={(e) => onPresent(e.target.checked)}
            className="h-4 w-4 accent-[var(--primary)]"
          />
          Present
        </label>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  action,
  children,
}: {
  icon: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold text-white">
          <span className="text-base">{icon}</span> {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function EntryCard({
  title,
  onRemove,
  children,
}: {
  title: string;
  onRemove?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-white">{title}</span>
        {onRemove && (
          <button onClick={onRemove} className="text-xs text-[var(--muted)] transition hover:text-red-400" aria-label="Remove">
            Remove
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text)] transition hover:border-[var(--primary)] hover:text-white"
    >
      + {label}
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="mb-4 text-sm text-[var(--muted)]">{text}</p>;
}

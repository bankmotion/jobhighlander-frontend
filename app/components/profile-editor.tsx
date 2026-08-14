'use client';

import { useState } from 'react';
import type { Profile } from '@/lib/types';
import { MonthYearPicker } from './month-year-picker';
import { ConfirmModal } from './confirm-modal';

const inputCls =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--muted)] outline-none transition focus:border-[var(--primary)]';
const labelCls = 'mb-1.5 block text-xs font-medium text-[var(--muted)]';

let uid = 0;
const key = () => `k${uid++}`;
const ym = (s: string | null | undefined) => (s ? s.slice(0, 7) : null);

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
}: {
  profile: Profile | null;
  onSave: (data: ProfilePayload) => Promise<boolean>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
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
      startDate: ym(e.startDate),
      endDate: ym(e.endDate),
      present: !e.endDate,
    })),
  );

  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const patchWork = (i: number, p: Partial<WorkRow>) =>
    setWorks((rows) => rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const patchEdu = (i: number, p: Partial<EduRow>) =>
    setEdus((rows) => rows.map((r, j) => (j === i ? { ...r, ...p } : r)));

  const addWork = () =>
    setWorks((r) => [...r, { _key: key(), company: '', location: '', startDate: null, endDate: null, present: false }]);
  const addEdu = () =>
    setEdus((r) => [
      ...r,
      { _key: key(), university: '', location: '', degree: '', startDate: null, endDate: null, present: false },
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
      })),
    };
    await onSave(payload);
    setBusy(false);
  }

  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'New profile';

  return (
    <div className="space-y-5">
      {/* Header / actions */}
      <div className="flex items-center justify-between gap-3">
        <button onClick={onCancel} className="text-sm text-[var(--muted)] transition hover:text-white">
          ← Back to profiles
        </button>
        <div className="flex items-center gap-2">
          {onDelete && (
            <button
              onClick={() => setConfirming(true)}
              disabled={busy}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-red-400 transition hover:border-red-500/50 hover:bg-red-500/10 disabled:opacity-50"
            >
              Delete
            </button>
          )}
          <button
            onClick={save}
            disabled={busy}
            className="rounded-lg bg-[var(--primary)] px-4 py-1.5 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)] disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </div>

      <h2 className="text-xl font-bold tracking-tight text-white">{fullName}</h2>

      {/* Personal information */}
      <Section icon="👤" title="Personal Information">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name">
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" className={inputCls} />
          </Field>
          <Field label="Last name">
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" className={inputCls} />
          </Field>
          <Field label="Email">
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" className={inputCls} />
          </Field>
          <Field label="Phone number">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 1234" className={inputCls} />
          </Field>
          <Field label="LinkedIn profile">
            <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/…" className={inputCls} />
          </Field>
          <Field label="Location">
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Austin, Texas" className={inputCls} />
          </Field>
        </div>
      </Section>

      {/* Work experience */}
      <Section
        icon="💼"
        title="Work Experience"
        action={<AddButton onClick={addWork} label="Add experience" />}
      >
        {works.length === 0 && <Empty text="No work experience yet — add one." />}
        <div className="space-y-5">
          {works.map((w, i) => (
            <EntryCard key={w._key} title={`Experience ${i + 1}`} onRemove={() => setWorks((r) => r.filter((_, j) => j !== i))}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Company">
                  <input value={w.company} onChange={(e) => patchWork(i, { company: e.target.value })} placeholder="NVIDIA" className={inputCls} />
                </Field>
                <Field label="Location">
                  <input value={w.location} onChange={(e) => patchWork(i, { location: e.target.value })} placeholder="Austin, Texas" className={inputCls} />
                </Field>
              </div>
              <PeriodRow
                start={w.startDate}
                end={w.endDate}
                present={w.present}
                onStart={(v) => patchWork(i, { startDate: v })}
                onEnd={(v) => patchWork(i, { endDate: v })}
                onPresent={(v) => patchWork(i, { present: v })}
              />
            </EntryCard>
          ))}
        </div>
      </Section>

      {/* Education */}
      <Section icon="🎓" title="Education" action={<AddButton onClick={addEdu} label="Add education" />}>
        {edus.length === 0 && <Empty text="No education yet — add one." />}
        <div className="space-y-5">
          {edus.map((e, i) => (
            <EntryCard key={e._key} title={`Education ${i + 1}`} onRemove={() => setEdus((r) => r.filter((_, j) => j !== i))}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="University">
                  <input value={e.university} onChange={(ev) => patchEdu(i, { university: ev.target.value })} placeholder="Stony Brook University" className={inputCls} />
                </Field>
                <Field label="Location">
                  <input value={e.location} onChange={(ev) => patchEdu(i, { location: ev.target.value })} placeholder="Stony Brook, New York" className={inputCls} />
                </Field>
                <Field label="Degree">
                  <input value={e.degree} onChange={(ev) => patchEdu(i, { degree: ev.target.value })} placeholder="B.S. in Computer Science" className={inputCls} />
                </Field>
                <div className="sm:col-span-1" />
              </div>
              <PeriodRow
                start={e.startDate}
                end={e.endDate}
                present={e.present}
                onStart={(v) => patchEdu(i, { startDate: v })}
                onEnd={(v) => patchEdu(i, { endDate: v })}
                onPresent={(v) => patchEdu(i, { present: v })}
              />
            </EntryCard>
          ))}
        </div>
      </Section>

      <ConfirmModal
        open={confirming}
        title="Delete profile?"
        message={`Delete “${fullName}” and all its experience and education? This can't be undone.`}
        busy={busy}
        onCancel={() => setConfirming(false)}
        onConfirm={async () => {
          if (!onDelete) return;
          setBusy(true);
          await onDelete();
        }}
      />
    </div>
  );
}

function PeriodRow({
  start,
  end,
  present,
  onStart,
  onEnd,
  onPresent,
}: {
  start: string | null;
  end: string | null;
  present: boolean;
  onStart: (v: string | null) => void;
  onEnd: (v: string | null) => void;
  onPresent: (v: boolean) => void;
}) {
  return (
    <div className="mt-4">
      <label className={labelCls}>Period</label>
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[150px] flex-1">
          <MonthYearPicker value={start} onChange={onStart} placeholder="Start month" />
        </div>
        <span className="text-[var(--muted)]">–</span>
        <div className="min-w-[150px] flex-1">
          {present ? (
            <div className="flex items-center rounded-lg border border-dashed border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)]">
              Present
            </div>
          ) : (
            <MonthYearPicker value={end} onChange={onEnd} placeholder="End month" />
          )}
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-[var(--muted)] transition hover:text-white">
          <input
            type="checkbox"
            checked={present}
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
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-white">{title}</span>
        <button onClick={onRemove} className="text-xs text-[var(--muted)] transition hover:text-red-400" aria-label="Remove">
          Remove
        </button>
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

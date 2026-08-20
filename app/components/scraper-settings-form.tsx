'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ScraperSetting } from '@/lib/scraper-settings';

type FieldType = 'text' | 'number' | 'bool';
interface Field {
  key: string;
  label: string;
  type: FieldType;
  hint?: string;
  /** Show an "open" button — only for links you can actually browse. NOT for
   *  API endpoints (they return JSON) or proxy_url (it carries credentials). */
  link?: boolean;
  /**
   * Granularity for a number field. `<input type="number">` defaults to step=1
   * and marks anything fractional invalid, so every setting stored as a float
   * needs one — otherwise a 1.5-hour gap or a 7.5-second delay reads as a
   * validation error rather than a valid value.
   */
  step?: string;
}
interface Group {
  title: string;
  fields: Field[];
}

const GROUPS: Group[] = [
  {
    title: 'Global',
    fields: [
      { key: 'max_jobs', label: 'Max jobs', type: 'number', hint: '0 = no limit' },
      { key: 'max_age_days', label: 'Max age (days)', type: 'number', hint: '0 = no age limit' },
      { key: 'proxy_url', label: 'Proxy URL', type: 'text' },
      { key: 'fetch_descriptions', label: 'Fetch descriptions', type: 'bool' },
    ],
  },
  {
    // The gap BETWEEN cycles, not a per-request delay. Read fresh by
    // scheduler.py at the start of every cycle, so a change here applies to the
    // next gap without restarting a process that runs for days.
    title: 'Schedule',
    fields: [
      {
        key: 'schedule_min_hours',
        label: 'Min gap between runs (h)',
        type: 'number',
        step: '0.25',
        hint: 'a random gap in this range is re-rolled after every cycle',
      },
      {
        key: 'schedule_max_hours',
        label: 'Max gap between runs (h)',
        type: 'number',
        step: '0.25',
      },
    ],
  },
  {
    title: 'Indeed',
    fields: [
      { key: 'enable_indeed', label: 'Enabled', type: 'bool' },
      { key: 'indeed_search_url', label: 'Search URL', type: 'text', link: true },
      { key: 'indeed_max_pages', label: 'Max pages', type: 'number' },
    ],
  },
  {
    title: 'Glassdoor',
    fields: [
      { key: 'enable_glassdoor', label: 'Enabled', type: 'bool' },
      { key: 'glassdoor_search_url', label: 'Search URL', type: 'text', link: true },
    ],
  },
  {
    title: 'JobRight',
    fields: [
      { key: 'enable_jobright', label: 'Enabled', type: 'bool' },
      { key: 'jobright_recommend_url', label: 'Recommend URL', type: 'text', link: true },
      { key: 'jobright_recommend_api', label: 'Recommend API', type: 'text' },
    ],
  },
  {
    title: 'WeWorkRemotely',
    fields: [
      { key: 'enable_weworkremotely', label: 'Enabled', type: 'bool' },
      { key: 'weworkremotely_search_url', label: 'Search URL', type: 'text', link: true },
      { key: 'weworkremotely_max_per_company', label: 'Max per company', type: 'number' },
    ],
  },
  {
    title: 'RemoteOK',
    fields: [
      { key: 'enable_remoteok', label: 'Enabled', type: 'bool' },
      { key: 'remoteok_api_url', label: 'API URL', type: 'text' },
    ],
  },
  {
    title: 'FindMyRemote',
    fields: [
      { key: 'enable_findmyremote', label: 'Enabled', type: 'bool' },
      {
        key: 'findmyremote_search_url',
        label: 'Search URL',
        type: 'text',
        hint: 'site link; its filters are forwarded to the API',
        link: true,
      },
      {
        key: 'findmyremote_role_regex',
        label: 'Role regex',
        type: 'text',
        hint: 'blank = every role',
      },
    ],
  },
  {
    title: 'Jobicy',
    fields: [
      { key: 'enable_jobicy', label: 'Enabled', type: 'bool' },
      {
        key: 'jobicy_search_url',
        label: 'Search URL',
        type: 'text',
        hint: 'site link; page/N is appended for pagination',
        link: true,
      },
      {
        key: 'jobicy_role_regex',
        label: 'Role regex',
        type: 'text',
        hint: 'blank = every role the listing returns',
      },
      {
        key: 'jobicy_delay_s',
        label: 'Delay between jobs (s)',
        type: 'number',
        step: '0.5',
        hint: 'rate-limits hard — do not lower',
      },
    ],
  },
  {
    title: 'The Muse',
    fields: [
      { key: 'enable_themuse', label: 'Enabled', type: 'bool' },
      {
        key: 'themuse_search_url',
        label: 'Search URL',
        type: 'text',
        hint: 'site link; ?page=N is appended. Keep the date-posted filter',
        link: true,
      },
      {
        key: 'themuse_us_only',
        label: 'US jobs only',
        type: 'bool',
        hint: 'expands the hidden city and drops non-US postings',
      },
      {
        key: 'themuse_role_regex',
        label: 'Role regex',
        type: 'text',
        hint: 'blank = every role the listing returns',
      },
      { key: 'themuse_delay_s', label: 'Delay between jobs (s)', type: 'number', step: '0.5' },
    ],
  },
  {
    title: 'Himalayas',
    fields: [
      { key: 'enable_himalayas', label: 'Enabled', type: 'bool' },
      { key: 'himalayas_api_url', label: 'API URL', type: 'text' },
      {
        key: 'himalayas_country',
        label: 'Country',
        type: 'text',
        hint: 'matches locationRestrictions',
      },
      { key: 'himalayas_role_regex', label: 'Role regex', type: 'text' },
    ],
  },
];

export function ScraperSettingsForm({ initial }: { initial: ScraperSetting[] }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(initial.map((s) => [s.key, s.value])),
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const set = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }));

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const settings = Object.entries(values).map(([key, value]) => ({ key, value }));
      const res = await fetch('/api/admin/scraper-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) throw new Error();
      setMsg({ ok: true, text: 'Saved — applies on the next scrape.' });
      router.refresh();
    } catch {
      setMsg({ ok: false, text: 'Could not save settings.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {GROUPS.map((g) => (
        <section
          key={g.title}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
        >
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            {g.title}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {g.fields.map((f) => (
              <FieldRow
                key={f.key}
                field={f}
                value={values[f.key] ?? ''}
                onChange={(v) => set(f.key, v)}
              />
            ))}
          </div>
        </section>
      ))}

      {/* Sticky save bar — elevated (see `.jh-sticky-bar` in globals.css) so it
          stands off the form instead of blending into the dark background. */}
      <div className="jh-sticky-bar sticky bottom-0 z-10 flex items-center justify-between gap-3 rounded-t-xl px-4 py-3">
        {msg ? (
          <span className={`text-sm ${msg.ok ? 'text-green-300' : 'text-red-400'}`}>
            {msg.text}
          </span>
        ) : (
          <span className="text-sm text-[var(--muted)]">
            Changes apply on the next scraper run.
          </span>
        )}
        <button
          onClick={save}
          disabled={saving}
          className="jh-cta rounded-lg px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}

function FieldRow({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.type === 'bool') {
    const on = value === 'true';
    return (
      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5">
        <span className="text-sm text-[var(--text)]">
          {field.label}
          {field.hint && <span className="ml-2 text-xs text-[var(--muted)]">{field.hint}</span>}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={() => onChange(on ? 'false' : 'true')}
          className={`relative h-5 w-9 shrink-0 rounded-full transition ${on ? 'bg-[var(--primary)]' : 'bg-[var(--border-strong)]'}`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? 'left-[18px]' : 'left-0.5'}`}
          />
        </button>
      </label>
    );
  }
  // Only offer the button once the current value is a browsable http(s) URL —
  // it opens what's typed, not what was last saved.
  const openable = field.link && /^https?:\/\//i.test(value.trim());
  return (
    <div className={field.type === 'text' ? 'sm:col-span-2' : ''}>
      <label className="mb-1 block text-sm text-[var(--text)]">
        {field.label}
        {field.hint && <span className="ml-2 text-xs text-[var(--muted)]">{field.hint}</span>}
      </label>
      <div className="flex items-center gap-2">
        <input
          type={field.type === 'number' ? 'number' : 'text'}
          step={field.type === 'number' ? (field.step ?? '1') : undefined}
          min={field.type === 'number' ? '0' : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)]"
        />
        {field.link &&
          (openable ? (
            <a
              href={value.trim()}
              target="_blank"
              rel="noopener noreferrer"
              title="Open this search in a new tab"
              className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--muted)] transition hover:border-[var(--primary)] hover:text-white"
            >
              Open ↗
            </a>
          ) : (
            <span
              title="Enter a valid http(s) URL to enable"
              className="shrink-0 cursor-not-allowed rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)] opacity-40"
            >
              Open ↗
            </span>
          ))}
      </div>
    </div>
  );
}

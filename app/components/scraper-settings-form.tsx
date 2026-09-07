'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ScraperSetting } from '@/lib/scraper-settings';

type FieldType = 'text' | 'number' | 'bool';
interface Field {
  key: string;
  label: string;
  type: FieldType;
  hint?: string;
  link?: boolean;
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
      {
        key: 'company_blocklist',
        label: 'Blocked companies',
        type: 'text',
        hint: 'comma-separated; whole-name match, e.g. recruiting agencies',
      },
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
      {
        key: 'indeed_use_proxy',
        label: 'Use proxy',
        type: 'bool',
        hint: 'needs a residential exit for Cloudflare',
      },
      { key: 'indeed_search_url', label: 'Search URL', type: 'text', link: true },
    ],
  },
  {
    title: 'Glassdoor',
    fields: [
      { key: 'enable_glassdoor', label: 'Enabled', type: 'bool' },
      {
        key: 'glassdoor_use_proxy',
        label: 'Use proxy',
        type: 'bool',
        hint: 'needs a residential exit for Cloudflare',
      },
      { key: 'glassdoor_search_url', label: 'Search URL', type: 'text', link: true },
    ],
  },
  {
    title: 'JobRight',
    fields: [
      { key: 'enable_jobright', label: 'Enabled', type: 'bool' },
      {
        key: 'jobright_use_proxy',
        label: 'Use proxy',
        type: 'bool',
        hint: 'route this site through proxy_url',
      },
      { key: 'jobright_recommend_url', label: 'Recommend URL', type: 'text', link: true },
      { key: 'jobright_recommend_api', label: 'Recommend API', type: 'text' },
    ],
  },
  {
    title: 'WeWorkRemotely',
    fields: [
      { key: 'enable_weworkremotely', label: 'Enabled', type: 'bool' },
      {
        key: 'weworkremotely_use_proxy',
        label: 'Use proxy',
        type: 'bool',
        hint: 'route this site through proxy_url',
      },
      { key: 'weworkremotely_search_url', label: 'Search URL', type: 'text', link: true },
      { key: 'weworkremotely_max_per_company', label: 'Max per company', type: 'number' },
    ],
  },
  {
    title: 'RemoteOK',
    fields: [
      { key: 'enable_remoteok', label: 'Enabled', type: 'bool' },
      {
        key: 'remoteok_use_proxy',
        label: 'Use proxy',
        type: 'bool',
        hint: 'route this site through proxy_url',
      },
      { key: 'remoteok_api_url', label: 'API URL', type: 'text' },
    ],
  },
  {
    title: 'FindMyRemote',
    fields: [
      { key: 'enable_findmyremote', label: 'Enabled', type: 'bool' },
      {
        key: 'findmyremote_use_proxy',
        label: 'Use proxy',
        type: 'bool',
        hint: 'route this site through proxy_url',
      },
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
        key: 'jobicy_use_proxy',
        label: 'Use proxy',
        type: 'bool',
        hint: 'route this site through proxy_url',
      },
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
        key: 'themuse_use_proxy',
        label: 'Use proxy',
        type: 'bool',
        hint: 'route this site through proxy_url',
      },
      {
        key: 'themuse_search_url',
        label: 'Search URL',
        type: 'text',
        hint: 'site link; ?page=N is appended. Keep the date-posted filter',
        link: true,
      },
      {
        key: 'themuse_max_age_days',
        label: 'Max age (days)',
        type: 'number',
        hint: 'this site only; the URL filter has no 1-day option',
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
      {
        key: 'himalayas_use_proxy',
        label: 'Use proxy',
        type: 'bool',
        hint: 'route this site through proxy_url',
      },
      { key: 'himalayas_api_url', label: 'API URL', type: 'text' },
      {
        key: 'himalayas_country',
        label: 'Country',
        type: 'text',
        hint: 'matches locationRestrictions',
      },
      {
        key: 'himalayas_max_age_days',
        label: 'Max age (days)',
        type: 'number',
        hint: 'this site only; the API has no date filter',
      },
      { key: 'himalayas_role_regex', label: 'Role regex', type: 'text' },
      {
        key: 'himalayas_resolve_apply',
        label: 'Resolve apply URL',
        type: 'bool',
        hint: 'follows each listing to its real apply link — slower',
      },
    ],
  },
  {
    title: 'LinkedIn',
    fields: [
      { key: 'enable_linkedin', label: 'Enabled', type: 'bool' },
      {
        key: 'linkedin_use_proxy',
        label: 'Use proxy',
        type: 'bool',
        hint: 'route this site through proxy_url',
      },
      { key: 'linkedin_search_url', label: 'Search URL', type: 'text', link: true },
      {
        key: 'linkedin_role_regex',
        label: 'Role regex',
        type: 'text',
        hint: 'empty = keep every role the listing returns',
      },
      {
        key: 'linkedin_delay_s',
        label: 'Delay between jobs (s)',
        type: 'number',
        step: '0.5',
      },
    ],
  },
  {
    title: 'Dice',
    fields: [
      { key: 'enable_dice', label: 'Enabled', type: 'bool' },
      {
        key: 'dice_use_proxy',
        label: 'Use proxy',
        type: 'bool',
        hint: 'off by default — Dice is reachable direct and its data is public',
      },
      {
        key: 'dice_search_url',
        label: 'Search URL',
        type: 'text',
        link: true,
        hint: 'paste a dice.com search link; paging is applied by the scraper',
      },
      {
        key: 'dice_role_regex',
        label: 'Role regex',
        type: 'text',
        hint: 'empty = keep every role the listing returns',
      },
      {
        key: 'dice_max_age_days',
        label: 'Max age (days)',
        type: 'number',
        hint: 'backstop for the posted-date filter in the search URL',
      },
      { key: 'dice_delay_s', label: 'Delay between jobs (s)', type: 'number', step: '0.5' },
    ],
  },
  {
    title: 'ZipRecruiter',
    fields: [
      { key: 'enable_ziprecruiter', label: 'Enabled', type: 'bool' },
      {
        key: 'ziprecruiter_use_proxy',
        label: 'Use proxy',
        type: 'bool',
        hint: 'required: without a US exit the site redirects to ziprecruiter.ie',
      },
      {
        key: 'ziprecruiter_search_url',
        label: 'Search URL',
        type: 'text',
        link: true,
        hint: 'paste a ziprecruiter.com search link; paging is applied by the scraper',
      },
      {
        key: 'ziprecruiter_role_regex',
        label: 'Role regex',
        type: 'text',
        hint: 'empty = keep every role the listing returns',
      },
      {
        key: 'ziprecruiter_max_age_days',
        label: 'Max age (days)',
        type: 'number',
        hint: 'backstop for the days= filter in the search URL',
      },
      {
        key: 'ziprecruiter_budget_min',
        label: 'Time budget (min)',
        type: 'number',
        hint: 'wall-clock ceiling for one pass; the rest resume next run',
      },
      { key: 'ziprecruiter_delay_s', label: 'Delay between jobs (s)', type: 'number', step: '0.5' },
    ],
  },
];

export function ScraperSettingsForm({ initial }: { initial: ScraperSetting[] }) {
  const router = useRouter();
  const saved = useMemo(
    () => Object.fromEntries(initial.map((s) => [s.key, s.value])) as Record<string, string>,
    [initial],
  );
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...saved }));
  const [active, setActive] = useState<string>(GROUPS[0].title);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const set = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }));

  // Which keys differ from what is stored. Tabs hide most of the form, so an
  // edit made on one tab is invisible from another — without this the only way
  // to know something is pending would be to visit every tab before saving.
  const dirty = useMemo(() => {
    const out = new Set<string>();
    for (const [k, v] of Object.entries(values)) if ((saved[k] ?? '') !== v) out.add(k);
    return out;
  }, [values, saved]);

  const group = GROUPS.find((g) => g.title === active) ?? GROUPS[0];
  const otherTabsWithEdits = GROUPS.filter(
    (g) => g.title !== active && g.fields.some((f) => dirty.has(f.key)),
  ).map((g) => g.title);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      // Still sends EVERY key, not just the visible tab: the form is one
      // document that happens to be paginated, and a partial PUT would drop
      // edits made on tabs the user has since navigated away from.
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
    <div className="space-y-4">
      <TabBar groups={GROUPS} active={active} onSelect={setActive} values={values} dirty={dirty} />

      <section
        role="tabpanel"
        id={panelId(group.title)}
        aria-labelledby={tabId(group.title)}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
      >
        <h2 className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          {group.title}
          {enabledState(group, values) === false && (
            <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-medium normal-case tracking-normal text-[var(--muted)]">
              disabled — skipped by the scheduler
            </span>
          )}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {group.fields.map((f) => (
            <FieldRow
              key={f.key}
              field={f}
              value={values[f.key] ?? ''}
              onChange={(v) => set(f.key, v)}
              dirty={dirty.has(f.key)}
            />
          ))}
        </div>
      </section>

      <div className="jh-sticky-bar sticky bottom-0 z-10 flex items-center justify-between gap-3 rounded-t-xl px-4 py-3">
        {msg ? (
          <span className={`text-sm ${msg.ok ? 'text-green-300' : 'text-red-400'}`}>{msg.text}</span>
        ) : dirty.size ? (
          // Counted across ALL tabs, so the bar describes the whole form rather
          // than whichever panel happens to be open.
          <span className="text-sm text-amber-300">
            {dirty.size} unsaved change{dirty.size === 1 ? '' : 's'}
            {otherTabsWithEdits.length ? ` — also on ${otherTabsWithEdits.join(', ')}` : ''}
          </span>
        ) : (
          <span className="text-sm text-[var(--muted)]">Changes apply on the next scraper run.</span>
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

const slug = (title: string) => title.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
const tabId = (title: string) => `scraper-tab-${slug(title)}`;
const panelId = (title: string) => `scraper-panel-${slug(title)}`;

/** A group's on/off state, or null for groups that have no enable toggle. */
function enabledState(group: Group, values: Record<string, string>): boolean | null {
  const f = group.fields.find((x) => x.key.startsWith('enable_'));
  return f ? (values[f.key] ?? '') === 'true' : null;
}

function TabBar({
  groups,
  active,
  onSelect,
  values,
  dirty,
}: {
  groups: Group[];
  active: string;
  onSelect: (title: string) => void;
  values: Record<string, string>;
  dirty: Set<string>;
}) {
  // Arrow keys move between tabs — what a keyboard user expects of a tablist,
  // and what the roving tabIndex below sets up.
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const i = groups.findIndex((g) => g.title === active);
    const next =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? groups.length - 1
          : e.key === 'ArrowRight'
            ? (i + 1) % groups.length
            : (i - 1 + groups.length) % groups.length;
    onSelect(groups[next].title);
    document.getElementById(tabId(groups[next].title))?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Scraper settings sections"
      onKeyDown={onKeyDown}
      className="flex flex-wrap gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5"
    >
      {groups.map((g) => {
        const on = g.title === active;
        const enabled = enabledState(g, values);
        const hasEdits = g.fields.some((f) => dirty.has(f.key));
        return (
          <button
            key={g.title}
            id={tabId(g.title)}
            role="tab"
            aria-selected={on}
            aria-controls={panelId(g.title)}
            tabIndex={on ? 0 : -1}
            onClick={() => onSelect(g.title)}
            title={
              enabled === null
                ? undefined
                : enabled
                  ? `${g.title} is enabled`
                  : `${g.title} is disabled and will be skipped`
            }
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition ${
              on
                ? 'bg-[var(--primary)] font-medium text-white'
                : 'text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]'
            }`}
          >
            {/* Turns the tab strip into an at-a-glance view of which scrapers
                actually run — usually the reason for opening this page. */}
            {enabled !== null && (
              <span
                aria-hidden
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  enabled ? 'bg-emerald-400' : 'bg-[var(--border-strong)]'
                }`}
              />
            )}
            {g.title}
            {hasEdits && (
              <span
                aria-label="unsaved changes"
                title="Unsaved changes on this tab"
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${on ? 'bg-white' : 'bg-amber-400'}`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

function FieldRow({
  field,
  value,
  onChange,
  dirty,
}: {
  field: Field;
  value: string;
  onChange: (v: string) => void;
  /** Differs from what is stored — marked so an edit is visible in the panel
      as well as on its tab. */
  dirty?: boolean;
}) {
  if (field.type === 'bool') {
    const on = value === 'true';
    return (
      <label
        className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border bg-[var(--surface-2)] px-3 py-2.5 ${
          dirty ? 'border-amber-400/60' : 'border-[var(--border)]'
        }`}
      >
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
          className={`w-full rounded-lg border bg-[var(--surface-2)] px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] ${
            dirty ? 'border-amber-400/60' : 'border-[var(--border)]'
          }`}
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

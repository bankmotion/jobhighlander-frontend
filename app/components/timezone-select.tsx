'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { allZones, zoneAbbrev, zoneOffsetLabel } from '@/lib/tz';
import { shortZone } from './meeting-time';

const MAX_RESULTS = 60;

const COMMON_ZONES = [
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Toronto',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Warsaw',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC',
];

interface ZoneEntry {
  zone: string;
  label: string;
  abbrev: string;
  offset: string;
  search: string;
}

function buildCatalog(): ZoneEntry[] {
  const now = new Date();
  // Six months away, so whichever side of DST today sits on, this is the other.
  const otherSeason = new Date(now.getTime() + 182 * 86_400_000);

  const all = allZones();
  const common = COMMON_ZONES.filter((z) => all.includes(z));
  const ordered = [...common, ...all.filter((z) => !common.includes(z))];

  return ordered.map((zone) => {
    const abbrev = zoneAbbrev(now, zone);
    const alt = zoneAbbrev(otherSeason, zone);
    const offset = zoneOffsetLabel(now, zone);
    return {
      zone,
      label: zone.replace(/_/g, ' '),
      abbrev,
      offset,
      search: `${zone} ${abbrev} ${alt} ${offset}`.toLowerCase().replace(/[_/]/g, ' '),
    };
  });
}

interface Option {
  value: string | null;
  label: string;
  abbrev: string;
  offset: string;
}

export function TimezoneSelect({
  value,
  onChange,
  deviceZone,
  allowAuto = false,
  compact = false,
  id,
}: {
  value: string | null;
  onChange: (zone: string | null) => void;
  deviceZone: string;
  allowAuto?: boolean;
  compact?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [catalog, setCatalog] = useState<ZoneEntry[] | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const options = useMemo<Option[]>(() => {
    if (!catalog) return [];
    const now = new Date();
    // Separators normalised so "new york", "america/new" and "new_york" all hit.
    const needle = query.trim().toLowerCase().replace(/[_/]/g, ' ');

    const list: Option[] = [];
    if (allowAuto) {
      const deviceHay = `device ${deviceZone} ${zoneAbbrev(now, deviceZone)}`
        .toLowerCase()
        .replace(/[_/]/g, ' ');
      if (needle === '' || deviceHay.includes(needle)) {
        list.push({
          value: null,
          label: `Device — ${shortZone(deviceZone)}`,
          abbrev: zoneAbbrev(now, deviceZone),
          offset: zoneOffsetLabel(now, deviceZone),
        });
      }
    }
    for (const entry of catalog) {
      if (list.length >= MAX_RESULTS) break;
      if (needle !== '' && !entry.search.includes(needle)) continue;
      list.push({
        value: entry.zone,
        label: entry.label,
        abbrev: entry.abbrev,
        offset: entry.offset,
      });
    }
    return list;
  }, [catalog, query, allowAuto, deviceZone]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();

    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Capture phase and stopped here, so Escape closes this popover rather
        // than the modal it may be sitting inside.
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  function toggle() {
    // Built here rather than at mount: an event handler is exactly where a
    // one-off cost belongs, and it is paid only by someone who opens the list.
    if (!catalog) setCatalog(buildCatalog());
    setOpen((o) => !o);
  }

  function choose(opt: Option) {
    onChange(opt.value);
    setOpen(false);
    setQuery('');
    triggerRef.current?.focus();
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = options[Math.min(active, options.length - 1)];
      if (opt) choose(opt);
    }
  }

  // Clamped rather than trusted: the list can shrink for reasons other than
  // typing, and Enter on a stale index would choose the wrong zone.
  const activeIndex = Math.min(active, Math.max(0, options.length - 1));

  const now = new Date();
  const shown = value ?? deviceZone;
  const triggerText = `${value === null ? 'Device' : shortZone(value)} · ${zoneAbbrev(now, shown)}`;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-lg border bg-[var(--surface-2)] text-left outline-none transition focus:border-[var(--primary)] ${
          compact ? 'max-w-[11rem] px-2 py-1 text-xs' : 'w-full px-3 py-2 text-sm'
        } ${
          value === null
            ? 'border-[var(--border)] text-[var(--muted)]'
            : 'border-[var(--primary)]/50 text-[var(--text)]'
        }`}
      >
        <span className="truncate">{triggerText}</span>
        <span aria-hidden className="ml-auto shrink-0 opacity-60">
          ⌄
        </span>
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-1 w-80 max-w-[85vw] overflow-hidden rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] shadow-2xl ${
            // Right-aligned in the top bar, where a left-aligned popover would
            // hang off the edge of the window.
            compact ? 'right-0' : 'left-0'
          }`}
        >
          <div className="border-b border-[var(--border)] p-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                // Reset here rather than in an effect on `query`: typing is the
                // event that invalidates the highlight, and syncing it through
                // a render pass is a cascading re-render the compiler rejects.
                setActive(0);
              }}
              onKeyDown={onInputKey}
              placeholder="Search city, EST, PST, +05:30…"
              aria-label="Search time zones"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-sm text-[var(--text)] placeholder-[var(--muted)] outline-none focus:border-[var(--primary)]"
            />
          </div>

          <ul role="listbox" className="max-h-72 overflow-y-auto py-1">
            {options.length === 0 && (
              <li className="px-3 py-4 text-center text-xs text-[var(--muted)]">
                No zone matches “{query}”.
              </li>
            )}
            {options.map((opt, i) => {
              const selected = opt.value === value;
              return (
                <li key={opt.value ?? '__auto'}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => choose(opt)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex w-full items-baseline gap-2 px-3 py-1.5 text-left text-sm transition ${
                      i === activeIndex ? 'bg-white/10' : ''
                    } ${selected ? 'text-[var(--primary)]' : 'text-[var(--text)]'}`}
                  >
                    <span className="truncate">{opt.label}</span>
                    <span className="ml-auto shrink-0 rounded bg-white/10 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                      {opt.abbrev}
                    </span>
                    <span className="shrink-0 text-[11px] tabular-nums text-[var(--muted)]">
                      {opt.offset}
                    </span>
                  </button>
                </li>
              );
            })}
            {options.length >= MAX_RESULTS && (
              // Said out loud rather than silently truncated: a list that stops
              // at 60 with no explanation reads as "your zone is not here".
              <li className="px-3 py-2 text-center text-[11px] text-[var(--muted)]">
                Showing the first {MAX_RESULTS} — keep typing to narrow it down.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

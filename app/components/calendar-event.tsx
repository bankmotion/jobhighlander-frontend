'use client';

import { timeInZone, zoneAbbrev } from '@/lib/tz';
import { dayKeyInZone } from '@/lib/calendar';
import {
  CLOSED_STATUSES,
  INTERVIEW_STATUS_LABELS,
  STEP_RESULT_LABELS,
  type CalendarPanel,
} from '@/lib/interviews';

export const isPast = (panel: CalendarPanel): boolean =>
  panel.stepResult === 'cancelled' || CLOSED_STATUSES.has(panel.interviewStatus);

export const eventColor = (panel: CalendarPanel): string => panel.stages[0]?.color ?? '#6c5cff';

export function eventLabel(panel: CalendarPanel): string {
  const at = new Date(panel.scheduledAt);
  return [
    panel.jobCompany ?? panel.jobTitle,
    panel.stages.map((s) => s.name).join(' + ') || null,
    panel.stepTitle,
    panel.profileName,
    panel.durationMin ? `${panel.durationMin} min` : null,
    panel.timezone ? `Quoted ${timeInZone(at, panel.timezone)} ${zoneAbbrev(at, panel.timezone)}` : null,
    panel.stepResult !== 'pending' ? STEP_RESULT_LABELS[panel.stepResult] : null,
    INTERVIEW_STATUS_LABELS[panel.interviewStatus],
  ]
    .filter(Boolean)
    .join(' · ');
}

export function EventButton({
  panel,
  onSelect,
  className,
  style,
  children,
}: {
  panel: CalendarPanel;
  onSelect: (panel: CalendarPanel) => void;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const title = eventLabel(panel);
  return (
    <button
      type="button"
      onClick={() => onSelect(panel)}
      title={panel.jobId ? title : `${title} · posting removed`}
      className={className}
      style={style}
    >
      {children}
    </button>
  );
}

export function EventChip({
  panel,
  zone,
  showProfile,
  onSelect,
}: {
  panel: CalendarPanel;
  zone: string;
  showProfile: boolean;
  onSelect: (panel: CalendarPanel) => void;
}) {
  const color = eventColor(panel);
  const dead = isPast(panel);

  return (
    <EventButton
      panel={panel}
      onSelect={onSelect}
      style={{ borderLeft: `2px solid ${color}` }}
      className={`block w-full rounded px-1 py-0.5 text-left text-[11px] leading-tight transition hover:bg-white/10 ${
        dead ? 'text-[var(--muted)]' : 'text-[var(--text)]'
      }`}
    >
      <span className="flex items-center gap-1">
        <span
          aria-hidden
          style={{ backgroundColor: color }}
          className="h-1.5 w-1.5 shrink-0 rounded-full"
        />
        <span className="shrink-0 font-semibold tabular-nums">
          {timeInZone(new Date(panel.scheduledAt), zone)}
        </span>
        <span className={`truncate ${dead ? 'line-through' : ''}`}>
          {panel.jobCompany ?? panel.jobTitle}
        </span>
      </span>
      {showProfile && (
        <span className="block truncate pl-2.5 text-[10px] opacity-70">{panel.profileName}</span>
      )}
    </EventButton>
  );
}

export function bucketByDay(
  panels: CalendarPanel[],
  zone: string,
): Map<string, CalendarPanel[]> {
  const out = new Map<string, CalendarPanel[]>();
  for (const p of panels) {
    const d = new Date(p.scheduledAt);
    if (Number.isNaN(d.getTime())) continue;
    const key = dayKeyInZone(d, zone);
    const list = out.get(key);
    if (list) list.push(p);
    else out.set(key, [p]);
  }
  // The API sorts by instant and bucketing preserves that within each day, so
  // no second sort is needed.
  return out;
}

export const hasManyProfiles = (panels: CalendarPanel[]): boolean =>
  new Set(panels.map((p) => p.profileId)).size > 1;
